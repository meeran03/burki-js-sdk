import { createBrowserCall, SessionRequestError, type BrowserSessionCallbacks, type SessionCredentials } from '@burki.dev/sdk/browser';

/** Call this from your app's start button. All routes authorize the app user and
 * use a server-persisted request, as shown in browser-server.ts.
 */
export async function startBrowserCall(options: {
  csrfToken: string;
  callbacks: BrowserSessionCallbacks;
}) {
  const csrfHeaders = { 'X-CSRF-Token': options.csrfToken };
  const response = await fetch('/voice/session', { method: 'POST', credentials: 'same-origin', headers: csrfHeaders });
  const handle = await response.json();
  if (!response.ok) throw new SessionRequestError(handle.message ?? 'Session setup failed', response.status);
  if (!handle.allowance?.eligible) throw new Error(handle.allowance?.blockers?.[0]?.message ?? 'Call allowance is unavailable');
  // Show this exact duration/reservation to the user and require their start
  // action. If the server changes sponsored purpose or consent, create a new
  // immutable handle and run preflight again before starting.
  const endpoint = `/voice/session/${encodeURIComponent(handle.request_id)}`;
  async function request<T>(action: 'start' | 'stop' | 'status'): Promise<T> {
    const result = await fetch(`${endpoint}/${action}`, {
      method: action === 'status' ? 'GET' : 'POST', credentials: 'same-origin',
      headers: action === 'status' ? {} : csrfHeaders, cache: 'no-store',
    });
    const body = await result.json();
    if (!result.ok) throw new SessionRequestError(body.message ?? 'Voice request failed', result.status);
    return body as T;
  }
  const call = createBrowserCall({
    input: { request_id: handle.request_id, assistant_id: handle.assistant_id },
    callbacks: options.callbacks,
    transport: {
      start: () => request<SessionCredentials>('start'),
      stop: () => request<unknown>('stop'),
      status: () => request<{ settled?: boolean }>('status'),
    },
  });
  await call.start();
  return call; // setMuted(), resumeAudio() and stop() belong to this call instance.
}
