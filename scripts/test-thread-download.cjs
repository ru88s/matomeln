const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, filename);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...args);
};
const { fetchThreadBytes } = require('../lib/thread-fetch.ts');
const { GET } = require('../app-api/proxy/get5chFallback/route.ts');
const request = { nextUrl: new URL('http://localhost/api?url=https://nova.5ch.io/test/read.cgi/livegalileo/1792436022/') };
(async () => {
  for (const mode of ['network', 'body', '503']) {
    let calls = 0;
    global.fetch = async () => {
      if (++calls > 1) return new Response('recovered');
      if (mode === 'network') throw new TypeError('fetch failed');
      if (mode === 'body') return { status: 200, arrayBuffer: async () => { throw new DOMException('timeout', 'TimeoutError'); } };
      return new Response('', { status: 503 });
    };
    assert.equal(new TextDecoder().decode((await fetchThreadBytes('https://example.test', {})).buffer), 'recovered');
    assert.equal(calls, 2);
  }
  for (const mode of ['404', 'network', 'html-network', 'invalid']) {
    global.fetch = async (url) => {
      if (mode === 'network' || (mode === 'html-network' && url.includes('read.cgi'))) throw new TypeError('fetch failed');
      return mode === 'invalid' ? new Response('not a thread') : new Response('', { status: 404 });
    };
    const response = await GET(request);
    assert.equal(response.status, mode === '404' ? 404 : 502, mode);
    assert.equal((await response.json()).retryable, mode !== '404');
  }
  global.fetch = async () => new Response('名無しさん<><>2026/10/20(火) 10:00:00 ID:test<>テスト本文です<>テスト');
  assert.equal((await GET(request)).status, 200);
  const { markThreadAsSkipped } = require('../lib/bulk-processing.ts');
  global.fetch = async () => { throw new Error('must not register a transient failure'); };
  await assert.rejects(markThreadAsSkipped('https://nova.5ch.io/test/read.cgi/livegalileo/1792436022/', '取得先への接続またはデータの解析に失敗しました。'), /次回再試行/);
  console.log('Thread download: 9 cases passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
