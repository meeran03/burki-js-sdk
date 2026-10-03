import test from 'node:test';
import assert from 'node:assert/strict';
import * as sdk from '../dist/index.mjs';

async function captureRequests(run) {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), method: init.method, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ id: 499 }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    await run(new sdk.BurkiClient({ apiKey: 'unit-test-key', baseUrl: 'https://sdk.example.test' }));
    return requests;
  } finally { globalThis.fetch = original; }
}

test('assistant creation sends the complete English/Urdu model configuration using API field names', async () => {
  const [request] = await captureRequests((client) => client.assistants.create({
    name: 'meeran agent', voiceMode: 'cascade',
    llmProviderConfig: { model: 'gpt-6.1-sol', customConfig: { mustKeepMyKey: true } },
    llmSettings: { systemPrompt: 'Reply in English or Urdu.', maxTokens: 800, welcomeMessage: '' },
    ttsSettings: { provider: 'elevenlabs', voiceId: 'owned-cloned-voice', modelId: 'eleven_v4_turbo', speed: 1.1, volume: 0.7,
      similarityBoost: 0.8, useSpeakerBoost: false, providerConfig: { language: 'auto' },
      backgroundSound: { soundUrl: 'https://example.test/background.wav', storageKey: 'owned-track', enabled: false } },
    sttSettings: { provider: 'assemblyai', model: 'universal-3-6-pro', language: 'multi',
      interimResults: false, providerConfig: { prompt: 'Personal technical conversations.', languageCodes: ['en', 'ur'], providerCamelOption: 12 } },
  }));
  assert.equal(request.method, 'POST');
  assert.equal(new URL(request.url).pathname, '/api/v1/assistants');
  assert.deepEqual(request.body, {
    name: 'meeran agent', voice_mode: 'cascade', llm_provider: 'openai',
    llm_provider_config: { model: 'gpt-6.1-sol', custom_config: { mustKeepMyKey: true } },
    llm_settings: { system_prompt: 'Reply in English or Urdu.', max_tokens: 800, welcome_message: '' },
    tts_settings: { provider: 'elevenlabs', voice_id: 'owned-cloned-voice', model_id: 'eleven_v4_turbo', speed: 1.1, volume: 0.7,
      similarity_boost: 0.8, use_speaker_boost: false, provider_config: { language: 'auto' },
      background_sound: { sound_url: 'https://example.test/background.wav', storage_key: 'owned-track', enabled: false } },
    stt_settings: { provider: 'assemblyai', model: 'universal-3-6-pro', language: 'multi',
      interim_results: false, provider_config: { prompt: 'Personal technical conversations.', language_codes: ['en', 'ur'], providerCamelOption: 12 } },
  });
});

test('PATCH preserves clearing values and opaque application, webhook and tool JSON', async () => {
  const opaque = { firstName: 'Meeran', providerKey: { languageCodes: 'user-owned JSON' } };
  const tool = { name: 'sampleTool', parameters: { type: 'object', properties: { firstName: { type: 'string' } } } };
  const [request] = await captureRequests((client) => client.assistants.update(499, {
    description: '', isActive: false, maxIdleMessages: 0, endCallMessage: null,
    webhookHeaders: { 'X-My-Header': 'customValue' }, customSettings: opaque,
    toolsSettings: { enabledTools: ['sampleTool'], customTools: [tool],
      transferCall: { transferNumbers: ['+15550000001'], sipHeaders: { 'X-Custom-Key': 'camelValue' } } },
    llmProviderConfig: { apiKey: 'tenant-test-key', baseUrl: 'https://provider.example.test', customConfig: opaque },
    name: undefined,
  }));
  assert.equal(request.method, 'PATCH');
  assert.equal(new URL(request.url).pathname, '/api/v1/assistants/499');
  assert.deepEqual(request.body, {
    description: '', is_active: false, max_idle_messages: 0, end_call_message: null,
    webhook_headers: { 'X-My-Header': 'customValue' }, custom_settings: opaque,
    tools_settings: { enabled_tools: ['sampleTool'], custom_tools: [tool],
      transfer_call: { transfer_numbers: ['+15550000001'], sip_headers: { 'X-Custom-Key': 'camelValue' } } },
    llm_provider_config: { api_key: 'tenant-test-key', base_url: 'https://provider.example.test', custom_config: opaque },
  });
});

