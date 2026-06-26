import { Comment } from './types';

// カラーパレット（CLAUDE.mdと同じ）
export const COLOR_PALETTE = [
  '#ef4444', // 1: 赤
  '#3b82f6', // 2: 青
  '#a855f7', // 3: 紫
  '#22c55e', // 4: 緑
  '#ec4899', // 5: ピンク
  '#f97316', // 6: オレンジ
  '#eab308', // 7: 黄色
  '#06b6d4', // 8: シアン
  '#64748b', // 9: グレー
  '#000000', // 0: 黒
] as const;

// AIまとめのレスポンス型
export interface AISummarizeResponse {
  selected_posts: {
    post_number: number;
    decorations: {
      color: string | null; // カラーコード or null
      size_boost: 'large' | 'small' | null;
    };
    reason: string;
  }[];
}

export type AISummarizeProvider = 'claude' | 'ollama';

export interface LocalOllamaOptions {
  endpoint?: string;
  model?: string;
}

const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'gemma4:e4b';

// アダルト/エロ系コンテンツを検出
export function isAdultContent(title: string, comments: Comment[]): { isAdult: boolean; reason: string } {
  // タイトルとコメント本文を結合
  const allText = [title, ...comments.slice(0, 50).map(c => c.body)].join(' ').toLowerCase();

  // 明らかなアダルトキーワード（直接的な性的表現のみ、一般会話でヒットしやすい語は除外）
  const explicitKeywords = [
    'セックス', 'せっくす', 'sex',
    'オナニー', 'おなにー', 'オナ二ー',
    '手コキ', '手こき', 'てこき',
    'フェラ', 'ふぇら',
    'パイズリ', 'ぱいずり',
    '中出し', 'なかだし',
    '潮吹き', 'しおふき',
    '乱交', 'らんこう',
    '3P', '３P', '3p',
    'AV女優', 'av女優',
    '風俗', 'ソープ', 'デリヘル', 'ヘルス',
    'エロ動画', 'エロ画像', 'エロ漫画',
    '巨乳', '爆乳',
    'おっぱい', 'オッパイ',
    'ちんこ', 'チンコ', 'ちんぽ', 'チンポ',
    'まんこ', 'マンコ',
    '勃起', 'ぼっき',
    '射精', 'しゃせい',
    '精子', 'ザーメン',
    '挿入', 'そうにゅう',
    'ハメ撮り', 'はめどり',
    '童貞卒業', '処女喪失',
    'やりまん', 'ヤリマン',
    '全裸', 'ぜんら',
  ];

  // スレッドタイトルに直接的なキーワードがある場合
  const titleLower = title.toLowerCase();
  for (const keyword of explicitKeywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      return { isAdult: true, reason: `タイトルにアダルトキーワード「${keyword}」を検出` };
    }
  }

  // コメント内のキーワード出現回数をカウント
  let keywordCount = 0;
  const foundKeywords: string[] = [];
  for (const keyword of explicitKeywords) {
    const regex = new RegExp(keyword, 'gi');
    const matches = allText.match(regex);
    if (matches) {
      keywordCount += matches.length;
      if (!foundKeywords.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
  }

  // 複数のアダルトキーワードが頻出する場合（10回以上、または5種類以上）
  if (keywordCount >= 10 || foundKeywords.length >= 5) {
    return {
      isAdult: true,
      reason: `アダルトキーワードを${keywordCount}回検出（${foundKeywords.slice(0, 3).join('、')}など）`
    };
  }

  return { isAdult: false, reason: '' };
}

// キーワードスパムを検出（同じ単語の繰り返し）
export function isKeywordSpam(text: string): boolean {
  // 本文が短すぎる場合はスパムではない
  if (text.length < 50) return false;

  // 日本語の単語を抽出（2文字以上の連続したひらがな/カタカナ/漢字）
  const words = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{2,}/g) || [];
  if (words.length < 10) return false; // 単語数が少なすぎる場合は判定不可

  // 単語の出現回数をカウント
  const wordCount: Record<string, number> = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }

  // ユニークな単語の数
  const uniqueWords = Object.keys(wordCount).length;

  // 3回以上繰り返される単語の数
  const repeatedWords = Object.values(wordCount).filter(count => count >= 3).length;

  // スパム判定条件:
  // 1. ユニーク率が低い（全単語の30%未満がユニーク）
  const uniqueRatio = uniqueWords / words.length;
  // 2. 繰り返し単語が多い（ユニーク単語の50%以上が3回以上繰り返し）
  const repeatRatio = repeatedWords / uniqueWords;

  // どちらかの条件を満たせばスパム
  if (uniqueRatio < 0.3 || repeatRatio > 0.5) {
    console.log(`🚫 キーワードスパム検出: ユニーク率=${(uniqueRatio * 100).toFixed(1)}%, 繰り返し率=${(repeatRatio * 100).toFixed(1)}%`);
    return true;
  }

  return false;
}

const EXPLICIT_DISCRIMINATORY_TERMS = [
  'ガイジ',
  'がいじ',
  '池沼',
  '知恵遅れ',
  '障がい者',
  '障碍者',
  'キチガイ',
  'きちがい',
  'チョン',
  'チャンコロ',
  '支那人',
  'クロンボ',
  '土人',
  '穢多',
  '非人',
  '部落民',
  'ホモ野郎',
  'オカマ野郎',
  '低学歴',
  '高卒馬鹿',
  '高卒バカ',
  '中卒馬鹿',
  '中卒バカ',
  '落ちこぼれ',
  'チー牛',
  '弱者男性',
  '弱者女性',
  '女さん',
  '男さん',
  'まんさん',
  'まんの人',
  '発達カット',
  '発達顔',
  '発達系',
  '発達っぽい',
];

const PROTECTED_GROUP_TERMS = [
  '韓国人',
  '中国人',
  '日本人',
  '外国人',
  '黒人',
  '白人',
  '在日',
  '移民',
  '女',
  '男',
  '障害者',
  '発達障害',
  '精神障害',
  'lgbt',
  'ゲイ',
  'レズ',
  'トランス',
  '高卒',
  '中卒',
  '大卒',
  '低学歴',
  '老人',
  '年寄り',
  '貧乏人',
  '貧困層',
  '弱者男性',
  '弱者女性',
  'デブ',
  'ブス',
  '障がい者',
  '障碍者',
  'ヘルプマーク',
  '自衛隊',
  '自衛隊員',
  '公務員',
];

