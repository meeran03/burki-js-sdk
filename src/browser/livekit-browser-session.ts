import { SessionRequestError } from "./session-error";
export { SessionRequestError } from "./session-error";
import type { BuilderSnapshot } from "./builder-config";
import { createLocalAudioTrack, Room, RoomEvent, Track, type LocalAudioTrack, type Participant } from "livekit-client";

export type BrowserSessionInput = {
  kind?: "assistant";
  request_id: string;
  assistant_id: number;
  flow_id?: number | null;
  recording_consent?: boolean;
  test_purpose?: "starter_demo" | "personalized_trial" | null;
  max_duration_seconds?: number | null;
  flow_draft?: Record<string, unknown> | null;
  draft_config?: Record<string, unknown> | null;
  agenda?: string | null;
  welcome_message?: string | null;
  variables?: Record<string, string | number | boolean | null>;
};

export type BuilderSessionInput = { kind: "builder"; request_id: string };
export type PublicDemoSessionInput = { kind: "public_demo"; request_id: string };

export type SessionCredentials = {
  call_sid: string;
  room_name: string;
  participant_identity: string;
  participant_token: string;
  livekit_url: string;
};

export type BuilderSessionCredentials = BuilderSnapshot & { session: SessionCredentials };

/** Request-bound capability transport. Does not read or replace account auth. */
export type BrowserSessionApi = {
  start: () => Promise<SessionCredentials | BuilderSessionCredentials>;
  stop: () => Promise<unknown>;
  status: () => Promise<{ settled?: boolean }>;
};

export type BrowserSessionStage = "microphone_requested" | "microphone_granted" | "admission_requested" | "admission_accepted" | "media_connected" | "agent_ready";

export type BrowserSessionCallbacks = {
  progress?: (stage: BrowserSessionStage) => void;
  ready: () => void;
  admitting?: () => void;
  transcript: (id: string, speaker: "user" | "assistant", text: string, final?: boolean) => void;
  ended: (settled: boolean) => void;
  error: (message: string, failure?: BrowserSessionFailure) => void;
  playbackBlocked?: (blocked: boolean) => void;
  warning?: (message: string) => void;
  builderSnapshot?: (snapshot: BuilderSnapshot) => void;
  builderUpdated?: () => void;
  speaking?: (speaking: boolean) => void;
};

export type BrowserSessionFailure = {
  stage: "microphone" | "playback" | "admission" | "media_connection" | "agent_ready";
  reason: string;
  http_status?: number;
};

function classifyFailure(error: unknown, stage: BrowserSessionFailure["stage"]): BrowserSessionFailure {
  if (error instanceof SessionRequestError) {
    const reasons: Record<number, string> = {401: "authentication_required", 402: "prepaid_balance_required", 403: "access_denied", 404: "assistant_not_found", 409: "session_conflict", 422: "configuration_rejected", 429: "capacity_or_trial_limit"};
    return { stage: "admission", reason: reasons[error.status] || "service_unavailable", http_status: error.status };
  }
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  if (stage === "media_connection" && error instanceof Error && /createOffer|transceiver|m-line|SDP|negotiation/i.test(error.message)) {
    return { stage, reason: "webrtc_negotiation_failed" };
  }
  if (stage === "microphone") {
    return { stage, reason: name === "NotAllowedError" ? "microphone_permission_denied" : name === "NotFoundError" ? "microphone_not_found" : "microphone_unavailable" };
  }
  return { stage, reason: name === "TimeoutError" ? "request_timeout" : stage === "admission" ? "admission_connection_failed" : "connection_failed" };
}


