/**
 * タグサムネイルキャッシュ
 * スレメモくんのタグDBからキャッシュ済みサムネイルを検索・保存
 */

import type { Comment } from './types';

export interface TagSearchResult {
  tag: {
    id: string;
    target: string;
    tag: string;
    girlsvip_category: string | null;
    matomeblade_category: string | null;
    thumbnail_url: string | null;
    is_original: boolean;
  } | null;
  categoryFallback: {
    id: string;
    thumbnail_url: string | null;
    is_original: boolean;
  } | null;
}

export interface TagRegistrationCandidate {
  tag: string;
  category: string;
  confidence: number;
  reason: string;
  source: 'llm';
}

const GENERIC_TAG_WORDS = new Set([
  'ニュース', '話題', '最新ニュース', '最新情報', '反応', '炎上', '朗報', '悲報',
  '画像', '動画', '写真', 'スレ', 'まとめ', '記事', 'コメント', 'ネット',
  'これ', 'それ', 'あれ', '自分', '相手', 'みんな', '女', '男', '人', '子供',
  '大人', '友達', '彼氏', '彼女', '旦那', '嫁', '妻', '夫', '母', '父', '親',
  '会社', '学校', '職場', '家', '店', '病院', '芸能人', '選手', '政治家',
  '日本', '海外', '世界', '社会', '生活', '雑談', '事件', '事故',
]);

const AUTO_REGISTER_BLOCKED_CATEGORIES = new Set([
  '政治系',
  '事件・事故',
  '事件事故',
  'アダルト',
  '差別・ヘイト',
  '差別',
  'ヘイト',
  'その他',
]);

const AUTO_REGISTER_BLOCKED_CONTENT_PATTERNS = [
  /政治|政党|選挙|国会|首相|総理|大臣|議員|自民党|立憲|維新|公明党|共産党|国民民主|れいわ|参政党/,
  /事件|事故|逮捕|容疑者|殺人|強盗|窃盗|暴行|傷害|死亡|死去|遺体|裁判|起訴/,
  /AV女優|av女優|風俗|ソープ|デリヘル|エロ|セックス|オナニー|フェラ|中出し|おっぱい|巨乳|全裸/,
  /差別|ヘイト|在日|朝鮮|韓国人|中国人|ガイジ|池沼/,
];

const TAG_ALLOWED_PATTERN = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9０-９Ａ-Ｚａ-ｚー・･＆&.\-\s]+$/u;

/**
 * 記事タイトルでタグを検索し、キャッシュ済みサムネイルを取得
 */
export async function searchTagByTitle(title: string): Promise<TagSearchResult | null> {
  try {
    const response = await fetch(`/api/proxy/tagSearch?title=${encodeURIComponent(title)}`);
    if (!response.ok) return null;
    return await response.json() as TagSearchResult;
  } catch (error) {
    console.warn('タグ検索エラー:', error);
    return null;
  }
}

/**
 * タグにサムネイルURLを保存（次回以降の使い回し用）
 */
export async function saveThumbnailToTag(tagId: string, thumbnailUrl: string): Promise<void> {
  try {
    await fetch('/api/proxy/tagThumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId, thumbnailUrl }),
    });
  } catch (error) {
    console.warn('サムネイルキャッシュ保存エラー:', error);
  }
}

/**
 * 記事タイトルからキーワードを抽出
 * 固有名詞（人名・地名・組織名）のみを抽出。一般名詞や文章は除外。
 * 精度が低いため、抽出結果は厳格にフィルタリング。
 */
export function extractKeywordFromTitle(title: string): string {
  // 【悲報】【朗報】などの装飾を除去
  const cleaned = title.replace(/【.*?】/g, '').replace(/§\s*/g, '').trim();

  // 「〜が」「〜は」「〜って」で区切って最初の主語を取る
  const match = cleaned.match(/^(.+?)[がはって、]/);
  const candidate = match ? match[1].trim() : '';

  // バリデーション: タグとして不適切なものを除外
  if (!candidate || candidate.length < 2 || candidate.length > 10) return '';

  // 日付パターンを除外
  if (/\d+月|\d+日|今日|明日|昨日|今週|来週|今年|去年/.test(candidate)) return '';

  // 一般的すぎる単語を除外
  const genericWords = [
    '自分', '相手', 'みんな', '女', '男', '人', '子供', '大人', '友達',
    '彼氏', '彼女', '旦那', '嫁', '妻', '夫', '母', '父', '親',
    '私', '俺', 'あなた', 'うち', 'こっち', 'そっち', 'あっち',
    '会社', '学校', '職場', '家', '店', '病院',
    '最近', '今', '昔', 'もう', 'まだ', 'ずっと', 'やっぱり',
    '結局', '本当', '正直', '普通', 'マジ', 'ガチ',
  ];
  if (genericWords.includes(candidate)) return '';

  // ひらがなのみは除外（一般的すぎる）
  if (/^[ぁ-ん]+$/.test(candidate)) return '';

  // 助詞や助動詞で終わるものは除外
  if (/[のだよねなかたてでもけどし好的]$/.test(candidate)) return '';

  // 記号を含むものは除外
  if (/[「」『』（）()！!？?…♪〜～]/.test(candidate)) return '';

  return candidate;
}

