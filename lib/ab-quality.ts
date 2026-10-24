import { Comment } from './types';

/**
 * 記事品質 A/B テスト（quality-v1）
 *
 * - treatment（改善版）は QUALITY_V1_TREATMENT_BLOG_IDS に入っているサイトだけ。
 * - control（ガールズVIP）とその他全サイトは従来どおり（このファイルの処理を一切通らない）。
 * - 停止: 下の配列を [] にする（dev server がホットリロード）か、
 *   ブラウザで localStorage.setItem('matomeln_ab_quality_v1', 'off')。
 * - 開始: 2026-10-24 / 予定: 2週間（〜2026-11-07）
 */
export const QUALITY_V1_TREATMENT_BLOG_IDS: string[] = ['matome_blade'];
export const QUALITY_V1_CONTROL_BLOG_IDS: string[] = ['garlsvip'];
export const QUALITY_V1_VARIANT = 'quality-v1';

export type AbVariant = 'treatment' | 'control' | 'none';

export interface SummarizeVariantOptions {
  qualityV1?: boolean;
}

export function isQualityV1Disabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('matomeln_ab_quality_v1') === 'off';
  } catch {
    return false;
  }
}

export function getQualityV1Variant(blogId: string | null | undefined): AbVariant {
  if (!blogId) return 'none';
  if (QUALITY_V1_TREATMENT_BLOG_IDS.includes(blogId)) {
    return isQualityV1Disabled() ? 'none' : 'treatment';
  }
  if (QUALITY_V1_CONTROL_BLOG_IDS.includes(blogId)) return 'control';
  return 'none';
}

// ---------- (d) 画像なし【画像】スレ ----------
const IMAGE_URL_PATTERN = /https?:\/\/\S+\.(?:jpe?g|png|gif|webp)|https?:\/\/(?:i\.)?imgur\.com\/|https?:\/\/pbs\.twimg\.com\/|https?:\/\/(?:x|twitter)\.com\/\S+\/status\/|https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i;

export function getImageThreadSkipReason(title: string, comments: Pick<Comment, 'body' | 'images'>[]): string | null {
  if (!/【\s*(?:画像|動画|画像あり)\s*】/.test(title || '')) return null;
  const head = comments.slice(0, 5);
  const hasImage = head.some((c) => (c.images && c.images.length > 0) || IMAGE_URL_PATTERN.test(c.body || ''));
  return hasImage ? null : '【画像】スレだが冒頭レスに画像・動画が無い';
}

// ---------- (b) 事前スコア・重複ツッコミの集約 ----------
function bigrams(text: string): Set<string> {
  const t = (text || '')
    .replace(/(?:>>|＞＞)[０-９\d]+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\s、。！？!?「」『』（）()\[\]【】ｗw草…・]/g, '');
  const set = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
}

export function jaccard(a: string, b: string): number {
  const x = bigrams(a);
  const y = bigrams(b);
  if (x.size === 0 || y.size === 0) return 0;
  let inter = 0;
  x.forEach((g) => { if (y.has(g)) inter++; });
  return inter / (x.size + y.size - inter);
}

function topicOverlap(body: string, topic: Set<string>): number {
  const b = bigrams(body);
  if (b.size === 0 || topic.size === 0) return 0;
  let hit = 0;
  b.forEach((g) => { if (topic.has(g)) hit++; });
  return hit / Math.min(b.size, topic.size);
}

export interface CandidateEntry {
  comment: Comment;
  originalPostNumber: number;
}

export interface PrescoreResult {
  entries: (CandidateEntry & { bodyLimit?: number })[];
  droppedLongOffTopic: number[];
  collapsedDuplicates: number[];
}

/**
 * - 300字超で レス1/[主]/被アンカー3以上 以外のもの: 話題（タイトル+レス1）との重なりが低ければ候補から外し、
 *   重なりがあれば冒頭120字だけ見せる。
 * - 連続する短いツッコミで文字bigram Jaccard>0.5 のものは最初の1つに集約。
 */
export function prescoreCandidateEntries(title: string, comments: Comment[], entries: CandidateEntry[]): PrescoreResult {
  const replyCount = new Map<number, number>();
  const anchorRe = /(?:>>|＞＞)([0-9０-９]+)/g;
  for (const c of comments) {
    const re = new RegExp(anchorRe.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(c.body || '')) !== null) {
      const n = Number(m[1].replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)));
      replyCount.set(n, (replyCount.get(n) || 0) + 1);
    }
  }
  const topic = bigrams(`${title} ${(comments[0]?.body || '').slice(0, 400)}`);
  const droppedLongOffTopic: number[] = [];
  const collapsedDuplicates: number[] = [];
  const out: (CandidateEntry & { bodyLimit?: number })[] = [];
  let lastKept: CandidateEntry | null = null;

  for (const entry of entries) {
    const n = entry.originalPostNumber;
    const body = (entry.comment.body || '').replace(/\s+/g, ' ').trim();
    const protectedPost = n === 1 || entry.comment.is_talk_owner || (replyCount.get(n) || 0) >= 3;
    if (!protectedPost && body.length > 300) {
      if (topicOverlap(body, topic) < 0.08) {
        droppedLongOffTopic.push(n);
        continue;
      }
      out.push({ ...entry, bodyLimit: 120 });
      lastKept = entry;
      continue;
    }
    if (!protectedPost && lastKept && lastKept.originalPostNumber !== 1 && body.length <= 80) {
      const prev = (lastKept.comment.body || '').replace(/\s+/g, ' ').trim();
      if (prev.length <= 80 && jaccard(prev, body) > 0.5) {
        collapsedDuplicates.push(n);
        continue;
      }
    }
    out.push(entry);
    lastKept = entry;
  }
  return { entries: out, droppedLongOffTopic, collapsedDuplicates };
}

