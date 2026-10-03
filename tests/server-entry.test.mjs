import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('server entry runs without DOM, microphone or loading LiveKit media', () => {
  const path = fileURLToPath(new URL('../dist/index.js', import.meta.url));
  const code = `
    const Module = require('node:module');
    const original = Module._load;
    Module._load = function(name, ...args) {
      if (name === 'livekit-client') throw new Error('Server entry loaded browser media');
      return original.call(this, name, ...args);
    };
    for (const name of ['window', 'document', 'navigator']) {
      Object.defineProperty(globalThis, name, { configurable: true, get() { throw new Error('Unexpected DOM read: ' + name); } });
    }
    const { BurkiClient } = require(process.argv[1]);
    const client = new BurkiClient({ apiKey: 'server-test-key' });
    if (!client.assistants || !client.calls || !client.realtime || !client.browser) process.exit(1);
  `;
  const result = spawnSync(process.execPath, ['-e', code, path], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
