import type { BrowserSessionApi, SessionCredentials } from './browser/index';
import { serializeAssistantInput } from './serialization';

/** The authenticated SDK transport. Responses retain the API's snake_case fields. */
export type BrowserSdkRequest = (method: 'GET' | 'POST', path: string, body?: unknown) => Promise<unknown>;
export type BrowserVariable = string | number | boolean | null;
type RequestIdentity = { request_id: string; requestId?: string } | { requestId: string; request_id?: string };
type AssistantIdentity = { assistant_id: number; assistantId?: number } | { assistantId: number; assistant_id?: number };
export type BrowserCallRequest = RequestIdentity & AssistantIdentity & {
  kind?: 'assistant';
  flow_id?: number | null; flowId?: number | null;
  flow_draft?: Record<string, unknown> | null; flowDraft?: Record<string, unknown> | null;
  max_duration_seconds?: number | null; maxDurationSeconds?: number | null;
  agenda?: string | null;
  welcome_message?: string | null; welcomeMessage?: string | null;
  variables?: Record<string, BrowserVariable>;
  draft_config?: Record<string, unknown> | null; draftConfig?: Record<string, unknown> | null;
  recording_consent?: boolean; recordingConsent?: boolean;
  test_purpose?: 'starter_demo' | 'personalized_trial' | null;
  testPurpose?: 'starter_demo' | 'personalized_trial' | null;
};

export type BrowserSessionCredentials = SessionCredentials & { expires_in_seconds: number };
export type BrowserPreflight = {
  eligible: boolean;
  /** Funded calls can bill verified provider usage without a money reservation. */
  billing_basis?: 'actual_usage' | 'reserved';
  /** True after the backend has verified the exact provider rate and credentials. */
  pricing_verified?: boolean;
  blockers: Array<{ code: string; message: string; action: string }>;
  max_duration_seconds: number | null;
  reservation_cents: number | null;
  /** Decimal string from the API; converting to a number can lose precision. */
  provider_cost_max_usd: string | null;
  currency: string;
  billing_source: string;
  remaining_trial_seconds: number | null;
  external_costs_unknown: boolean;
  restrictions: string[];
  configuration_fingerprint: string;
  test_purpose: 'starter_demo' | 'personalized_trial' | null;
  telephone_status?: 'not_connected' | 'verification_required';
  telephone_action?: 'connect_phone' | 'verify_phone';
  capabilities: { browser_test: boolean; phone_connected: boolean; telephone_ready: boolean; recording: boolean; flow: boolean; transfer: boolean };
};
export type BrowserSessionStatus = {
  status: 'active' | 'stopping' | 'completed' | 'review_required';
  settled: boolean;
  review_required: boolean;
  reason: string | null;
  resources_released?: boolean;
};
export type BrowserCallReview = {
  call_id: number;
  status: string;
  duration_seconds: number | null;
  transcript: Array<{ id: number; speaker: string; content: string; created_at: string | null }>;
  transcript_truncated: boolean;
  flow: null | { flow_id: number | null; version: unknown; is_draft: boolean; graph_hash: string | null; current_node: string | null; transitions: Array<{ from_node: string | null; to_node: string | null; at: string | null }>; transitions_truncated: boolean; variables: Record<string, BrowserVariable>; variables_source: 'declared_runtime_state' };
  operation_status: 'running' | 'completed' | 'review_required' | null;
  activity: Array<{ kind: 'tool_execution'; status: string; at: string | null; message: string | null }>;
  activity_truncated: boolean;
  tool_results: Array<{ id: number; name: string | null; provider: string; execution_status: string; business_status: string | null; simulated: boolean | null; at: string | null; message: string | null; provider_record_id?: string | null }>;
  tool_results_truncated: boolean;
  recorded_cost: number | null;
  currency: string;
  provider_cost_complete: boolean;
  outcome_status: 'not_evaluated';
  callback_request: null | { status: string; revision: number; confirmed_number: string | null; action_taken: false };
  funding: { original_reservation_cents?: number; reserved_cents: number | null; released_cents: number | null; charged_cents: number; hold_status: 'active' | 'released' | 'unknown'; source?: 'wallet_ledger' };
};