// ---------- (e) 選択レス数の上限（目標の約1.2倍、スコア上位を残す） ----------
export const QUALITY_V1_SELECTION_CAP_RATIO = 1.2;

export interface SelectionCapInfo {
  target: number;
  cap: number;
  before: number;
  after: number;
  dropped: number[];
}

function toHalfWidthNumber(s: string): number {
  return Number(s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)));
}

function anchorsOf(body: string): number[] {
  const out: number[] = [];
  const re = /(?:>>|＞＞)([0-9０-９]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body || '')) !== null) out.push(toHalfWidthNumber(m[1]));
  return out;
}

/**
 * AIが選んだレスが目標数の約1.2倍を超えたら、スコア上位だけを残す（並び順はAIの出力順のまま）。
 * スコア: レス1/[主]は必ず残す。AIの出力順（前ほど高）・被アンカー数・選択済みレスからの参照・本文の長さ。
 */
export function capQualityV1Selection<T extends { post_number: number }>(
  posts: T[],
  comments: Pick<Comment, 'body' | 'is_talk_owner'>[],
  targetCount: number,
  ratio = QUALITY_V1_SELECTION_CAP_RATIO,
): { posts: T[]; info: SelectionCapInfo } {
  const target = Math.max(1, Math.round(targetCount));
  const cap = Math.max(target, Math.ceil(target * ratio));
  const before = posts.length;
  if (before <= cap) return { posts, info: { target, cap, before, after: before, dropped: [] } };

  const replyCount = new Map<number, number>();
  for (const c of comments) for (const n of anchorsOf(c.body || '')) replyCount.set(n, (replyCount.get(n) || 0) + 1);
  const selectedSet = new Set(posts.map((p) => p.post_number));
  const referencedBySelected = new Map<number, number>();
  for (const p of posts) {
    for (const n of anchorsOf(comments[p.post_number - 1]?.body || '')) {
      if (n !== p.post_number && selectedSet.has(n)) referencedBySelected.set(n, (referencedBySelected.get(n) || 0) + 1);
    }
  }
  const scored = posts.map((p, rank) => {
    const c = comments[p.post_number - 1];
    const len = (c?.body || '').replace(/\s+/g, '').length;
    const protectedPost = p.post_number === 1 || Boolean(c?.is_talk_owner);
    let score = protectedPost ? Number.POSITIVE_INFINITY : 0;
    if (!protectedPost) {
      score += 2 * (1 - rank / before);
      score += Math.min(replyCount.get(p.post_number) || 0, 5) * 0.6;
      score += Math.min(referencedBySelected.get(p.post_number) || 0, 3) * 0.8;
      score += len < 6 ? -1 : len <= 160 ? 0.5 : len > 300 ? -0.5 : 0;
    }
    return { p, rank, score };
  });
  const keep = new Set(
    [...scored].sort((a, b) => (b.score - a.score) || (a.rank - b.rank)).slice(0, cap).map((x) => x.rank),
  );
  const kept = scored.filter((x) => keep.has(x.rank)).map((x) => x.p);
  const dropped = scored.filter((x) => !keep.has(x.rank)).map((x) => x.p.post_number);
  return { posts: kept, info: { target, cap, before, after: kept.length, dropped } };
}

export function formatSelectionCapNote(info: SelectionCapInfo | undefined): string | undefined {
  if (!info) return undefined;
  return info.before > info.after
    ? `selection-cap: ${info.before}->${info.after} (target=${info.target}, cap=${info.cap})`
    : `selection-cap: none ${info.before}<=${info.cap} (target=${info.target})`;
}

