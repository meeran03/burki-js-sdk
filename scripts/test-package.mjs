import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sdkDirectory = new URL('../', import.meta.url);
const expectedPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const consumer = mkdtempSync(join(tmpdir(), 'burki-sdk-consumer-'));
try {
  // Run prepack explicitly so lifecycle logs cannot corrupt npm's JSON result.
  execFileSync('npm', ['run', 'prepack'], { cwd: sdkDirectory, stdio: 'inherit' });
  const stdout = execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', consumer],
    { cwd: sdkDirectory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const [pack] = JSON.parse(stdout);
  if (pack.name !== expectedPackage.name || pack.version !== expectedPackage.version) throw new Error('Unexpected package identity');
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'burki-sdk-consumer', private: true, type: 'module' }));
  // Clean CI runners have package tarballs but not registry metadata cached.
  // Allow registry dependency resolution; opt into strict offline locally.
  const cacheMode = process.env.BURKI_SDK_OFFLINE === '1' ? '--offline' : '--prefer-offline';
  execFileSync('npm', ['install', cacheMode, '--ignore-scripts', '--no-audit', '--no-fund', join(consumer, pack.filename)],
    { cwd: consumer, stdio: ['ignore', 'pipe', 'pipe'] });
  writeFileSync(join(consumer, 'check.mjs'), `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import { BurkiClient, SessionRequestError } from '@burki.dev/sdk';
    import { createBrowserCall, SessionRequestError as BrowserError } from '@burki.dev/sdk/browser';
    const require = createRequire(import.meta.url);
    const cjs = require('@burki.dev/sdk');
    const browserCjs = require('@burki.dev/sdk/browser');
    assert.equal(SessionRequestError, BrowserError);
    assert.equal(cjs.SessionRequestError, browserCjs.SessionRequestError);
    assert.equal(typeof createBrowserCall, 'function');
    assert.equal(typeof browserCjs.createBrowserCall, 'function');
    let body;
    globalThis.fetch = async (_url, options) => {
      body = JSON.parse(options.body);
      return new Response(JSON.stringify({id: 42}), {status: 200, headers: {'Content-Type': 'application/json'}});
    };
    const client = new BurkiClient({apiKey: 'offline-server-test'});
    await client.assistants.create({name: 'Example', llmProviderConfig: {model: 'gpt-6.1-sol'},
      ttsSettings: {provider: 'elevenlabs', modelId: 'eleven_v4_turbo', voiceId: 'example-clone'},
      sttSettings: {provider: 'assemblyai', model: 'universal-3-6-pro', providerConfig: {languageCodes: ['en','ur'], prompt: 'English and Urdu conversations.'}}});
    assert.equal(body.tts_settings.model_id, 'eleven_v4_turbo');
    assert.deepEqual(body.stt_settings.provider_config.language_codes, ['en','ur']);
    assert.equal(typeof client.browser.preflight, 'function');
  `);
  execFileSync(process.execPath, ['check.mjs'], { cwd: consumer, stdio: 'inherit' });
  writeFileSync(join(consumer, 'check.mts'), `
    import { BurkiClient, type AssistantCreateParams, type BrowserPreflight } from '@burki.dev/sdk';
    import { createBrowserCall, type BrowserSessionApi } from '@burki.dev/sdk/browser';
    const config: AssistantCreateParams = {name:'Example', voiceMode:'cascade',
      llmProviderConfig:{model:'gpt-6.1-sol'},
      ttsSettings:{provider:'elevenlabs',modelId:'eleven_v4_turbo',voiceId:'example',speed:1,volume:1},
      sttSettings:{provider:'assemblyai',model:'universal-3-6-pro',providerConfig:{languageCodes:['en','ur'],prompt:'English and Urdu conversations.'}}};
    const client = new BurkiClient({apiKey:'server-example'});
    void client.assistants.create(config);
    const transport: BrowserSessionApi = client.browser.transport({requestId:'11111111-2222-4333-8444-555555555555',assistantId:42});
    createBrowserCall({input:{request_id:'11111111-2222-4333-8444-555555555555',assistant_id:42},transport,
      callbacks:{ready(){},error(){},ended(settled:boolean){},transcript(id,speaker,text,final){}}});
    async function quote() { const result:BrowserPreflight = await client.browser.preflight({requestId:crypto.randomUUID(),assistantId:42});
      const amount:string|null = result.provider_cost_max_usd; return amount; }
  `);
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'NodeNext', moduleResolution: 'NodeNext',
    strict: true, skipLibCheck: true, noEmit: true,
  }, include: ['check.mts'] }));
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', join(consumer, 'tsconfig.json')],
    { cwd: consumer, stdio: 'inherit' });
  console.log(JSON.stringify({ installedPackage: `${pack.name}@${pack.version}`, integrity: pack.integrity,
    bytes: pack.size, esmAndCjsImports: 'passed', consumerTypes: 'passed', normalizedConfiguration: 'passed' }));
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
