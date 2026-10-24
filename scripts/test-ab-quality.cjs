const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const ab = require('../lib/ab-quality.ts');
const { callLocalOllamaAPI } = require('../lib/ai-summarize.ts');

// flag: only matome_blade is treatment
assert.equal(ab.getQualityV1Variant('matome_blade'), 'treatment');
assert.equal(ab.getQualityV1Variant('garlsvip'), 'control');
assert.equal(ab.getQualityV1Variant('kijoume'), 'none');
assert.equal(ab.getQualityV1Variant(undefined), 'none');

// (a) title pick
const orig = '【全文】ちゃんみな 交通事故巡り謝罪声明「飲酒や薬物の使用は一切ありません」';
let pick = ab.pickQualityV1Title(['【全文】ちゃんみな謝罪', 'ちゃんみな、事故の謝罪で「飲酒も薬物もない」ネットの反応は', 'x'], orig);
assert.equal(pick.source, 'candidate'); assert.equal(pick.index, 1);
assert.equal(pick.rejected[0].reason, 'banned-tag');
pick = ab.pickQualityV1Title(['【悲報】馬鹿のせいでモンゴル保護区が焼失', '短い', '金正恩ダイエットｗｗｗｗｗｗｗｗ成功'], '【悲報】馬鹿のせいでモンゴル保護区が焼失ｗｗｗｗｗｗ');
assert.equal(pick.source, 'original-cleaned');
assert.deepEqual(pick.rejected.map(r => r.reason), ['aggressive', 'length', 'w-spam']);
assert.ok(!/ｗ{4,}/.test(pick.title));
assert.equal(ab.pickQualityV1Title(undefined, '【全文】テストのスレタイです').title, 'テストのスレタイです');
assert.equal(ab.titleRejectReason('全然関係ない猫の話をするスレッドです', '巨人ドラフト1位指名を発表'), 'off-topic');
assert.equal(ab.titleRejectReason('あ'.repeat(33), 'あああ'), 'length');
console.log('title pick: passed');

// (d) image thread
assert.match(ab.getImageThreadSkipReason('【画像】金正恩、ダイエット成功', [{ body: 'ソースなし' }]), /画像/);
assert.equal(ab.getImageThreadSkipReason('【画像】金正恩', [{ body: 'https://i.imgur.com/abc.jpg' }]), null);
assert.equal(ab.getImageThreadSkipReason('【画像】金正恩', [{ body: 'x', images: ['a.jpg'] }]), null);
assert.equal(ab.getImageThreadSkipReason('普通のスレ', [{ body: 'x' }]), null);
console.log('image skip: passed');

// (b) prescore
const mk = (body, extra = {}) => ({ id: String(Math.random()), res_id: '0', name: '', body, talk_id: 't', created_at: '', ...extra });
const comments = [
  mk('中川翔子さんが詐欺について語った件について'),
  mk('詐欺はしてないだろ'),
  mk('詐欺はしてないよな'),
  mk('しょこたん好きだったわ'),
  mk('AV撮影地の話をするとあそこの廃墟は昔から有名で' + '関係ない長文'.repeat(60)),
  mk('中川翔子の詐欺発言について長く語ると、' + '中川翔子は詐欺が嫌いという話'.repeat(25)),
];
const entries = comments.map((comment, i) => ({ comment, originalPostNumber: i + 1 }));
const r = ab.prescoreCandidateEntries('中川翔子さん「詐欺とかどうしようもない悪人が許せない」', comments, entries);
assert.deepEqual(r.collapsedDuplicates, [3]);
assert.deepEqual(r.droppedLongOffTopic, [5]);
assert.equal(r.entries.find(e => e.originalPostNumber === 6).bodyLimit, 120);
assert.ok(r.entries.some(e => e.originalPostNumber === 1));
console.log('prescore: passed');

