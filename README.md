# Burki JavaScript SDK

The SDK includes Burki's LiveKit browser-call runtime and authenticated browser session APIs. Browser audio uses the same runtime as the Burki website: microphone permission before admission, agent readiness, mute, playback recovery, transcripts, and server cleanup with settlement confirmation.

Version **0.2.0** includes these browser APIs. The earlier **0.1.0** package does not.

```sh
npm install @burki.dev/sdk livekit-client
```

## Server API client

Keep the Burki API key on your server. The key authenticates its owning Burki user and organization; the browser endpoints also require a verified user or the backend's registered service-key identity. Your application must authorize each end user for the assistant it exposes.

```ts
import { BurkiClient } from '@burki.dev/sdk';

const burki = new BurkiClient({ apiKey: process.env.BURKI_API_KEY! });
const input = {
  requestId: crypto.randomUUID(), // Persist for this exact request and reuse after an uncertain response.
  assistantId: 42,               // Select on your server after checking the app user's access.
  maxDurationSeconds: 120,
  recordingConsent: false,
  variables: { preferredLanguage: 'Urdu', customerFirstName: 'Meeran' },
};

const allowance = await burki.browser.preflight(input);
if (!allowance.eligible) {
  // Present allowance.blockers[].message and the required action before starting.
}
```

Preflight is a read-only allowance/configuration check. It does not reserve funds or confirm that media can connect. Start repeats the admission checks, and can reject a previously eligible quote. `provider_cost_max_usd` is an exact decimal **string or null**, while reservation and wallet amounts are integer cents.

The request accepts camelCase and snake_case schema fields. Responses retain the API's snake_case fields. Mixing aliases for the same field is rejected. Variable names, workflow graph keys, custom settings, and tool JSON remain application data and retain their names.

Options include `flowId`, `flowDraft`, `draftConfig`, `maxDurationSeconds` (integer 1–300), `agenda`, `welcomeMessage`, `variables` (up to 100 scalar JSON values), `recordingConsent`, and `testPurpose` (`starter_demo` or `personalized_trial`). A workflow draft requires its owning flow. Recording also requires workspace permission, assistant saved-recording settings, policy approval and storage configuration; passing consent does not bypass those checks.

Preflight can recommend `test_purpose: "personalized_trial"`. Present that allowance and explicitly include the selected purpose in the final request. There is no automatic switch from a sponsored test to a paid call. Create and persist a new request UUID if settings change, then run preflight again.

Assistant create/update and `draftConfig` normalize known settings fields, including `voiceMode`, `liveSettings`, `systemPrompt`, `voiceId`, `modelId`, STT `providerConfig.prompt`, language settings, speed and volume. Provider and model strings remain open for newly supported models; the backend determines availability, ownership and billing readiness. Additional provider configuration is passed through, but that does not enable options absent from the backend's admission contract, including configurable GPT reasoning controls.

## Browser voice calls

Import the browser runtime separately so server code does not load media code:

```ts
import { createBrowserCall, SessionRequestError } from '@burki.dev/sdk/browser';

// Your server created this handle after authenticating this app user, selecting an
// allowed assistant and persisting an immutable request. It returns no API key.
const handle = await fetch('/voice/session', { method: 'POST' }).then(r => r.json());
const endpoint = `/voice/session/${encodeURIComponent(handle.request_id)}`;

async function request(action: 'start' | 'stop' | 'status') {
  const response = await fetch(`${endpoint}/${action}`, {
    method: action === 'status' ? 'GET' : 'POST',
    credentials: 'same-origin',
    // Add your application's CSRF header to POSTs where required.
  });
  const data = await response.json();
  if (!response.ok) throw new SessionRequestError(data.message ?? 'Voice request failed', response.status);
  return data;
}

const call = createBrowserCall({
  input: { request_id: handle.request_id, assistant_id: handle.assistant_id },
  transport: {
    start: () => request('start'),
    stop: () => request('stop'),
    status: () => request('status'),
  },
  callbacks: {
    progress: stage => updateProgress(stage),
    ready: () => setReady(true),
    transcript: (id, speaker, text, final) => upsertTranscript({ id, speaker, text, final }),
    playbackBlocked: blocked => showResumeAudio(blocked),
    warning: message => showWarning(message),
    error: (message, failure) => showError(message, failure),
    ended: settled => showEnded({ cleanupConfirmed: settled }),
  },
});

// Invoke from a user click, with the application's CSRF/session protection in place.
await call.start();
await call.setMuted(true);
await call.resumeAudio(); // Invoke from a user click if playback is blocked.
const settled = await call.stop();
```

`ready` means that media is connected, the microphone was published and the agent reported a listening/thinking/speaking state. A successful REST start alone is not call readiness. Transcripts arrive through LiveKit text streams; update segments by their IDs and keep the final flag. The legacy transcript WebSocket client remains separate from this browser runtime.

`stop()` stops local media and requests server teardown. It returns whether settlement was confirmed. `false` means cleanup/billing still needs confirmation; it does not mean the call can keep using the microphone. A page unload cannot guarantee a final server response; your server should keep the persisted handle available for subsequent status/stop reconciliation.

The runtime does not automatically retry admission. An uncertain start response still triggers cleanup of that exact request ID. Preserve HTTP status codes with the exported `SessionRequestError` in a custom transport. Reuse one immutable ID when deliberately retrying an uncertain request, and never generate another request as an automatic error fallback.

For authenticated direct requests, `burki.browser.transport(input)` supplies the same request-bound start/stop/status interface. Use it on your server or with an already authorized session transport; never construct an API-key client in a public frontend bundle.

The browser factory also accepts a `builder` or `public_demo` input with a custom transport for the corresponding authenticated/capability routes. Builder start returns the native `{ session, ...snapshot }` response; public-demo transport must preserve its server-issued capability and request binding. The SDK does not grant public access to an organization's assistants.

See [the server route example](examples/browser-server.ts) for assistant ownership and immutable request binding, and [the browser controller](examples/browser-client.ts) for an integration without long-lived keys.

## Status and review

```ts
const status = await burki.browser.status(callSid);
await burki.browser.stop(callSid);
const review = await burki.browser.getReview(callId);
```

`callSid` is the `browser_call_LK…` identifier returned by start. `callId` is the numeric database ID from call history. They are different identifiers. A status response can release resources while billing still requires review; check `settled` rather than assuming `resources_released` means funds have settled. Call review includes transcripts, workflow activity, tool outcomes, visible cost and wallet funding, subject to tenant and data-policy checks.

## Build and test

```sh
npm install
npm run build
npm test
```

Tests use deterministic transports and mocked media. They cover request normalization, HTTP failures, microphone and playback errors, cancellation during admission, agent readiness, transcripts, mute and cleanup. They do not place provider calls or prove live browser/telephone acceptance.
