const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { fetch5chThread } = require('../lib/5ch-api.ts');
const url = 'https://nova.5ch.io/test/read.cgi/livegalileo/1788087098/';
const content = '名無しさん<><>2026/10/06(火) 12:00:00 ID:test<>これは取得テストの本文です<>取得テスト';

(async () => {
  for (const mode of ['network', 'http', 'json', 'empty', 'timeout', 'body-timeout']) {
    const calls = [];
    global.fetch = async (input, options) => {
      calls.push(input);
      assert.ok(options.signal);
      if (calls.length === 2) return Response.json({ content });
      if (mode === 'network') throw new TypeError('Failed to fetch');
      if (mode === 'timeout') throw new DOMException('timeout', 'TimeoutError');
      if (mode === 'body-timeout') return { ok: true, json: async () => { throw new DOMException('timeout', 'TimeoutError'); } };
      if (mode === 'http') return new Response('', { status: 503 });
      if (mode === 'json') return new Response('');
      return Response.json({ content: '' });
    };
    assert.equal((await fetch5chThread(url)).comments.length, 1);
    assert.equal(calls.length, 2);
    assert.ok(calls[1].startsWith('/api/proxy/get5chFallback?'));
  }
  for (const mode of ['http', 'network', 'timeout', 'json']) {
    let calls = 0;
    global.fetch = async () => {
      if (++calls === 1) throw new TypeError('Failed to fetch');
      if (mode === 'network') throw new TypeError('Failed to fetch');
      if (mode === 'timeout') throw new DOMException('timeout', 'TimeoutError');
      if (mode === 'json') return new Response('');
      return Response.json({ error: 'missing' }, { status: 404 });
    };
    await assert.rejects(fetch5chThread(url), mode === 'http' ? /スレッドが見つかりません/ : mode === 'network' ? /接続できません/ : mode === 'timeout' ? /タイムアウト/ : /正常な応答/);
    assert.equal(calls, 2, 'fallback must run only once');
  }
  global.fetch = async () => Response.json({ content });
  assert.equal((await fetch5chThread(url)).comments.length, 1);
  console.log('5ch recovery: 11 cases passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