// ---------- (c) few-shot ----------
export const QUALITY_V1_FEW_SHOT = `【良いまとめの例】
例1 スレタイ「【野球】巨人、ドラフト1位指名を発表」
 良いタイトル: 巨人のドラフト1位、まさかの指名でファン騒然「誰やねん」
 良い選び方: レス1 → 驚き → 選手の経歴を語る詳しいレス → 反論 → 短い笑い → 「数年後に化けるやつ」でオチ
例2 スレタイ「異性の同僚と二人で飲みに行くのはアリ？」
 良いタイトル: 夫「同僚(女)と飲みに行くわ」→妻の返しが秀逸だった件
 良い選び方: [主]の状況説明 → 共感 → 体験談2つ → 反対意見 → [主]の結論
例3 悪い例（避ける）: 同じ趣旨の「詐欺はしてない」ツッコミを5個並べる / 話題と無関係な長文 / 【全文】で始まるタイトル / ｗを大量に付ける / 「馬鹿」「ゴミ」などの攻撃語
`;

export const QUALITY_V1_EXTRA_RULES = `- 同じ趣旨のツッコミは最大2個まで。違う角度（体験談・反論・小ネタ）を混ぜる
- 話題と関係ない長文は選ばない
- 最後のほうは「オチ/まとめになる一言」で終える`;

export const QUALITY_V1_TITLE_RULES = `【タイトル案】title_candidates に記事タイトル案を3つ入れる。
- 各案16〜32字。スレタイの事実を変えない（人物・数字・出来事はそのまま）
- 人物/対象＋意外な行動、または 会話「」→結果… の形。選んだレスの面白い一言を「」で使ってよい
- 【全文】【謎】は使わない。【悲報】【朗報】【画像】は内容が合う時だけ
- ｗは最大3個。攻撃語（馬鹿・ゴミ・死ね等）や誇張は禁止`;

// ---------- (a) タイトル選択 ----------
const BANNED_TITLE_WORDS = ['馬鹿', 'バカ', 'ばか', 'ゴミ', 'ごみクズ', 'クズ', '死ね', 'しね', 'ガイジ', 'キチガイ', '池沼', 'カス', 'ブス', '低能', 'アホ'];
export const TITLE_MIN_LENGTH = 12;
export const TITLE_MAX_LENGTH = 32;

export function cleanTitleForQualityV1(title: string): string {
  return (title || '')
    .replace(/【\s*(?:全文|謎)\s*】/g, '')
    .replace(/[ｗwWＷ]{4,}/g, 'ｗｗｗ')
    .replace(/[!！]{3,}/g, '！！')
    .replace(/[?？]{3,}/g, '？？')
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleRejectReason(candidate: string, originalTitle: string): string | null {
  const t = (candidate || '').trim();
  if (!t) return 'empty';
  if (/【\s*(?:全文|謎)\s*】/.test(t)) return 'banned-tag';
  if ((t.match(/[ｗwWＷ]/g) || []).length > 3 && /[ｗwWＷ]{4,}/.test(t)) return 'w-spam';
  if (BANNED_TITLE_WORDS.some((w) => t.includes(w))) return 'aggressive';
  const len = Array.from(t).length;
  if (len < TITLE_MIN_LENGTH || len > TITLE_MAX_LENGTH) return 'length';
  // スレタイと全く関係ない（捏造の可能性）案は不採用
  const orig = bigrams(originalTitle);
  const cand = bigrams(t);
  let hit = 0;
  cand.forEach((g) => { if (orig.has(g)) hit++; });
  if (orig.size > 0 && hit < 2) return 'off-topic';
  return null;
}

export interface TitlePick {
  title: string;
  source: 'candidate' | 'original-cleaned';
  index: number;
  rejected: { candidate: string; reason: string }[];
}

export function pickQualityV1Title(candidates: unknown, originalTitle: string): TitlePick {
  const list = Array.isArray(candidates) ? candidates.filter((c): c is string => typeof c === 'string') : [];
  const rejected: { candidate: string; reason: string }[] = [];
  for (let i = 0; i < list.length; i++) {
    const c = list[i].replace(/\s+/g, ' ').trim();
    const reason = titleRejectReason(c, originalTitle);
    if (!reason) return { title: c, source: 'candidate', index: i, rejected };
    rejected.push({ candidate: c, reason });
  }
  return { title: cleanTitleForQualityV1(originalTitle), source: 'original-cleaned', index: -1, rejected };
}

// ---------- ログ ----------
export interface AbVariantLogEntry {
  site: string;
  variant: AbVariant;
  experiment?: string;
  title: string;
  original_title?: string;
  title_source?: string;
  article_url?: string | null;
  article_id?: string | null;
  thread_url?: string;
  note?: string;
  selection_target?: number;
  selection_cap?: number;
  selection_before?: number;
  selection_after?: number;
}

export function extractLivedoorArticleId(url: string | null | undefined): string | null {
  const m = (url || '').match(/\/(\d{6,})(?:\.html)?(?:[?#].*)?$/);
  return m ? m[1] : null;
}

export async function logAbVariant(entry: AbVariantLogEntry): Promise<void> {
  try {
    await fetch('/api/ab-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment: QUALITY_V1_VARIANT, ...entry }),
    });
  } catch {
    // ログ失敗は投稿処理に影響させない
  }
}