// (e) selection cap ~1.2x target, keep best-scored, keep order
{
  const th = Array.from({ length: 40 }, (_, i) => mk(i === 0 ? 'スレ立て本文です' : `普通の長さのレス番号${i}です`, i === 7 ? { is_talk_owner: true } : {}));
  th[20].body = '>>30 それな'; th[21].body = '>>30 わかる'; th[22].body = '>>30 草';
  const posts = Array.from({ length: 30 }, (_, i) => ({ post_number: 40 - i })).concat([{ post_number: 1 }, { post_number: 8 }]);
  const { posts: kept, info } = ab.capQualityV1Selection(posts, th, 10);
  assert.equal(info.cap, 12); assert.equal(info.before, 32); assert.equal(info.after, 12); assert.equal(kept.length, 12);
  assert.ok(kept.some(p => p.post_number === 1) && kept.some(p => p.post_number === 8), 'レス1と[主]は残す');
  assert.ok(kept.some(p => p.post_number === 30), '被アンカーが多いレスは残す');
  const idx = kept.map(p => posts.indexOf(p)); assert.deepEqual(idx, [...idx].sort((a, b) => a - b), 'AIの順序を維持');
  assert.equal(info.dropped.length, 20);
  const small = ab.capQualityV1Selection(posts.slice(0, 11), th, 10);
  assert.equal(small.posts.length, 11); assert.equal(small.info.dropped.length, 0);
  assert.match(ab.formatSelectionCapNote(info), /32->12/);
  console.log('selection cap: passed');
}

// ollama request: control unchanged, treatment adds title_candidates
(async () => {
  const thread = Array.from({ length: 30 }, (_, i) => mk(`これは十分な長さのレスです番号${i}の体験談を書きます`));
  const seen = [];
  global.fetch = async (_, req) => {
    const body = JSON.parse(req.body); seen.push(body);
    const content = body.format.properties.title_candidates
      ? '{"selected_posts":[1,2,5],"title_candidates":["案A十分な長さのタイトルです","b","c"]}'
      : '{"selected_posts":[1,2,5]}';
    return Response.json({ message: { content } });
  };
  const c = await callLocalOllamaAPI('体験談スレ', thread);
  assert.equal(c.title_candidates, undefined);
  assert.equal(seen[0].format.properties.title_candidates, undefined);
  assert.equal(seen[0].options.num_predict, 768);
  assert.doesNotMatch(seen[0].messages[1].content, /良いまとめの例/);
  const t = await callLocalOllamaAPI('体験談スレ', thread, {}, 0, { qualityV1: true });
  assert.deepEqual(t.title_candidates, ['案A十分な長さのタイトルです', 'b', 'c']);
  assert.match(seen[1].messages[1].content, /良いまとめの例/);
  assert.match(seen[1].messages[1].content, /title_candidates/);
  assert.ok(t.selected_posts.length > 0);
  assert.equal(c.quality_v1_cap, undefined, 'control は上限処理を通らない');
  assert.ok(t.quality_v1_cap && t.quality_v1_cap.cap >= t.quality_v1_cap.target);
  // treatment: AIが大量選択したら約1.2倍に切る / control は切らない
  const big = Array.from({ length: 30 }, (_, i) => i + 1);
  global.fetch = async (_, req) => {
    const body = JSON.parse(req.body);
    return Response.json({ message: { content: JSON.stringify(body.format.properties.title_candidates ? { selected_posts: big, title_candidates: ['a', 'b', 'c'] } : { selected_posts: big }) } });
  };
  const thread60 = Array.from({ length: 60 }, (_, i) => mk(`これは十分な長さのレスです番号${i}の体験談を書きます`));
  const tc = await callLocalOllamaAPI('体験談スレ', thread60, {}, 0, { qualityV1: true });
  assert.ok(tc.selected_posts.length <= tc.quality_v1_cap.cap, `treatment capped ${tc.selected_posts.length}/${tc.quality_v1_cap.cap}`);
  assert.equal(tc.quality_v1_cap.before, 30);
  const cc = await callLocalOllamaAPI('体験談スレ', thread60);
  assert.equal(cc.quality_v1_cap, undefined);
  assert.ok(cc.selected_posts.length > tc.selected_posts.length, `control not capped ${cc.selected_posts.length}`);
  console.log('ollama variant isolation: passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