const HOSTILE_WORDS = [
  '死ね',
  '消えろ',
  '出て行け',
  '出てけ',
  'いらない',
  '劣等',
  '下等',
  '害悪',
  'ゴミ',
  '馬鹿',
  'バカ',
  '無能',
  '頭悪い',
  '落ちこぼれ',
  '失敗作',
  'ボロクソ',
  'ブチギレ',
  'クソ',
  'キモい',
  'きもい',
  '汚い',
  '臭い',
  '犯罪者',
  '駆除',
  '多すぎ',
];

const SEVERE_HOSTILE_WORDS = [
  '死ね',
  '消えろ',
  '出て行け',
  '出てけ',
  '駆除',
  '犯罪者',
  '害悪',
  '下等',
  '劣等',
];

const LOW_QUALITY_SPAM_TERMS = [
  '在日',
  '特権',
  '朝鮮',
  '韓国',
  'korea',
  'fuckkorea',
  '朝鮮犬',
  '占領軍',
  'プレスコード',
  '共産党',
  '東京新聞',
  '中日新聞',
  'aera',
  'd4p',
  '神原',
  '金井',
  '金英功',
  'ミサイル',
  'レイプ民族',
  'くそ弁護士',
  'npo学会',
];

const LOW_QUALITY_HOSTILE_TERMS = [
  ...HOSTILE_WORDS,
  ...SEVERE_HOSTILE_WORDS,
  'fuck',
  'くそ',
  'クソ',
  'レイプ',
  '射殺',
  '犬',
  '犯罪',
  '妄想',
  '批判できない',
];

const LOW_QUALITY_GROUP_TERMS = [
  ...PROTECTED_GROUP_TERMS,
  '朝鮮',
  '韓国',
  'korea',
  '在日',
  '民族',
];

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskTermToInitial(term: string): string {
  return Array.from(term)[0] || '';
}

function includesNormalized(normalized: string, term: string): boolean {
  return normalized.includes(term.toLowerCase());
}

function getDiscriminatorySignals(text: string): {
  normalized: string;
  explicitCount: number;
  hasProtectedGroup: boolean;
  hasHostileWord: boolean;
  hasSevereHostileWord: boolean;
} {
  const normalized = sanitizeText(text)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '');

  return {
    normalized,
    explicitCount: EXPLICIT_DISCRIMINATORY_TERMS.filter((term) => includesNormalized(normalized, term)).length,
    hasProtectedGroup: PROTECTED_GROUP_TERMS.some((group) => includesNormalized(normalized, group)),
    hasHostileWord: HOSTILE_WORDS.some((word) => includesNormalized(normalized, word)),
    hasSevereHostileWord: SEVERE_HOSTILE_WORDS.some((word) => includesNormalized(normalized, word)),
  };
}

// 差別的・ヘイト的なレスを検出
export function isDiscriminatoryContent(text: string): boolean {
  const signals = getDiscriminatorySignals(text);

  if (!signals.normalized) return false;

  if (signals.explicitCount > 0) {
    return true;
  }

  return signals.hasProtectedGroup && signals.hasHostileWord;
}

export function isSevereDiscriminatoryContent(text: string): boolean {
  const signals = getDiscriminatorySignals(text);
  if (!signals.normalized) return false;

  if (signals.explicitCount >= 2) return true;
  if (signals.explicitCount >= 1 && signals.hasSevereHostileWord) return true;
  if (signals.hasProtectedGroup && signals.hasSevereHostileWord) return true;

  return false;
}

export function sanitizeDiscriminatoryContentForPublishing(text: string): string {
  let sanitized = sanitizeText(text);

  for (const term of EXPLICIT_DISCRIMINATORY_TERMS) {
    sanitized = sanitized.replace(new RegExp(escapeRegExp(term), 'gi'), maskTermToInitial(term));
  }

  const signals = getDiscriminatorySignals(sanitized);

  if (signals.hasProtectedGroup && signals.hasHostileWord) {
    for (const word of HOSTILE_WORDS) {
      sanitized = sanitized.replace(new RegExp(escapeRegExp(word), 'gi'), maskTermToInitial(word));
    }
  }

  return sanitized;
}

function countIncludedTerms(normalized: string, terms: string[]): number {
  const uniqueTerms = new Set(terms.map((term) => term.toLowerCase()));
  let count = 0;
  for (const term of uniqueTerms) {
    if (term && normalized.includes(term)) count++;
  }
  return count;
}

export function isLowQualitySpamCommentText(text: string): boolean {
  const cleaned = sanitizeText(text).normalize('NFKC').trim();
  if (cleaned.length < 20) return false;

  const normalized = cleaned.toLowerCase().replace(/\s+/g, '');
  const spamHits = countIncludedTerms(normalized, LOW_QUALITY_SPAM_TERMS);
  const hostileHits = countIncludedTerms(normalized, LOW_QUALITY_HOSTILE_TERMS);
  const groupHits = countIncludedTerms(normalized, LOW_QUALITY_GROUP_TERMS);
  const hasHangul = /[\uac00-\ud7af]/.test(cleaned);
  const hasKnownBadPhrase = /(fuck\s*korea|fuckkorea|レイプ民族|朝鮮犬|くそ在日特権)/i.test(cleaned);
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const punctuationCount = (cleaned.match(/[。！？!?、,.]/g) || []).length;
  const looksLikeKeywordSalad = tokens.length >= 8 && punctuationCount <= 1;

  if (hasKnownBadPhrase) return true;
  if (hasHangul && spamHits >= 2 && (hostileHits >= 1 || groupHits >= 1)) return true;
  if (spamHits >= 6 && hostileHits >= 2) return true;
  if (groupHits >= 2 && hostileHits >= 2 && spamHits >= 4) return true;
  if (looksLikeKeywordSalad && spamHits >= 5 && (hostileHits >= 1 || groupHits >= 1)) return true;

  return false;
}

