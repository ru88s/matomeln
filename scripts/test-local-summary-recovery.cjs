const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { callLocalOllamaAPI } = require('../lib/ai-summarize.ts');
let testTime = Date.now();
Date.now = () => testTime;
const comments = Array.from({ length: 120 }, (_, i) => ({ id: String(i), res_id: String(i + 1), body: 'これは十分な長さの体験談です。家事の負担が減って助かりました。', images: [] }));
(async () => {
  for (const mode of ['retry', 'fallback', 'valid-at-limit']) {
    testTime += 120001;
    const budgets = [];
    global.fetch = async (_, request) => {
      const body = JSON.parse(request.body);
      budgets.push(body.options.num_predict);
      assert.equal(body.format.properties.selected_posts.maxItems, 90);
      assert.equal(body.format.properties.selected_posts.items.maximum, 120);
      const valid = mode === 'valid-at-limit' || (mode === 'retry' && budgets.length === 2);
      return Response.json({ done_reason: 'length', message: { content: valid ? '{"selected_posts":[1,2,5]}' : '{"selected_posts":[1,' } });
    };
    const result = await callLocalOllamaAPI('家事の体験談', comments);
    assert.ok(result.selected_posts.length > 0);
    assert.deepEqual(budgets, mode === 'valid-at-limit' ? [768] : [768, 1536]);
    console.log(mode + ': passed');
  }
  for (const error of [new DOMException('timeout', 'AbortError'), new TypeError('Failed to fetch')]) {
    testTime += 120001;
    global.fetch = async () => { throw error; };
    const result = await callLocalOllamaAPI('家事の体験談', comments);
    assert.ok(result.selected_posts.length > 0);
    console.log(error.name + ' recovery: passed');
  }
  for (const mode of ['http-error', 'body-error']) {
    testTime += 120001;
    let calls = 0;
    global.fetch = async () => {
      calls++;
      return mode === 'http-error' ? new Response('', { status: 503 }) : { ok: true, json: async () => { throw new SyntaxError('Invalid body'); } };
    };
    assert.ok((await callLocalOllamaAPI('テスト', comments)).selected_posts.length > 0);
    assert.ok((await callLocalOllamaAPI('テスト', comments)).selected_posts.length > 0);
    assert.equal(calls, 1, 'cooldown avoids repeatedly hitting unavailable model');
    console.log(mode + ' and cooldown: passed');
  }
  assert.deepEqual(await callLocalOllamaAPI('空入力', []), { selected_posts: [] });
})().catch(error => { console.error(error); process.exitCode = 1; });