function normalizeForTagMatch(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　「」『』【】（）()［］\[\]<>＜＞・･、。，．!！?？:：;；'"“”‘’`´〜～…]/g, '');
}

function cleanTagCandidate(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .replace(/[「」『』【】（）()［］\[\]<>＜＞]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isGenericTag(tag: string): boolean {
  if (GENERIC_TAG_WORDS.has(tag)) return true;
  if (/^(この|その|あの|例の|某|元|現|新|旧)/.test(tag) && tag.length <= 4) return true;
  if (/^[ぁ-ん]+$/.test(tag)) return true;
  if (/^\d+$/.test(tag)) return true;
  if (/さん$/.test(tag) && tag.length <= 5) return true;
  return false;
}

function isTagPresentInSource(tag: string, title: string, firstCommentBody: string): boolean {
  const normalizedTag = normalizeForTagMatch(tag);
  if (!normalizedTag) return false;
  const normalizedSource = normalizeForTagMatch(`${title}\n${firstCommentBody}`);
  return normalizedSource.includes(normalizedTag);
}

function isBlockedForAutoRegistration(category: string, title: string, firstCommentBody: string): boolean {
  if (AUTO_REGISTER_BLOCKED_CATEGORIES.has(category)) return true;
  const text = `${title}\n${firstCommentBody}`;
  return AUTO_REGISTER_BLOCKED_CONTENT_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateTagRegistrationCandidate(
  candidate: Omit<TagRegistrationCandidate, 'source'> | null,
  title: string,
  firstCommentBody: string
): TagRegistrationCandidate | null {
  if (!candidate) return null;

  const tag = cleanTagCandidate(candidate.tag);
  const category = cleanTagCandidate(candidate.category);
  const confidence = typeof candidate.confidence === 'number' ? candidate.confidence : 0;
  const reason = typeof candidate.reason === 'string' ? candidate.reason.trim() : '';

  if (!tag || tag.length < 2 || tag.length > 24) return null;
  if (!TAG_ALLOWED_PATTERN.test(tag)) return null;
  if (isGenericTag(tag)) return null;
  if (confidence < 0.82) return null;
  if (!isTagPresentInSource(tag, title, firstCommentBody)) return null;
  if (isBlockedForAutoRegistration(category, title, firstCommentBody)) return null;

  return {
    tag,
    category,
    confidence,
    reason,
    source: 'llm',
  };
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] || text;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function suggestTagRegistrationCandidate(
  geminiApiKey: string,
  title: string,
  comments: Comment[]
): Promise<TagRegistrationCandidate | null> {
  if (!geminiApiKey) return null;

  const firstCommentBody = comments[0]?.body || '';
  const prompt = `まとめブログ用のサムネイル再利用タグ候補を1つだけJSONで返してください。

目的:
- サムネイルを再利用しやすい「固有名詞タグ」だけを登録したい
- 芸能人名、スポーツ選手名、番組名、作品名、チーム名、企業名、商品名などが候補

厳守:
- タグ候補は「タイトル」または「レス1本文」に実際に出ている文字列だけ
- 朗報、悲報、炎上、ニュース、話題、反応、画像、動画、芸能人、選手などの汎用語は禁止
- 政治、事件事故、アダルト、差別・ヘイト寄りは自動登録しない
- 不明なら tag は空文字、confidence は 0
- JSON以外は出力しない

返却形式:
{"tag":"", "category":"芸能系|スポーツ系|TV・映画・サブスク系|ゲーム・ホビー・IT|生活・雑談|政治系|事件・事故|アダルト|差別・ヘイト|その他", "confidence":0, "reason":""}

タイトル:
${title}

レス1本文:
${firstCommentBody.slice(0, 1200)}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn('タグ候補抽出API失敗:', response.status);
      return null;
    }

    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const parsed = extractJsonObject(text) as Partial<Omit<TagRegistrationCandidate, 'source'>> | null;
    if (!parsed) return null;

    return validateTagRegistrationCandidate({
      tag: typeof parsed.tag === 'string' ? parsed.tag : '',
      category: typeof parsed.category === 'string' ? parsed.category : '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    }, title, firstCommentBody);
  } catch (error) {
    console.warn('タグ候補抽出エラー:', error);
    return null;
  }
}

/**
 * 新しいタグを自動登録（タグ不一致時にキーワードを抽出して登録）
 */
export async function registerNewTag(
  target: string,
  tag: string,
  thumbnailUrl?: string
): Promise<{ id: string } | null> {
  try {
    const response = await fetch('/api/proxy/tagRegister', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target,
        tag,
        thumbnail_url: thumbnailUrl || null,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { success?: boolean; tag?: { id: string } };
    return data.tag || null;
  } catch (error) {
    console.warn('タグ自動登録エラー:', error);
    return null;
  }
}