export function filterLowQualitySpamComments<T extends { body: string; res_id?: string | number }>(
  comments: T[]
): { keptComments: T[]; removedComments: T[] } {
  const keptComments: T[] = [];
  const removedComments: T[] = [];

  for (const comment of comments) {
    if (isLowQualitySpamCommentText(comment.body)) {
      removedComments.push(comment);
    } else {
      keptComments.push(comment);
    }
  }

  return { keptComments, removedComments };
}

// アンカー（>>数字）を抽出（全角・半角両対応）
function extractAnchors(text: string): number[] {
  const anchors: number[] = [];

  // 半角 >> と数字
  const halfWidthMatches = text.match(/>>(\d+)/g);
  if (halfWidthMatches) {
    for (const match of halfWidthMatches) {
      const num = parseInt(match.replace('>>', ''));
      if (!isNaN(num) && num > 0) anchors.push(num);
    }
  }

  // 全角 ＞＞ と数字（全角・半角両方）
  const fullWidthMatches = text.match(/＞＞([０-９\d]+)/g);
  if (fullWidthMatches) {
    for (const match of fullWidthMatches) {
      // 全角数字を半角に変換
      const numStr = match.replace('＞＞', '').replace(/[０-９]/g, (c) =>
        String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
      );
      const num = parseInt(numStr);
      if (!isNaN(num) && num > 0) anchors.push(num);
    }
  }

  // 重複を除去
  return [...new Set(anchors)];
}

// 不正なUnicode文字（孤立サロゲート）を除去
function sanitizeText(text: string): string {
  // 文字列を1文字ずつチェックして、孤立サロゲートを除去
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    // 高サロゲート（U+D800-U+DBFF）
    if (code >= 0xD800 && code <= 0xDBFF) {
      // 次の文字が低サロゲートかチェック
      if (i + 1 < text.length) {
        const nextCode = text.charCodeAt(i + 1);
        if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
          // 正しいサロゲートペア - 両方追加
          result += text[i] + text[i + 1];
          i++; // 次の文字をスキップ
          continue;
        }
      }
      // 孤立した高サロゲート - スキップ
      continue;
    }

    // 低サロゲート（U+DC00-U+DFFF）が単独で出現
    if (code >= 0xDC00 && code <= 0xDFFF) {
      // 孤立した低サロゲート - スキップ
      continue;
    }

    // 通常の文字
    result += text[i];
  }
  return result;
}

// プロンプト生成（軽量版：トークン削減のため簡潔に）
function getSummaryTargetCount(totalPosts: number): number {
  if (totalPosts <= 100) {
    return Math.min(totalPosts, Math.max(18, Math.round(totalPosts * 0.28)));
  }
  if (totalPosts <= 300) {
    return Math.round(28 + ((totalPosts - 100) / 200) * 17);
  }
  if (totalPosts <= 600) {
    return Math.round(45 + ((totalPosts - 300) / 300) * 15);
  }
  if (totalPosts <= 1000) {
    return Math.round(60 + ((totalPosts - 600) / 400) * 20);
  }
  return 80;
}

function getSummarySelectionRange(totalPosts: number): string {
  const target = getSummaryTargetCount(totalPosts);
  const min = Math.max(12, Math.round(target * 0.85));
  const max = Math.min(90, Math.round(target * 1.15));
  return `${min}〜${max}`;
}

export function buildAISummarizePrompt(title: string, comments: Comment[]): string {
  const totalPosts = comments.length;

  // スレ主のレス番号を特定
  const ownerPostNumbers: number[] = [];
  comments.forEach((comment, index) => {
    if (comment.is_talk_owner) {
      ownerPostNumbers.push(index + 1);
    }
  });

  // レス数に応じて本文の最大文字数を調整
  // 1000レス: 100文字、500レス: 200文字、100レス以下: 制限なし
  const maxBodyLength = totalPosts > 500 ? 100 : totalPosts > 100 ? 200 : 1000;

  const selectionRange = getSummarySelectionRange(totalPosts);

  // タイトルもサニタイズ
  const sanitizedTitle = sanitizeText(title);

  // コメント本文を簡潔に（レス番号と本文のみ、スレ主マーク付き）
  const postsText = comments
    .map((comment, index) => {
      const postNum = index + 1;
      const ownerMark = comment.is_talk_owner ? '[主]' : '';
      // 本文をサニタイズして切り詰め
      const sanitized = sanitizeText(comment.body);
      const body = sanitized.length > maxBodyLength
        ? sanitized.slice(0, maxBodyLength) + '…'
        : sanitized;
      return `${postNum}${ownerMark}: ${body}`;
    })
    .join('\n');

  // プロンプト全体を生成
  const rawPrompt = `以下のスレッドから、面白くまとめるために最適なレスを選択してください。

タイトル: ${sanitizedTitle}
レス数: ${totalPosts}件

【レス一覧】
${postsText}

【選択ルール】
- 必ず${selectionRange}個のレスを選択してください（重要：全部選ばないでください）
- 面白い、印象的、重要なレスのみを厳選してください
- ストーリーの流れが分かるように選んでください
- レス1、最初の反応、共感、反論、ツッコミ、体験談、意外な視点、短い笑いどころ、オチをできるだけ揃えてください
- 面白さを優先し、必要なら少し多めに選んでください
- レス1は必ず含めてください（スレの前提として重要です）
- スレ主[主]のレスは優先的に選んでください
- 10文字未満の短いレスは選ばないでください（「あ」「草」など）
- 差別的、ヘイト的、属性への攻撃を含むレスは選ばないでください
- 意味不明な政治・民族・メディア名・団体名・暴言の羅列、韓国語/英語混じりのヘイトスパム、単語の詰め込みは選ばないでください
- アンカー（>>数字）付きレスを選ぶ場合、参照先も重要なら選んでください

【色の使用ルール】
- 使用できる色: "red", "blue", "green", "pink", "orange", "purple", null
- 紫色(purple)はスレ主専用です
- 連続するレスに同じ色を付けないでください
- 色なし(null)を積極的に使ってください（50%程度）

【サイズルール】
- "large": 短くてインパクトのあるレスのみ（50文字以内、2〜4個）
- null: 通常（デフォルト）
- "small": 補足的なレス（使用は控えめに）

以下のJSON形式で返答してください：
{"selected_posts":[{"post_number":2,"decorations":{"color":"blue","size_boost":null},"reason":"理由"}]}

JSONのみを返してください。説明文は不要です。`;

  // 最終的にもう一度サニタイズして返す
  return sanitizeText(rawPrompt);
}

