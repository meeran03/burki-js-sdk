import { BurkiAuth, BurkiClient as LegacyBurkiClient, type BurkiClientOptions } from "./legacy.js";
import { BrowserCallsResource } from "./browser-resource";
import { SessionRequestError } from "./browser/session-error";

/** API operations use a server-held Burki key. Browser media has its own entry. */
export class BurkiClient extends LegacyBurkiClient {
  private readonly browserCalls: BrowserCallsResource;

  constructor(options: BurkiClientOptions) {
    super(options);
    const auth = new BurkiAuth(options.apiKey);
    const baseUrl = (options.baseUrl || "https://api.burki.dev").replace(/\/$/, "");
    const timeout = options.timeout || 30000;
    this.browserCalls = new BrowserCallsResource(async (method, path, body) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: auth.headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(timeout),
      });
      const data: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof data === "object" && data !== null && "detail" in data ? data.detail : undefined;
        throw new SessionRequestError(
          typeof detail === "string" ? detail : "The voice session request failed.",
          response.status,
        );
      }
      return data;
    });
  }

  get browser(): BrowserCallsResource { return this.browserCalls; }
}
