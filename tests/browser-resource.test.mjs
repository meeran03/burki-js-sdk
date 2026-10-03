import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserCallsResource, serializeBrowserCallRequest } from '../dist/index.mjs';

const requestId = '7ed84b08-7601-4af4-b08f-31b394cde130';
const callSid = `browser_call_LK${requestId.replaceAll('-', '')}`;
const snake = { request_id: requestId, assistant_id: 499, max_duration_seconds: 120, recording_consent: false };

test('normalizes browser schema without changing workflow, tool or variable JSON names', async () => {
  const calls = [];
  const resource = new BrowserCallsResource(async (...args) => { calls.push(args); return { eligible: true, provider_cost_max_usd: '0.00750000001' }; });
  const quote = await resource.preflight({ requestId, assistantId: 499, flowId: 9, maxDurationSeconds: 120, recordingConsent: true,
    agenda: 'Personal AI assistant', welcomeMessage: 'السلام علیکم', testPurpose: 'personalized_trial',
    variables: { customerFirstName: 'Meeran', attemptCount: 2, isReturning: true, optionalField: null },
    flowDraft: { nodes: { startNode: { type: 'extract_dynamic_variable', customerFirstName: 'opaque' } } },
    draftConfig: { voiceMode: 'cascade', llmSettings: { model: 'gpt-6.1-sol', systemPrompt: 'English and Urdu' },
      ttsSettings: { voiceId: 'own-voice', modelId: 'eleven_v4_turbo', providerConfig: { language: 'auto' } },
      sttSettings: { provider: 'assemblyai', model: 'universal-3-6-pro', language: 'multi', providerConfig: { prompt: 'Startup conversations' } },
      customSettings: { camelCaseApplicationKey: true }, toolIds: [1, 2] },
  });
  const [method, path, body] = calls[0];
  assert.equal(method, 'POST'); assert.equal(path, '/api/v1/livekit/browser-preflight');
  assert.equal(body.request_id, requestId); assert.equal(body.assistant_id, 499);
  assert.equal(body.recording_consent, true); assert.equal(body.max_duration_seconds, 120);
  assert.equal(body.welcome_message, 'السلام علیکم'); assert.equal(body.test_purpose, 'personalized_trial');
  assert.deepEqual(body.variables, { customerFirstName: 'Meeran', attemptCount: 2, isReturning: true, optionalField: null });
  assert.equal(body.flow_draft.nodes.startNode.customerFirstName, 'opaque');
  assert.equal(body.draft_config.tts_settings.voice_id, 'own-voice');
  assert.equal(body.draft_config.tts_settings.model_id, 'eleven_v4_turbo');
  assert.equal(body.draft_config.stt_settings.provider_config.prompt, 'Startup conversations');
  assert.deepEqual(body.draft_config.custom_settings, { camelCaseApplicationKey: true });
  assert.equal(quote.provider_cost_max_usd, '0.00750000001');
});

test('serializes snake_case requests identically and rejects conflicting aliases', () => {
  assert.deepEqual(serializeBrowserCallRequest(snake), snake);
  assert.throws(() => serializeBrowserCallRequest({ ...snake, requestId }), /Duplicate/);
  assert.throws(() => serializeBrowserCallRequest({ requestId, assistantId: 499, kind: 'builder' }), /Unsupported/);
});

test('request-bound transport keeps original UUID and options even after edits and retry', async () => {
  const calls = [];
  const resource = new BrowserCallsResource(async (...args) => { calls.push(args); return {}; });
  const input = { requestId, assistantId: 499, draftConfig: { llmSettings: { systemPrompt: 'Original' } } };
  const transport = resource.transport(input);
  input.requestId = '38ca26de-3f1b-48c0-a2e8-70c34176ee7c';
  input.draftConfig.llmSettings.systemPrompt = 'Changed';
  await transport.start();
  calls[0][2].draft_config.llm_settings.system_prompt = 'Also changed';
  await transport.start(); await transport.stop(); await transport.status();
  assert.equal(calls[1][2].request_id, requestId);
  assert.equal(calls[1][2].draft_config.llm_settings.system_prompt, 'Original');
  assert.deepEqual(calls[2], ['POST', `/api/v1/livekit/browser-sessions/${callSid}/stop`]);
  assert.deepEqual(calls[3], ['GET', `/api/v1/livekit/browser-sessions/${callSid}`]);
});

test('failed admission is surfaced once with original status and no paid fallback', async () => {
  const failure = Object.assign(new Error('Sponsored allowance exhausted'), { status: 402 });
  let attempts = 0;
  const resource = new BrowserCallsResource(async () => { attempts++; throw failure; });
  await assert.rejects(resource.start({ ...snake, test_purpose: 'personalized_trial' }), error => error === failure && error.status === 402);
  assert.equal(attempts, 1);
});

test('stop and status preserve settlement evidence; review requires numeric history ID', async () => {
  const calls = [];
  const unsettled = { status: 'review_required', settled: false, review_required: true, reason: 'resource_teardown_pending', resources_released: true };
  const resource = new BrowserCallsResource(async (...args) => { calls.push(args); return unsettled; });
  assert.deepEqual(await resource.stop(callSid), unsettled);
  assert.deepEqual(await resource.status(callSid), unsettled);
  await resource.getReview(321);
  assert.equal(calls[2][1], '/api/v1/calls/321/review');
  assert.throws(() => resource.getReview(callSid), /callId/);
  assert.throws(() => resource.stop('path/../../calls'), /browser call SID/);
});

test('validates exact limits before making a request', () => {
  for (const maxDurationSeconds of [0, 301, 1.5, true]) assert.throws(() => serializeBrowserCallRequest({ requestId, assistantId: 1, maxDurationSeconds }), /maxDurationSeconds/);
  for (const variables of [{ nonFinite: NaN }, { notScalar: {} }, Array(3)]) assert.throws(() => serializeBrowserCallRequest({ requestId, assistantId: 1, variables }), /variables/);
  assert.throws(() => serializeBrowserCallRequest({ requestId, assistantId: 1, flowDraft: {} }), /requires flowId/);
  assert.throws(() => serializeBrowserCallRequest({ requestId: 'random', assistantId: 1 }), /UUID/);
  assert.throws(() => serializeBrowserCallRequest({ requestId, assistantId: 1, recordingConsent: 'true' }), /boolean/);
  assert.equal(serializeBrowserCallRequest({ requestId, assistantId: 1, maxDurationSeconds: 300 }).max_duration_seconds, 300);
});