function buildLocalOllamaCandidateEntries(comments: Comment[]): { comment: Comment; originalPostNumber: number }[] {
  const totalPosts = comments.length;
  if (totalPosts <= 450) {
    return comments.map((comment, index) => ({ comment, originalPostNumber: index + 1 }));
  }

  const replyCount = new Map<number, number>();
  comments.forEach((comment) => {
    for (const anchor of extractAnchors(comment.body)) {
      replyCount.set(anchor, (replyCount.get(anchor) || 0) + 1);
    }
  });

  const scored = comments.map((comment, index) => {
    const postNumber = index + 1;
    const body = sanitizeText(comment.body).replace(/\s+/g, ' ').trim();
    const length = body.length;
    const anchorCount = extractAnchors(body).length;
    const replies = replyCount.get(postNumber) || 0;

    let score = 0;
    if (postNumber === 1) score += 1000;
    if (postNumber <= 80) score += 70 - Math.floor(postNumber / 2);
    if (comment.is_talk_owner) score += 80;
    score += Math.min(replies * 18, 160);
    score += Math.min(anchorCount * 12, 60);
    if (/https?:\/\//i.test(body)) score += 18;
    if (/[!?！？ｗw笑草]/.test(body)) score += 10;
    if (length >= 20 && length <= 240) score += 22;
    if (length > 500) score -= 20;
    if (isSevereDiscriminatoryContent(body)) score -= 300;
    if (isKeywordSpam(body)) score -= 80;

    return { comment, originalPostNumber: postNumber, score };
  });

  const maxCandidates = totalPosts > 800 ? 360 : 400;
  const selected = new Map<number, { comment: Comment; originalPostNumber: number }>();

  for (const item of scored.slice(0, 80)) {
    selected.set(item.originalPostNumber, item);
  }

  for (const item of [...scored].sort((a, b) => b.score - a.score)) {
    selected.set(item.originalPostNumber, item);
    for (const anchor of extractAnchors(item.comment.body)) {
      const anchorComment = comments[anchor - 1];
      if (anchorComment) {
        selected.set(anchor, { comment: anchorComment, originalPostNumber: anchor });
      }
    }
    if (selected.size >= maxCandidates) break;
  }

  return [...selected.values()].sort((a, b) => a.originalPostNumber - b.originalPostNumber);
}

function buildLocalOllamaSummarizePrompt(title: string, comments: Comment[]): string {
  const totalPosts = comments.length;
  const targetCount = getSummaryTargetCount(totalPosts);
  const candidateEntries = buildLocalOllamaCandidateEntries(comments);
  const maxBodyLength = candidateEntries.length > 300 ? 70 : totalPosts > 100 ? 120 : 220;
  const sanitizedTitle = sanitizeText(title);

  const postsText = candidateEntries
    .map(({ comment, originalPostNumber }) => {
      const ownerMark = comment.is_talk_owner ? '[主]' : '';
      const sanitized = sanitizeText(comment.body).replace(/\s+/g, ' ').trim();
      const body = sanitized.length > maxBodyLength
        ? sanitized.slice(0, maxBodyLength) + '…'
        : sanitized;
      return `${originalPostNumber}${ownerMark}: ${body}`;
    })
    .join('\n');

  return sanitizeText(`掲示板まとめ記事に使うレス番号だけを選んでください。

タイトル: ${sanitizedTitle}
レス数: ${totalPosts}件
候補レス数: ${candidateEntries.length}件（番号は元スレのレス番号）

【レス一覧】
${postsText}

【選択ルール】
- ${targetCount}個前後のレス番号を選ぶ
- レス1は必ず選ぶ（スレの前提として重要）
- 短すぎるレス、重複、単なる相槌は避ける
- 流れが分かるレス、面白いレス、質問への返答、スレ主[主]のレスを優先
- レス1、最初の反応、共感、反論、ツッコミ、体験談、意外な視点、短い笑いどころ、オチをできるだけ揃える
- 面白さを優先し、迷ったら少し多めに選ぶ
- 差別的、ヘイト的、属性への攻撃を含むレスは選ばない
- 意味不明な政治・民族・メディア名・団体名・暴言の羅列、韓国語/英語混じりのヘイトスパム、単語の詰め込みは選ばない
- アンカー付きレスを選ぶ場合、必要なら参照先も選ぶ

【出力形式】
{"selected_posts":[2,5,9,12]}

JSONだけを返してください。説明文、理由、Markdownは禁止です。`);
}

// 色名をカラーコードに変換
const COLOR_NAME_MAP: Record<string, string> = {
  'red': '#ef4444',
  'blue': '#3b82f6',
  'green': '#22c55e',
  'purple': '#a855f7',
  'pink': '#ec4899',
  'orange': '#f97316',
  'yellow': '#eab308',
  'cyan': '#06b6d4',
  'gray': '#64748b',
  'grey': '#64748b',
};

function normalizeColor(color: string | null | undefined): string | null {
  // null, undefined, 空文字列の場合はnullを返す
  if (color === null || color === undefined || color === '') return null;
  // 文字列でない場合もnullを返す
  if (typeof color !== 'string') return null;
  // すでにカラーコードならそのまま
  if (color.startsWith('#')) return color;
  // 色名ならカラーコードに変換
  return COLOR_NAME_MAP[color.toLowerCase()] || null;
}

// AIレスポンスを強化（レス1追加、アンカー先追加など）
export function enhanceAIResponse(
  aiResponse: AISummarizeResponse,
  comments: Comment[]
): AISummarizeResponse {
  let selectedPosts = [...aiResponse.selected_posts];
  const totalPosts = comments.length;

  // 置換でフォローしきれない強い差別・ヘイトだけ除外
  selectedPosts = selectedPosts.filter(post => {
    const comment = comments[post.post_number - 1];
    if (!comment) return false;
    if (isSevereDiscriminatoryContent(comment.body)) {
      console.log(`🚫 強い差別・ヘイトレスを除外: ${post.post_number}`);
      return false;
    }
    return true;
  });

  // 意味不明な政治・民族・暴言の単語羅列を除外（レス1は除く）
  selectedPosts = selectedPosts.filter(post => {
    if (post.post_number === 1) return true;
    const comment = comments[post.post_number - 1];
    if (!comment) return false;
    if (isLowQualitySpamCommentText(comment.body)) {
      console.log(`🚫 低品質スパムレスを除外: ${post.post_number}`);
      return false;
    }
    return true;
  });

  // キーワードスパムを除外（レス1は除く）
  selectedPosts = selectedPosts.filter(post => {
    if (post.post_number === 1) return true; // レス1は除外しない
    const comment = comments[post.post_number - 1];
    if (!comment) return false;
    if (isKeywordSpam(comment.body)) {
      console.log(`🚫 スパムレスを除外: ${post.post_number}`);
      return false;
    }
    return true;
  });

  // 短すぎるレス（10文字未満）を除外（レス1とアンカー参照元は除く）
  const MIN_BODY_LENGTH = 10;
  selectedPosts = selectedPosts.filter(post => {
    if (post.post_number === 1) return true; // レス1は除外しない
    const comment = comments[post.post_number - 1];
    if (!comment) return false;
    // 本文からアンカー(>>数字)を除いた文字数をカウント
    const bodyWithoutAnchors = comment.body.replace(/>>(\d+)/g, '').trim();
    if (bodyWithoutAnchors.length < MIN_BODY_LENGTH) {
      console.log(`⚠️ 短いレスを除外: ${post.post_number}「${bodyWithoutAnchors.substring(0, 20)}」(${bodyWithoutAnchors.length}文字)`);
      return false;
    }
    return true;
  });

  // AIが全レスを選択した場合のみ制限（50%以上選択 = 全選択とみなす）
  // 50%以下になるように間引く
  const selectionRatio = selectedPosts.length / totalPosts;
  if (selectionRatio > 0.5) {
    const targetCount = Math.floor(totalPosts * 0.49);
    console.warn(`⚠️ AIが${selectedPosts.length}/${totalPosts}個（${Math.round(selectionRatio * 100)}%）選択 → ${targetCount}個に間引き`);
    // 均等に間引く
    const step = selectedPosts.length / targetCount;
    const filtered: typeof selectedPosts = [];
    for (let i = 0; i < targetCount; i++) {
      const index = Math.min(Math.floor(i * step), selectedPosts.length - 1);
      if (!filtered.some(p => p.post_number === selectedPosts[index].post_number)) {
        filtered.push(selectedPosts[index]);
      }
    }
    selectedPosts = filtered;
  }

  // 長いレス（50文字以上）にlargeサイズを付けない
  const MAX_LARGE_BODY_LENGTH = 50;
  for (const post of selectedPosts) {
    if (post.decorations.size_boost === 'large') {
      const comment = comments[post.post_number - 1];
      if (comment) {
        const bodyWithoutAnchors = comment.body.replace(/>>(\d+)/g, '').trim();
        if (bodyWithoutAnchors.length > MAX_LARGE_BODY_LENGTH) {
          console.log(`⚠️ 長いレスのlargeを解除: ${post.post_number}(${bodyWithoutAnchors.length}文字)`);
          post.decorations.size_boost = null;
        }
      }
    }
  }

  const selectedNumbers = new Set(selectedPosts.map(p => p.post_number));

  // 色名をカラーコードに正規化
  for (const post of selectedPosts) {
    post.decorations.color = normalizeColor(post.decorations.color);
  }

  // レス1を追加（なければ）
  const firstComment = comments[0];
  if (!selectedNumbers.has(1) && firstComment) {
    selectedPosts.unshift({
      post_number: 1,
      decorations: { color: '#ef4444', size_boost: null },
      reason: 'スレ立て（自動追加）'
    });
    selectedNumbers.add(1);
  } else {
    // レス1があれば赤色に設定
    const post1 = selectedPosts.find(p => p.post_number === 1);
    if (post1) {
      post1.decorations.color = '#ef4444';
    }
  }

  // アンカー先を再帰的に追加（最大3階層）
  const addAnchorTargets = (depth: number = 0) => {
    if (depth >= 3) return;

    const newPosts: typeof selectedPosts = [];

    for (const post of selectedPosts) {
      const comment = comments[post.post_number - 1];
      if (!comment) continue;

      // >>数字 のパターンを検出（全角・半角両対応）
      const anchorNums = extractAnchors(comment.body);
      for (const targetNum of anchorNums) {
        const targetComment = comments[targetNum - 1];
        if (
          targetNum > 0 &&
          targetNum <= totalPosts &&
          !selectedNumbers.has(targetNum) &&
          targetComment &&
          !isSevereDiscriminatoryContent(targetComment.body) &&
          !isLowQualitySpamCommentText(targetComment.body)
        ) {
          console.log(`🔗 アンカー先追加: >>${targetNum} (参照元: ${post.post_number})`);
          newPosts.push({
            post_number: targetNum,
            decorations: { color: null, size_boost: null },
            reason: `アンカー先（>>から自動追加）`
          });
          selectedNumbers.add(targetNum);
        }
      }
    }

    if (newPosts.length > 0) {
      selectedPosts.push(...newPosts);
      addAnchorTargets(depth + 1);
    }
  };

  addAnchorTargets();

  // 後方参照を追加（選択済みレスを参照しているレス）
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    const postNum = i + 1;

    if (selectedNumbers.has(postNum)) continue;

    // 全角・半角両対応でアンカーを検出
    const anchorNums = extractAnchors(comment.body);
    for (const targetNum of anchorNums) {
      if (
        selectedNumbers.has(targetNum) &&
        !isSevereDiscriminatoryContent(comment.body) &&
        !isLowQualitySpamCommentText(comment.body)
      ) {
        console.log(`🔗 後方参照追加: ${postNum} (参照先: >>${targetNum})`);
        selectedPosts.push({
          post_number: postNum,
          decorations: { color: null, size_boost: null },
          reason: `後方参照（自動追加）`
        });
        selectedNumbers.add(postNum);
        break;
      }
    }
  }

  // 読者の読み疲れ防止。アンカー補完で増えすぎても目標数の少し上で止める。
  const MAX_SELECTED_POSTS = Math.min(110, Math.max(45, Math.round(getSummaryTargetCount(totalPosts) * 1.35)));
  if (selectedPosts.length > MAX_SELECTED_POSTS) {
    console.warn(`⚠️ 選択レスが${selectedPosts.length}個 → ${MAX_SELECTED_POSTS}個に制限`);

    // 優先度順にソート: レス1 > AI選択 > アンカー先 > 後方参照
    const prioritized = selectedPosts.sort((a, b) => {
      // レス1は最優先
      if (a.post_number === 1) return -1;
      if (b.post_number === 1) return 1;

      // AI選択（reasonが短い or reasonがない）を優先
      const aIsAI = !a.reason || (!a.reason.includes('自動追加'));
      const bIsAI = !b.reason || (!b.reason.includes('自動追加'));
      if (aIsAI && !bIsAI) return -1;
      if (!aIsAI && bIsAI) return 1;

      // アンカー先を後方参照より優先
      const aIsAnchor = a.reason?.includes('アンカー先');
      const bIsAnchor = b.reason?.includes('アンカー先');
      if (aIsAnchor && !bIsAnchor) return -1;
      if (!aIsAnchor && bIsAnchor) return 1;

      // それ以外はレス番号順
      return a.post_number - b.post_number;
    });

    selectedPosts = prioritized.slice(0, MAX_SELECTED_POSTS);
  }

  // レス番号順にソート（画面表示と一致させる）
  console.log('🔢 ソート前:', selectedPosts.map(p => p.post_number).join(', '));
  selectedPosts.sort((a, b) => a.post_number - b.post_number);
  console.log('🔢 ソート後:', selectedPosts.map(p => p.post_number).join(', '));

  // スレ主のレスは紫色に強制変更
  for (const post of selectedPosts) {
    const comment = comments[post.post_number - 1];
    if (comment?.is_talk_owner) {
      post.decorations.color = '#a855f7'; // 紫色
    }
  }

  // 最後の選択レス（落ちコメント）を赤色に（スレ主以外）
  if (selectedPosts.length > 0) {
    const lastSelectedPost = selectedPosts[selectedPosts.length - 1];
    const lastComment = comments[lastSelectedPost.post_number - 1];
    // スレ主の場合は紫色を維持、それ以外は赤色に
    if (!lastComment?.is_talk_owner) {
      lastSelectedPost.decorations.color = '#ef4444';
    }
  }

  // 色とサイズの分布を改善
  improveColorAndSizeDistribution(selectedPosts, comments);

  return {
    selected_posts: selectedPosts,
  };
}

