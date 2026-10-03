import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));

test('published declarations accept current models and nested camel/snake configuration without escaping types', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'burki-sdk-types-'));
  try {
    const declaration = resolve(packageRoot, 'dist/index');
    const fixture = join(directory, 'configuration.ts');
    await writeFile(fixture, `
import { BurkiClient, AssistantCreateParams, AssistantUpdateParams, BrowserPreflight } from ${JSON.stringify(declaration)};
const client = new BurkiClient({ apiKey: 'test' });
const camel: AssistantCreateParams = {
  name: 'Meeran', voiceMode: 'cascade', llmProviderConfig: { model: 'gpt-6.1-sol' },
  ttsSettings: { modelId: 'eleven_v4_turbo', voiceId: 'cloned', speed: 1, volume: 0.8, providerConfig: { language: 'auto' } },
  sttSettings: { model: 'universal-3-6-pro', language: 'multi', providerConfig: { prompt: 'Technical conversations', languageCodes: ['en','ur'] } },
  llmFallbackProviders: { enabled: true, fallbacks: [{provider:'openai', config: {model:'gpt-6-sol', maxTokens:500}}] }
};
const snake: AssistantCreateParams = {
  name: 'Meeran', voice_mode: 'openai_live', live_settings: { model: 'gpt-live-1', voice: 'marin', instructions: 'Urdu' },
  llm_provider_config: { model: 'gpt-6-astra', custom_config: { retainCamelKey: true } },
  tts_settings: { voice_id: 'cloned', model_id: 'eleven_v4_turbo', similarity_boost: 0.7 },
  stt_settings: { provider_config: { language_codes: ['en','ur'], prompt: 'Technical conversations' },
    flux_config: { language_hints: ['en'] } },
  llm_fallback_providers: { fallbacks: [{provider: 'openai', config: {base_url:'https://provider.test', max_tokens:300}}] }
};
const clear: AssistantUpdateParams = { description: '', end_call_message: null, is_active: false };
client.assistants.create(camel); client.assistants.create(snake); client.assistants.update(1, clear);
// @ts-expect-error: Required assistant name must still be present.
const missing: AssistantCreateParams = { voiceMode: 'cascade' };
// @ts-expect-error: Existing non-string prompt validation stays typed.
const badPrompt: AssistantCreateParams = { name: 'bad', llmSettings: {systemPrompt:42} };
declare const preflight: BrowserPreflight;
const billingBasis: 'actual_usage' | 'reserved' | undefined = preflight.billing_basis;
const pricingVerified: boolean | undefined = preflight.pricing_verified;
const legacyBilling: Pick<BrowserPreflight, 'billing_basis' | 'pricing_verified'> = {};
const reservedBilling: Pick<BrowserPreflight, 'billing_basis'> = { billing_basis: 'reserved' };
// @ts-expect-error: An estimated allowance is not the actual-usage billing contract.
preflight.billing_basis = 'estimated_allowance';
`);
    const result = spawnSync(process.execPath, [createRequire(import.meta.url).resolve('typescript/bin/tsc'),
      '--noEmit', '--strict', '--skipLibCheck', '--moduleResolution', 'bundler', '--module', 'esnext',
      '--target', 'es2022', '--lib', 'es2022,dom', fixture], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