test('canonical snake_case overrides alias collisions without depending on property order', async () => {
  const [first, second] = await captureRequests(async (client) => {
    await client.assistants.update(1, { voiceMode: 'openai_live', voice_mode: 'cascade',
      ttsSettings: { voiceId: 'alias', voice_id: 'canonical' },
      stt_settings: { providerConfig: { languageCodes: ['en'], language_codes: ['ur'] } } });
    await client.assistants.update(1, { voice_mode: 'cascade', voiceMode: 'openai_live',
      tts_settings: { voice_id: 'canonical', voiceId: 'alias' },
      stt_settings: { provider_config: { language_codes: ['ur'], languageCodes: ['en'] } } });
  });
  assert.deepEqual(first.body, second.body);
  assert.deepEqual(first.body, { voice_mode: 'cascade', tts_settings: { voice_id: 'canonical' },
    stt_settings: { provider_config: { language_codes: ['ur'] } } });
});

test('nested fallback configuration and live voice settings retain their intended shape', async () => {
  const [request] = await captureRequests((client) => client.assistants.update(1, {
    voiceMode: 'openai_live', liveSettings: { model: 'gpt-live-1', voice: 'cedar', instructions: 'Speak Urdu.' },
    llmFallbackProviders: { enabled: true, fallbacks: [{ provider: 'openai', config: {
      apiKey: 'tenant-fallback', baseUrl: 'https://provider.example.test', model: 'gpt-6-sol', maxTokens: 400,
      customConfig: { untouchedKey: true },
    } }] },
  }));
  assert.deepEqual(request.body, { voice_mode: 'openai_live', live_settings: { model: 'gpt-live-1', voice: 'cedar', instructions: 'Speak Urdu.' },
    llm_fallback_providers: { enabled: true, fallbacks: [{ provider: 'openai', config: {
      api_key: 'tenant-fallback', base_url: 'https://provider.example.test', model: 'gpt-6-sol', max_tokens: 400,
      custom_config: { untouchedKey: true },
    } }] } });
});

test('earlier documented llmSettings.model selects the provider model instead of silently defaulting', async () => {
  const [legacy, canonical] = await captureRequests(async (client) => {
    await client.assistants.create({ name: 'legacy example', llmSettings: { model: 'gpt-6-luna', temperature: 0.3 } });
    await client.assistants.create({ name: 'canonical example', llm_settings: { model: 'gpt-4o-mini' },
      llm_provider_config: { model: 'gpt-6-astra' } });
  });
  assert.equal(legacy.body.llm_provider_config.model, 'gpt-6-luna');
  assert.deepEqual(legacy.body.llm_settings, { temperature: 0.3 });
  assert.equal(canonical.body.llm_provider_config.model, 'gpt-6-astra');
  assert.deepEqual(canonical.body.llm_settings, {});
});

test('all previously published runtime exports and resources are retained', () => {
  const previous = [ 'AssistantsResource', 'AuthenticationError', 'BurkiAuth', 'BurkiClient', 'BurkiError', 'CallsResource',
    'CampaignProgressStream', 'CampaignsResource', 'DocumentsResource', 'LiveTranscriptStream', 'NotFoundError',
    'PhoneNumbersResource', 'RateLimitError', 'RealtimeClient', 'SMSResource', 'ServerError', 'ToolsResource', 'ValidationError', 'WebSocketError' ];
  for (const key of previous) assert.equal(typeof sdk[key], 'function', key);
  const client = new sdk.BurkiClient({ apiKey: 'unit-test-key' });
  for (const key of ['assistants', 'calls', 'phoneNumbers', 'documents', 'tools', 'sms', 'campaigns', 'realtime']) {
    assert.ok(client[key], key); assert.equal(client[key], client[key], `${key} remains cached`);
  }
});