// 色とサイズの分布を改善する
function improveColorAndSizeDistribution(
  selectedPosts: AISummarizeResponse['selected_posts'],
  comments: Comment[]
): void {
  // 使用可能な色（紫以外、バリエーション用）
  const availableColors = [
    '#3b82f6', // 青
    '#22c55e', // 緑
    '#ec4899', // ピンク
    '#f97316', // オレンジ
    '#eab308', // 黄色
    '#06b6d4', // シアン
  ];

  const totalPosts = selectedPosts.length;

  // === 1. サイズの正規化と分布調整 ===
  // smallが多すぎる場合は制限（最大で全体の10%）
  const maxSmall = Math.max(1, Math.floor(totalPosts * 0.1));
  let smallCount = 0;
  let largeCount = 0;

  for (const post of selectedPosts) {
    const size = post.decorations.size_boost;
    if (size === 'small') {
      smallCount++;
      if (smallCount > maxSmall) {
        post.decorations.size_boost = null; // 超過分はnullに変更
      }
    } else if (size === 'large') {
      largeCount++;
    }
  }

  // largeが多すぎる場合も制限（最大4個）
  if (largeCount > 4) {
    let count = 0;
    for (const post of selectedPosts) {
      if (post.decorations.size_boost === 'large') {
        count++;
        if (count > 4) {
          post.decorations.size_boost = null;
        }
      }
    }
  }

  // === 2. 色の分布を改善 ===
  // まず、スレ主と特殊なレス（レス1、最後）以外の色付き/null比率を確認
  const normalPosts = selectedPosts.filter((post, index) => {
    const comment = comments[post.post_number - 1];
    const isOwner = comment?.is_talk_owner;
    const isFirst = post.post_number === 1;
    const isLast = index === selectedPosts.length - 1;
    return !isOwner && !isFirst && !isLast;
  });

  // 色付きの目標: 40-50%程度
  const targetColoredCount = Math.floor(normalPosts.length * 0.45);
  const currentColoredCount = normalPosts.filter(p => p.decorations.color !== null).length;

  // 色が少なすぎる場合は追加
  if (currentColoredCount < targetColoredCount - 2) {
    let colorIndex = 0;
    let addedCount = 0;
    const toAdd = targetColoredCount - currentColoredCount;

    // 均等に色を追加（間隔を空けて）
    const interval = Math.max(2, Math.floor(normalPosts.length / toAdd));
    for (let i = 0; i < normalPosts.length && addedCount < toAdd; i += interval) {
      const post = normalPosts[i];
      if (post.decorations.color === null) {
        post.decorations.color = availableColors[colorIndex % availableColors.length];
        colorIndex++;
        addedCount++;
      }
    }
  }

  // === 3. 連続した同じ状態を修正 ===
  let colorIndex = 0;
  let consecutiveNull = 0;
  let consecutiveColored = 0;
  let lastColor: string | null = null;

  for (let i = 0; i < selectedPosts.length; i++) {
    const currentPost = selectedPosts[i];
    const comment = comments[currentPost.post_number - 1];
    const isOwner = comment?.is_talk_owner;
    const isFirst = currentPost.post_number === 1;
    const isLast = i === selectedPosts.length - 1;

    // スレ主、レス1、最後のレスは色を維持
    if (isOwner || isFirst || isLast) {
      // これらのレスはリセット用にカウントはリセット
      consecutiveNull = 0;
      consecutiveColored = 0;
      lastColor = currentPost.decorations.color;
      continue;
    }

    const currentColor = currentPost.decorations.color;

    if (currentColor === null) {
      consecutiveColored = 0;
      consecutiveNull++;

      // null(黒字)が3つ以上続いたら色を付ける
      if (consecutiveNull >= 3) {
        const newColor = availableColors[colorIndex % availableColors.length];
        currentPost.decorations.color = newColor;
        colorIndex++;
        consecutiveNull = 0;
        lastColor = newColor;
      } else {
        lastColor = null;
      }
    } else {
      consecutiveNull = 0;
      consecutiveColored++;

      // 同じ色が連続したら変更
      if (currentColor === lastColor) {
        const newColor = availableColors.find(c => c !== lastColor) || availableColors[colorIndex % availableColors.length];
        currentPost.decorations.color = newColor;
        colorIndex++;
        lastColor = newColor;
      } else if (consecutiveColored >= 3) {
        // 色付きが3つ以上続いたらnullに
        currentPost.decorations.color = null;
        consecutiveColored = 0;
        lastColor = null;
      } else {
        lastColor = currentColor;
      }
    }
  }
}

