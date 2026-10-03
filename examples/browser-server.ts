/** Framework-neutral server controller. Store grants durably; map each method to
 * an authenticated app route with CSRF protection for POSTs. Never expose this
 * controller through an unrestricted Burki endpoint/body proxy.
 */
import { BurkiClient, type BrowserCallRequest } from '@burki.dev/sdk';

type AppUser = { id: string };
type Grant = { ownerId: string; input: BrowserCallRequest & { request_id: string; assistant_id: number } };
type Dependencies = {
  // Verifies the actual application session, not a user ID supplied in JSON.
  requireUser: (request: Request) => Promise<AppUser>;
  requireCsrf: (request: Request) => Promise<void>;
  // Resolves an allowed assistant from app-owned policy/data for this user.
  assistantForUser: (user: AppUser) => Promise<number>;
  grants: { create: (grant: Grant) => Promise<void>; get: (requestId: string) => Promise<Grant | null> };
};

export function browserRoutes(burki: BurkiClient, dependencies: Dependencies) {
  async function ownedGrant(request: Request, requestId: string): Promise<Grant> {
    const user = await dependencies.requireUser(request);
    const grant = await dependencies.grants.get(requestId);
    if (!grant || grant.ownerId !== user.id) throw new Error('Voice session not found');
    // Membership can change after grant creation. Recheck current policy.
    if (await dependencies.assistantForUser(user) !== grant.input.assistant_id) throw new Error('Voice access denied');
    return grant;
  }
  const callSid = (grant: Grant) => `browser_call_LK${grant.input.request_id.replaceAll('-', '')}`;
  return {
    async create(request: Request) {
      const user = await dependencies.requireUser(request);
      await dependencies.requireCsrf(request);
      const assistant_id = await dependencies.assistantForUser(user);
      const grant: Grant = {
        ownerId: user.id,
        input: { request_id: crypto.randomUUID(), assistant_id, max_duration_seconds: 120, recording_consent: false },
      };
      await dependencies.grants.create(grant);
      return { request_id: grant.input.request_id, assistant_id, allowance: await burki.browser.preflight(grant.input) };
    },
    async preflight(request: Request, requestId: string) {
      await dependencies.requireCsrf(request);
      return burki.browser.preflight((await ownedGrant(request, requestId)).input);
    },
    async start(request: Request, requestId: string) {
      await dependencies.requireCsrf(request);
      // No client-supplied assistant, purpose, variables or request identity is forwarded.
      return burki.browser.start((await ownedGrant(request, requestId)).input);
    },
    async stop(request: Request, requestId: string) {
      await dependencies.requireCsrf(request);
      return burki.browser.stop(callSid(await ownedGrant(request, requestId)));
    },
    async status(request: Request, requestId: string) {
      return burki.browser.status(callSid(await ownedGrant(request, requestId)));
    },
  };
}

// Instantiate the SDK only on the server with a key owned by the intended Burki
// organization. Map Burki HTTP errors to the same status, include no credentials
// in logs, and mark all session responses Cache-Control: no-store.