/** One owner for the microphone, room, and authenticated server shutdown. */
export class LiveKitBrowserSession {
  // Keep microphone publishing on its own connection. The SDK's V1 single-PC
  // path preallocates receive-only media sections before joining, then
  // renegotiates that layout when publishing. Use the supported dual-PC path
  // to avoid those extra sections while investigating the reported Chromium
  // transceiver/m-line negotiation failure.
  private readonly room = new Room({ adaptiveStream: true, dynacast: true, singlePeerConnection: false });
  private readonly audioElements = new Set<HTMLMediaElement>();
  private readonly abortReads = new AbortController();
  private microphone: LocalAudioTrack | null = null;
  private bootstrap: Promise<SessionCredentials> | null = null;
  private stopping: Promise<boolean> | null = null;
  private starting: Promise<void> | null = null;
  private stopped = false;
  private admissionRejected = false;
  private ready = false;
  private microphonePublished = false;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private callSid: string;
  private builderId: string | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
    private readonly input: BrowserSessionInput | BuilderSessionInput | PublicDemoSessionInput,
    private readonly callbacks: BrowserSessionCallbacks,
    private readonly sessionApi?: BrowserSessionApi,
  ) {
    // Snapshot the JSON request before any async permission prompt. Caller
    // edits must never change the admitted identity or its shutdown target.
    this.input = JSON.parse(JSON.stringify(input));
    if (this.input.kind === "public_demo" && !sessionApi) throw new Error("Public demo transport is required.");
    this.callSid = `browser_call_LK${this.input.request_id.replaceAll("-", "").toLowerCase()}`;
  }

  private async request(path: string, method: "GET" | "POST", body?: unknown) {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/v1/livekit${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new SessionRequestError(typeof data.detail === "string" ? data.detail : "The voice session is temporarily unavailable.", response.status);
    }
    return data;
  }

  private checkReady = (participant: Participant) => {
    if (this.stopped || !this.microphonePublished || !participant.isAgent) return;
    this.callbacks.speaking?.(participant.attributes["lk.agent.state"] === "speaking");
    if (this.ready) return;
    if (!["listening", "thinking", "speaking"].includes(participant.attributes["lk.agent.state"])) return;
    this.ready = true;
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
    this.callbacks.progress?.("agent_ready");
    this.callbacks.ready();
  };

  /** Repeated starts observe the same attempt and can never admit a second paid call. */
  start(): Promise<void> {
    if (this.starting) return this.starting;
    if (this.stopped) return Promise.resolve();
    this.starting = this.runStart();
    return this.starting;
  }

  private async runStart(): Promise<void> {
    this.room.on(RoomEvent.TrackSubscribed, (track) => {
      if (this.stopped || track.kind !== Track.Kind.Audio) return;
      const element = track.attach();
      element.style.display = "none";
      document.body.appendChild(element);
      this.audioElements.add(element);
    });
    this.room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((element) => { element.remove(); this.audioElements.delete(element); });
    });
    this.room.on(RoomEvent.AudioPlaybackStatusChanged, (playing) => {
      if (!this.stopped) this.callbacks.playbackBlocked?.(!playing);
    });
    this.room.on(RoomEvent.ParticipantConnected, this.checkReady);
    this.room.on(RoomEvent.ParticipantAttributesChanged, (_, participant) => this.checkReady(participant));
    this.room.on(RoomEvent.Reconnected, () => { if (!this.stopped && this.builderId) this.callbacks.builderUpdated?.(); });
    this.room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
      if (this.stopped || !this.builderId || !participant?.isAgent || topic !== "burki.builder.updated" || payload.byteLength > 2048) return;
      try {
        const hint = JSON.parse(new TextDecoder().decode(payload));
        if (hint.builder_session_id === this.builderId && Number.isInteger(hint.revision)) this.callbacks.builderUpdated?.();
      } catch { /* Untrusted hints never replace the authoritative draft. */ }
    });
    this.room.on(RoomEvent.Disconnected, () => {
      if (!this.stopped) {
        try {
          if (!this.ready) this.callbacks.error("The assistant disconnected before the test was ready.", { stage: "agent_ready", reason: "agent_disconnected" });
        } finally { void this.stop(); }
      }
    });
    this.room.registerTextStreamHandler("lk.transcription", (reader, participant) => {
      void (async () => {
        let text = "";
        try {
          for await (const chunk of reader.withAbortSignal(this.abortReads.signal)) {
            if (this.stopped) return;
            text += chunk;
            if (text.length > 100000) throw new Error("Transcript exceeded the session limit.");
            const segment = reader.info.attributes?.["lk.segment_id"] || reader.info.id;
            this.callbacks.transcript(`${participant.identity}:${segment}`,
              participant.identity === this.room.localParticipant.identity ? "user" : "assistant", text);
          }
          if (!this.stopped && text.trim() && reader.info.attributes?.["lk.transcription_final"] === "true") {
            const segment = reader.info.attributes?.["lk.segment_id"] || reader.info.id;
            this.callbacks.transcript(`${participant.identity}:${segment}`,
              participant.identity === this.room.localParticipant.identity ? "user" : "assistant", text, true);
          }
        } catch {
          if (!this.stopped) this.callbacks.warning?.("The live transcript was interrupted. You can continue speaking or end the test.");
        }
      })();
    });
    let stage: BrowserSessionFailure["stage"] = "microphone";
    try {
      // Ask for microphone permission before creating any paid server work.
      // Observe a rejection immediately while the permission dialog may remain
      // open; never leave an unhandled promise rejection behind that dialog.
      const audio = this.room.startAudio().then(() => ({ ok: true as const }), (error: unknown) => ({ ok: false as const, error }));
      this.callbacks.progress?.("microphone_requested");
      this.microphone = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      // Cancellation can finish while permission or playback is still pending.
      if (this.stopped) { this.microphone.stop(); return; }
      this.callbacks.progress?.("microphone_granted");
      stage = "playback";
      const audioResult = await audio;
      if (!audioResult.ok) throw audioResult.error;
      if (this.stopped) { this.microphone.stop(); return; }
      this.callbacks.admitting?.();
      if (this.stopped) return;
      stage = "admission";
      this.callbacks.progress?.("admission_requested");
      if (this.stopped) return;
      const builder = this.input.kind === "builder";
      const request = { ...this.input };
      delete request.kind;
      this.bootstrap = (this.sessionApi ? this.sessionApi.start() : this.request(builder ? "/builder-sessions" : "/browser-sessions", "POST", request)).then((result) => {
        if (!builder) return result as SessionCredentials;
        const builderResult = result as BuilderSessionCredentials;
        if (typeof builderResult.builder_session_id !== "string" || !Number.isInteger(builderResult.revision) || !builderResult.draft || !builderResult.session) throw new Error("The server returned an invalid builder session.");
        this.builderId = builderResult.builder_session_id;
        // The durable draft remains available even if the user cancelled during bootstrap.
        const { session, ...snapshot } = builderResult;
        this.callbacks.builderSnapshot?.(snapshot);
        return session;
      }).catch((error) => {
        // These route responses occur before admission commits. A timeout/503
        // or a duplicate in progress has an uncertain outcome and still stops.
        // Public capabilities support stop-before-start tombstones. Always
        // stop their exact request, even if an outer proxy rewrites the error.
        if (!this.sessionApi && error instanceof SessionRequestError && [400, 401, 402, 403, 404, 413, 422, 429].includes(error.status)) {
          this.admissionRejected = true;
        }
        throw error;
      });
      const session = await this.bootstrap;
      if (session.call_sid !== this.callSid) throw new Error("The server returned an unexpected voice session.");
      if (this.stopped) return; // finish() owns the authenticated stop after bootstrap.
      this.callbacks.progress?.("admission_accepted");
      stage = "media_connection";
      this.timeout = setTimeout(() => {
        try {
          this.callbacks.error("The assistant did not become ready. The test is closing.", { stage: "agent_ready", reason: "agent_ready_timeout" });
        } finally { void this.stop(); }
      }, 30000);
      await this.room.connect(session.livekit_url, session.participant_token);
      if (this.stopped) { await this.room.disconnect(); return; }
      this.callbacks.progress?.("media_connected");
      await this.room.localParticipant.publishTrack(this.microphone);
      this.microphonePublished = true;
      this.room.remoteParticipants.forEach(this.checkReady);
    } catch (error) {
      if (!this.stopped) {
        const failure = classifyFailure(error, stage);
        const message = failure.reason === "microphone_permission_denied"
          ? "Microphone access was blocked. Allow it in your browser’s site settings, then try again. No call was started."
          : failure.reason === "microphone_not_found"
            ? "No microphone was found. Connect one, then try again. No call was started."
            : failure.stage === "media_connection"
              ? "The voice connection could not start. Please try again. If it keeps happening, reload this page or try another browser."
            : error instanceof Error ? error.message : "The test could not start.";
        // Consumer callbacks may throw; local and server cleanup still own
        // this exact admitted attempt before the callback failure propagates.
        try { this.callbacks.error(message, failure); }
        finally { await this.stop(); }
      }
    }
  }

  async resumeAudio(): Promise<void> {
    if (this.stopped) return;
    await this.room.startAudio();
    this.callbacks.playbackBlocked?.(false);
  }

  async setMuted(muted: boolean): Promise<void> {
    if (!this.microphone || this.stopped) return;
    if (muted) await this.microphone.mute();
    else await this.microphone.unmute();
  }

  stop(): Promise<boolean> {
    if (this.stopping) return this.stopping;
    this.stopped = true;
    if (this.timeout) clearTimeout(this.timeout);
    this.abortReads.abort();
    this.microphone?.stop();
    this.audioElements.forEach((element) => { element.pause(); element.remove(); });
    this.audioElements.clear();
    this.stopping = this.finish();
    return this.stopping;
  }

  private async finish(): Promise<boolean> {
    // Local transport teardown must not prevent the authenticated server stop.
    let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      this.room.disconnect().catch(() => {}),
      new Promise<void>((resolve) => { disconnectTimer = setTimeout(resolve, 5000); }),
    ]);
    if (disconnectTimer) clearTimeout(disconnectTimer);
    if (!this.bootstrap) { this.callbacks.ended(true); return true; }
    // A lost bootstrap acknowledgement can still have created a room. The
    // client-generated identity lets shutdown address that exact request.
    await this.bootstrap.catch(() => {});
    if (this.admissionRejected) { this.callbacks.ended(true); return true; }
    let settled = false;
    const deadline = Date.now() + 90000;
    try {
      if (this.sessionApi) await this.sessionApi.stop();
      else await this.request(`/browser-sessions/${this.callSid}/stop`, "POST");
      while (Date.now() < deadline) {
        const status = this.sessionApi ? await this.sessionApi.status() : await this.request(`/browser-sessions/${this.callSid}`, "GET");
        if (status.settled === true) { settled = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch { /* A server-side admission remains held until verified cleanup. */ }
    this.callbacks.ended(settled);
    return settled;
  }
}

/** Browser-only call factory. Transport owns authorization on the caller's server. */
export function createBrowserCall(options: {
  input: BrowserSessionInput | BuilderSessionInput | PublicDemoSessionInput;
  callbacks: BrowserSessionCallbacks;
  transport: BrowserSessionApi;
}): LiveKitBrowserSession {
  return new LiveKitBrowserSession("", "", options.input, options.callbacks, options.transport);
}