function parseAISummarizeContent(content: string, comments: Comment[]): AISummarizeResponse {
  let jsonStr = extractJsonObject(content);

  if (!jsonStr) {
    console.error('❌ JSONオブジェクトが見つかりません:', content.substring(0, 500));
    return buildFallbackAISummarizeResponse(comments);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return enhanceAIResponse(normalizeAISummarizeResponse(parsed), comments);
  } catch (e1) {
    // 不完全なJSONを修復
    try {
      const repaired = repairIncompleteJson(jsonStr);
      console.log('🔧 JSON修復を試行:', repaired.substring(0, 200));
      const parsed = JSON.parse(repaired);
      return enhanceAIResponse(normalizeAISummarizeResponse(parsed), comments);
    } catch (e2) {
      console.error('❌ JSON修復失敗:', e2);
      console.error('❌ 元のJSON:', jsonStr.substring(0, 500));
      return buildFallbackAISummarizeResponse(comments);
    }
  }
}

function extractJsonObject(content: string): string {
  let text = content.trim();

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    text = fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  if (firstBrace < 0) return '';

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = firstBrace; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(firstBrace, i + 1).trim();
      }
    }
  }

  return text.slice(firstBrace).trim();
}

function normalizeAISummarizeResponse(value: unknown): AISummarizeResponse {
  const obj = value as { selected_posts?: unknown; posts?: unknown; selectedPosts?: unknown };
  const rawPosts = Array.isArray(obj.selected_posts)
    ? obj.selected_posts
    : Array.isArray(obj.posts)
      ? obj.posts
      : Array.isArray(obj.selectedPosts)
        ? obj.selectedPosts
        : [];

  return {
    selected_posts: rawPosts
      .map((raw) => {
        if (typeof raw === 'number' || typeof raw === 'string') {
          const postNumber = Number(raw);
          if (!Number.isInteger(postNumber) || postNumber < 1) return null;
          return {
            post_number: postNumber,
            decorations: {
              color: null,
              size_boost: null,
            },
            reason: '',
          };
        }

        const post = raw as {
          post_number?: unknown;
          postNumber?: unknown;
          number?: unknown;
          decorations?: { color?: unknown; size_boost?: unknown; sizeBoost?: unknown };
          color?: unknown;
          size_boost?: unknown;
          sizeBoost?: unknown;
          reason?: unknown;
        };
        const postNumber = Number(post.post_number ?? post.postNumber ?? post.number);
        if (!Number.isInteger(postNumber) || postNumber < 1) return null;

        const decorations = post.decorations || {};
        const color = decorations.color ?? post.color;
        const sizeBoost = decorations.size_boost ?? decorations.sizeBoost ?? post.size_boost ?? post.sizeBoost;

        return {
          post_number: postNumber,
          decorations: {
            color: typeof color === 'string' ? color : null,
            size_boost: sizeBoost === 'large' || sizeBoost === 'small' ? sizeBoost : null,
          },
          reason: typeof post.reason === 'string' ? post.reason : '',
        };
      })
      .filter((post): post is AISummarizeResponse['selected_posts'][number] => post !== null),
  };
}

