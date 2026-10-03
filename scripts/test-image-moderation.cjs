const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('lib/image-moderation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = { exports: {} };
new Function('exports', 'require', 'module', source)(loaded.exports, require, loaded);
global.window = { setTimeout, clearTimeout };
const options = { enabled: true, endpoint: 'http://test', model: 'test' };
const comment = { id: 'a', res_id: '1', body: 'test', images: ['a', 'b', 'c', 'd'] };

(async () => {
  for (const status of ['safe', 'unsafe', 'review', 'malformed', 'contradictory', 'fetch-failure', 'model-failure']) {
    let calls = 0;
    global.fetch = async (url, request) => {
      if (url.startsWith('/api/proxy/fetchImage')) {
        return status === 'fetch-failure' ? new Response('', { status: 500 }) : Response.json({ data: 'image' });
      }
      calls++;
      const body = JSON.parse(request.body);
      assert.equal(body.options.num_predict, 80);
      assert.equal(typeof body.format, 'object');
      if (status === 'model-failure') throw new DOMException('Timed out', 'AbortError');
      const decision = status === 'malformed' ? {} : {
        status: status === 'contradictory' ? 'safe' : status,
        categories: ['unsafe', 'contradictory'].includes(status) ? ['gore'] : [],
        reason: 'test',
      };
      return Response.json({ message: { content: JSON.stringify(decision) } });
    };
    const result = await loaded.exports.filterUnsafeImageComments([comment], options);
    assert.equal(result.keptComments.length, status === 'safe' ? 1 : 0, status);
    assert.equal(result.removedComments.length, status === 'unsafe' ? 1 : 0, status);
    assert.equal(result.reviewComments.length, !['safe', 'unsafe'].includes(status) ? 1 : 0, status);
    if (status === 'safe') {
      assert.equal(calls, 4, 'all four images must be checked');
      calls = 0;
      await loaded.exports.filterUnsafeImageComments([comment, { ...comment, id: 'b' }], options);
      assert.equal(calls, 4, 'duplicate images should be checked once per operation');
    }
    console.log(status + ': passed');
  }
  const disabled = await loaded.exports.filterUnsafeImageComments([comment], { ...options, enabled: false });
  global.fetch = async (url) => url.startsWith('/api/proxy/fetchImage')
    ? Response.json({ data: 'image' })
    : Response.json({ message: { content: JSON.stringify({ status: 'review', categories: [], reason: 'uncertain' }) } });
  const textOnly = { ...comment, id: 'text-only', images: [] };
  const mixed = await loaded.exports.filterUnsafeImageComments([comment, textOnly], options);
  assert.deepEqual(mixed.keptComments, [textOnly], 'unreviewed images excluded, safe text retained for posting');
  assert.equal(mixed.reviewComments.length, 1);
  const page = fs.readFileSync('app/page.tsx', 'utf8');
  assert.ok(!page.includes('件あるため自動投稿を停止しました'), 'review must not abort bulk posting');
  assert.ok(page.includes('if (newSelectedComments.length === 0)'), 'empty article must not be posted');
  console.log('mixed auto-post selection: passed');
  assert.equal(disabled.keptComments.length, 1);
  assert.equal(disabled.reviewComments.length, 0);
})().catch(error => { console.error(error); process.exitCode = 1; });