const ALIASES: Record<string, string> = {
  requestId: 'request_id', assistantId: 'assistant_id', flowId: 'flow_id', flowDraft: 'flow_draft',
  maxDurationSeconds: 'max_duration_seconds', welcomeMessage: 'welcome_message', draftConfig: 'draft_config',
  recordingConsent: 'recording_consent', testPurpose: 'test_purpose',
};
const FIELDS = new Set(['request_id', 'assistant_id', 'flow_id', 'flow_draft', 'max_duration_seconds', 'agenda', 'welcome_message', 'variables', 'draft_config', 'recording_consent', 'test_purpose']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Normalize schema fields only. Workflow graphs and variable names are application data. */
export function serializeBrowserCallRequest(input: BrowserCallRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (key === 'kind' && value === 'assistant') continue;
    const field = ALIASES[key] ?? key;
    if (!FIELDS.has(field)) throw new TypeError(`Unsupported browser session option: ${key}`);
    if (Object.prototype.hasOwnProperty.call(body, field)) throw new TypeError(`Duplicate browser session option: ${field}`);
    body[field] = value;
  }
  if (typeof body.request_id !== 'string' || !UUID.test(body.request_id)) throw new TypeError('requestId must be a UUID reused for this exact session.');
  if (!Number.isSafeInteger(body.assistant_id) || (body.assistant_id as number) <= 0) throw new TypeError('assistantId must be a positive integer.');
  if (body.flow_id != null && (!Number.isSafeInteger(body.flow_id) || (body.flow_id as number) <= 0)) throw new TypeError('flowId must be a positive integer.');
  if (body.flow_draft != null && body.flow_id == null) throw new TypeError('A draft workflow requires flowId.');
  if (body.max_duration_seconds != null && (!Number.isInteger(body.max_duration_seconds) || (body.max_duration_seconds as number) < 1 || (body.max_duration_seconds as number) > 300)) throw new TypeError('maxDurationSeconds must be an integer from 1 to 300.');
  if (body.recording_consent !== undefined && typeof body.recording_consent !== 'boolean') throw new TypeError('recordingConsent must be a boolean.');
  if (body.test_purpose != null && !['starter_demo', 'personalized_trial'].includes(body.test_purpose as string)) throw new TypeError('Unsupported testPurpose.');
  for (const [field, limit] of [['agenda', 20_000], ['welcome_message', 5_000]] as const) {
    if (body[field] != null && (typeof body[field] !== 'string' || Array.from(body[field] as string).length > limit)) throw new TypeError(`${field} must be a string of at most ${limit} characters.`);
  }
  if (body.variables !== undefined) {
    const variables = body.variables;
    if (!variables || typeof variables !== 'object' || Array.isArray(variables) || Object.keys(variables).length > 100 || Object.values(variables).some(value => value !== null && !['string', 'number', 'boolean'].includes(typeof value) || typeof value === 'number' && !Number.isFinite(value))) throw new TypeError('variables must contain at most 100 finite JSON primitives.');
  }
  for (const field of ['draft_config', 'flow_draft']) {
    if (body[field] != null && (typeof body[field] !== 'object' || Array.isArray(body[field]))) throw new TypeError(`${field} must be an object.`);
  }
  if (body.draft_config != null) body.draft_config = serializeAssistantInput(body.draft_config as Record<string, unknown>);
  // Detach nested values now, so later edits cannot reuse the UUID with different settings.
  return JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
}

function sessionPath(callSid: string): string {
  if (!/^browser_call_LK[0-9a-f]{32}$/i.test(callSid)) throw new TypeError('Expected a browser call SID.');
  return `/api/v1/livekit/browser-sessions/${encodeURIComponent(callSid)}`;
}

/** Server-side browser admission and lifecycle APIs. No automatic start retries or funding fallback. */
export class BrowserCallsResource {
  constructor(private readonly request: BrowserSdkRequest) {}

  preflight(input: BrowserCallRequest): Promise<BrowserPreflight> {
    return this.request('POST', '/api/v1/livekit/browser-preflight', serializeBrowserCallRequest(input)) as Promise<BrowserPreflight>;
  }
  start(input: BrowserCallRequest): Promise<BrowserSessionCredentials> {
    return this.request('POST', '/api/v1/livekit/browser-sessions', serializeBrowserCallRequest(input)) as Promise<BrowserSessionCredentials>;
  }
  stop(callSid: string): Promise<BrowserSessionStatus> {
    return this.request('POST', `${sessionPath(callSid)}/stop`) as Promise<BrowserSessionStatus>;
  }
  status(callSid: string): Promise<BrowserSessionStatus> {
    return this.request('GET', sessionPath(callSid)) as Promise<BrowserSessionStatus>;
  }
  /** Review uses the database call ID from call history, not the browser call SID. */
  getReview(callId: number): Promise<BrowserCallReview> {
    if (!Number.isSafeInteger(callId) || callId <= 0) throw new TypeError('callId must be a positive integer from call history.');
    return this.request('GET', `/api/v1/calls/${callId}/review`) as Promise<BrowserCallReview>;
  }
  /** Use only when the request transport is already authenticated for this browser user. */
  transport(input: BrowserCallRequest): BrowserSessionApi {
    const body = serializeBrowserCallRequest(input);
    const callSid = `browser_call_LK${(body.request_id as string).replaceAll('-', '').toLowerCase()}`;
    return {
      start: () => this.request('POST', '/api/v1/livekit/browser-sessions', structuredClone(body)) as Promise<BrowserSessionCredentials>,
      stop: () => this.stop(callSid),
      status: () => this.status(callSid),
    };
  }
}