function buildFallbackAISummarizeResponse(comments: Comment[]): AISummarizeResponse {
  console.warn('⚠️ AI応答の解析に失敗したため、ローカル選定フォールバックを使用します');

  const totalPosts = comments.length;
  const targetCount = getSummaryTargetCount(totalPosts);
  const selected = new Set<number>();
  const candidates = comments
    .map((comment, index) => {
      const postNumber = index + 1;
      const body = sanitizeText(comment.body).replace(/\s+/g, ' ').trim();
      const bodyWithoutAnchors = body.replace(/(?:>>|＞＞)[０-９\d]+/g, '').trim();
      const anchorCount = extractAnchors(body).length;
      const length = bodyWithoutAnchors.length;
      const hasQuestion = /[?？]/.test(body);
      const hasPunch = /笑|草|w|ｗ|怖|やば|ヤバ|すご|嘘|不思議|気になる/.test(body);

      let score = 0;
      if (comment.is_talk_owner) score += 8;
      if (length >= 15 && length <= 160) score += 5;
      if (length > 160 && length <= 320) score += 2;
      if (length < 10) score -= 8;
      if (anchorCount > 0) score += Math.min(anchorCount * 2, 6);
      if (hasQuestion) score += 2;
      if (hasPunch) score += 3;
      score += Math.max(0, 4 - Math.abs((postNumber / Math.max(totalPosts, 1)) * 4 - 2));

      return { postNumber, score, body };
    })
    .filter(({ postNumber, body }) =>
      postNumber !== 1 &&
      body.length >= 10 &&
      !isKeywordSpam(body) &&
      !isSevereDiscriminatoryContent(body)
    )
    .sort((a, b) => b.score - a.score);

  for (const candidate of candidates) {
    if (selected.size >= targetCount) break;
    selected.add(candidate.postNumber);

    for (const anchor of extractAnchors(comments[candidate.postNumber - 1]?.body || '')) {
      if (anchor > 1 && anchor <= totalPosts && selected.size < targetCount) {
        selected.add(anchor);
      }
    }
  }

  if (selected.size < targetCount) {
    const step = Math.max(1, Math.floor(totalPosts / targetCount));
    for (let postNumber = 2; postNumber <= totalPosts && selected.size < targetCount; postNumber += step) {
      const body = comments[postNumber - 1]?.body || '';
      if (body.length >= 10 && !isKeywordSpam(body) && !isSevereDiscriminatoryContent(body)) {
        selected.add(postNumber);
      }
    }
  }

  return enhanceAIResponse({
    selected_posts: [...selected]
      .sort((a, b) => a - b)
      .map((postNumber, index) => ({
        post_number: postNumber,
        decorations: {
          color: index % 3 === 0 ? 'blue' : null,
          size_boost: null,
        },
        reason: 'ローカルフォールバック選定',
      })),
  }, comments);
}

export function getAISummarizeProvider(): AISummarizeProvider {
  if (typeof window === 'undefined') return 'claude';
  const provider = localStorage.getItem('matomeln_ai_summary_provider');
  return provider === 'ollama' ? 'ollama' : 'claude';
}

export function getLocalOllamaOptions(): Required<LocalOllamaOptions> {
  if (typeof window === 'undefined') {
    return {
      endpoint: DEFAULT_OLLAMA_ENDPOINT,
      model: DEFAULT_OLLAMA_MODEL,
    };
  }

  return {
    endpoint: localStorage.getItem('matomeln_ollama_endpoint') || DEFAULT_OLLAMA_ENDPOINT,
    model: localStorage.getItem('matomeln_ollama_model') || DEFAULT_OLLAMA_MODEL,
  };
}

export async function callAISummarize(
  apiKey: string,
  title: string,
  comments: Comment[]
): Promise<AISummarizeResponse> {
  const provider = getAISummarizeProvider();
  if (provider === 'ollama') {
    return callLocalOllamaAPI(title, comments, getLocalOllamaOptions());
  }
  return callClaudeAPI(apiKey, title, comments);
}

// ローカルOllama APIを呼び出し
export async function callLocalOllamaAPI(
  title: string,
  comments: Comment[],
  options: LocalOllamaOptions = {}
): Promise<AISummarizeResponse> {
  const prompt = buildLocalOllamaSummarizePrompt(title, comments);
  const endpoint = (options.endpoint || DEFAULT_OLLAMA_ENDPOINT).replace(/\/$/, '');
  const model = options.model || DEFAULT_OLLAMA_MODEL;
  console.log(`📊 Ollamaプロンプト文字数: ${prompt.length}文字, レス数: ${comments.length}件, モデル: ${model}`);

  // ローカルモデルは初回ロードが重いので少し長めに待つ
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  let response: Response;
  try {
    response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        format: 'json',
        options: {
          temperature: 0,
          num_ctx: 16384,
          num_predict: 4000,
        },
        messages: [
          {
            role: 'system',
            content: 'Return valid minified JSON only. The root object must be {"selected_posts":[numbers]}. No markdown. No explanation.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ローカルAI分析がタイムアウトしました（180秒）。Ollamaが起動しているか確認してください。');
    }
    if (error instanceof TypeError) {
      throw new Error('Ollamaに接続できません。MacでOllamaを起動してから再実行してください。');
    }
    throw error instanceof Error ? error : new Error('ローカルAI呼び出しに失敗しました');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorMessage = 'Ollama API呼び出しに失敗しました';
    try {
      const errorData = await response.json() as { error?: string };
      if (errorData.error) errorMessage = errorData.error;
    } catch {
      // JSON以外のエラーは既定メッセージを使う
    }
    throw new Error(errorMessage);
  }

  const data = await response.json() as { message?: { content?: string }; response?: string };
  const content = data.message?.content || data.response || '';
  return parseAISummarizeContent(content, comments);
}

// Claude APIを呼び出し
export async function callClaudeAPI(
  apiKey: string,
  title: string,
  comments: Comment[]
): Promise<AISummarizeResponse> {
  // プロンプトを生成
  const prompt = buildAISummarizePrompt(title, comments);
  console.log(`📊 プロンプト文字数: ${prompt.length}文字, レス数: ${comments.length}件`);

  // タイムアウト設定（60秒）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('AI分析がタイムアウトしました（60秒）。スキップします。');
    }
    // エラーを適切なError形式で再スロー
    if (error instanceof Error) {
      throw error;
    }
    let errorMsg = 'AI API呼び出しに失敗しました';
    if (error && typeof error === 'object') {
      const obj = error as Record<string, unknown>;
      if (typeof obj.message === 'string') errorMsg = obj.message;
      else if (typeof obj.error === 'string') errorMsg = obj.error;
    } else if (typeof error === 'string') {
      errorMsg = error;
    }
    throw new Error(errorMsg);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorData = await response.json() as { error?: { message?: string } };
    const errorMessage = errorData.error?.message || '';
    console.error('Claude API Error:', errorData);

    if (response.status === 529) {
      throw new Error('APIが混雑しています。しばらく待ってから再試行してください。');
    }
    if (response.status === 401) {
      throw new Error('APIキーが無効です。設定ページで正しいAPIキーを入力してください。');
    }
    // トークン制限エラー
    if (errorMessage.includes('too long') || errorMessage.includes('token')) {
      throw new Error(`レスが多すぎます（${comments.length}件）。このスレッドはスキップされます。`);
    }
    throw new Error(errorMessage || 'API呼び出しに失敗しました');
  }

  const data = await response.json() as { content: Array<{ text?: string }> };
  const content = data.content[0]?.text || '';

  return parseAISummarizeContent(content, comments);
}

// 不完全なJSONを修復
function repairIncompleteJson(jsonStr: string): string {
  let str = jsonStr.trim();

  // 最後の完全なオブジェクト（}）を探す
  if (str.includes('}')) {
    // 最後の完全な}の位置を見つける
    let lastValidIndex = -1;
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount >= 0) lastValidIndex = i;
      }
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }

    if (lastValidIndex > 0) {
      str = str.substring(0, lastValidIndex + 1);
    }
  }

  // 閉じ括弧を追加
  const openBraces = (str.match(/{/g) || []).length;
  const closeBraces = (str.match(/}/g) || []).length;
  const openBrackets = (str.match(/\[/g) || []).length;
  const closeBrackets = (str.match(/\]/g) || []).length;

  str += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
  str += '}'.repeat(Math.max(0, openBraces - closeBraces));

  return str;
}
