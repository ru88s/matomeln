export type ThumbnailReuseCategory =
  | 'life'
  | 'work'
  | 'family'
  | 'romance'
  | 'money'
  | 'beauty'
  | 'health'
  | 'food'
  | 'news'
  | 'politics'
  | 'entertainment'
  | 'sports'
  | 'generic';

export interface ThumbnailLibraryRecord {
  id: string;
  imageUrl: string;
  title: string;
  category: ThumbnailReuseCategory;
  keywords: string[];
  style: 'deformed-mascot';
  usageCount: number;
  createdAt: string;
  lastUsedAt: string;
}

export interface ThumbnailReuseMatch {
  record: ThumbnailLibraryRecord;
  score: number;
  reason: string;
}

const STORAGE_KEY = 'matomeln_thumbnail_library_v1';
const MAX_LIBRARY_ITEMS = 800;
const MAX_KEYWORDS = 10;
const RECENT_REUSE_WINDOW_MS = 12 * 60 * 60 * 1000;

const CATEGORY_RULES: Array<{ category: ThumbnailReuseCategory; patterns: RegExp[] }> = [
  { category: 'politics', patterns: [/政治/, /政府/, /国会/, /選挙/, /議員/, /首相/, /大臣/, /政党/, /自民党/, /立憲/, /維新/, /共産党/] },
  { category: 'sports', patterns: [/スポーツ/, /野球/, /サッカー/, /MLB/i, /NBA/i, /五輪/, /オリンピック/, /スタジアム/, /試合/, /選手/] },
  { category: 'entertainment', patterns: [/芸能/, /俳優/, /女優/, /タレント/, /アイドル/, /歌手/, /声優/, /モデル/, /YouTuber/i, /芸人/] },
  { category: 'news', patterns: [/ニュース/, /速報/, /事件/, /事故/, /逮捕/, /裁判/, /報道/, /発表/] },
  { category: 'work', patterns: [/仕事/, /職場/, /会社/, /上司/, /同僚/, /バイト/, /パート/, /転職/, /残業/] },
  { category: 'family', patterns: [/家族/, /親/, /母親/, /父親/, /義母/, /義父/, /義実家/, /夫/, /妻/, /旦那/, /嫁/, /子供/, /育児/] },
  { category: 'romance', patterns: [/恋愛/, /彼氏/, /彼女/, /結婚/, /離婚/, /婚活/, /デート/, /告白/] },
  { category: 'money', patterns: [/節約/, /貯金/, /給料/, /お金/, /買い物/, /スーパー/, /家計/, /支払い/] },
  { category: 'beauty', patterns: [/美容/, /メイク/, /服/, /ファッション/, /髪/, /肌/, /コスメ/] },
  { category: 'health', patterns: [/健康/, /睡眠/, /昼夜逆転/, /眠れない/, /寝不足/, /病院/, /介護/, /体調/] },
  { category: 'food', patterns: [/料理/, /ご飯/, /食事/, /弁当/, /外食/, /カフェ/, /レストラン/, /食べ/] },
  { category: 'life', patterns: [/生活/, /日常/, /暮らし/, /雑談/, /相談/, /悩み/, /愚痴/, /あるある/, /掃除/, /洗濯/, /家事/, /部屋/] },
];

const STOP_WORDS = new Set([
  'これ',
  'それ',
  'あれ',
  'ため',
  'こと',
  'もの',
  'やつ',
  'さん',
  'ちゃん',
  '悲報',
  '朗報',
  '速報',
  '画像',
  'スレ',
  'ｗｗｗ',
]);

function loadLibrary(): ThumbnailLibraryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ThumbnailLibraryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLibrary(records: ThumbnailLibraryRecord[]): void {
  if (typeof window === 'undefined') return;
  const sorted = [...records]
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
    .slice(0, MAX_LIBRARY_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
}

export function classifyThumbnailCategory(title: string): ThumbnailReuseCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(title))) {
      return rule.category;
    }
  }
  return 'generic';
}

export function extractThumbnailKeywords(title: string): string[] {
  const cleaned = title
    .replace(/【.*?】/g, ' ')
    .replace(/[「」『』（）()【】\[\]！？!?、。,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const matches = cleaned.match(/[一-龠ぁ-んァ-ヶーA-Za-z0-9]{2,12}/g) || [];
  const keywords = matches
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))
    .filter((word) => !/^\d+$/.test(word));

  return [...new Set(keywords)].slice(0, MAX_KEYWORDS);
}

export function findReusableThumbnail(title: string): ThumbnailReuseMatch | null {
  const records = loadLibrary();
  if (records.length === 0) return null;

  const category = classifyThumbnailCategory(title);
  const keywords = extractThumbnailKeywords(title);
  const now = Date.now();

  const candidates = records
    .map((record) => {
      const categoryScore = record.category === category ? 6 : 0;
      const keywordMatches = record.keywords.filter((keyword) => keywords.includes(keyword));
      const keywordScore = keywordMatches.length * 3;
      const freshnessPenalty = now - new Date(record.lastUsedAt).getTime() < RECENT_REUSE_WINDOW_MS ? 2 : 0;
      const usagePenalty = Math.min(record.usageCount, 6) * 0.25;
      const score = categoryScore + keywordScore - freshnessPenalty - usagePenalty;
      return {
        record,
        score,
        reason: keywordMatches.length > 0
          ? `${record.category} / ${keywordMatches.join(', ')}`
          : `${record.category}`,
      };
    })
    .filter((match) => match.score >= 6)
    .sort((a, b) => b.score - a.score);

  return candidates[0] || null;
}

export function markThumbnailReused(recordId: string): void {
  const now = new Date().toISOString();
  const records = loadLibrary().map((record) =>
    record.id === recordId
      ? { ...record, usageCount: record.usageCount + 1, lastUsedAt: now }
      : record
  );
  saveLibrary(records);
}

export function saveGeneratedThumbnailToLibrary(title: string, imageUrl: string): void {
  if (!imageUrl) return;
  const now = new Date().toISOString();
  const records = loadLibrary();
  if (records.some((record) => record.imageUrl === imageUrl)) return;

  records.unshift({
    id: `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl,
    title,
    category: classifyThumbnailCategory(title),
    keywords: extractThumbnailKeywords(title),
    style: 'deformed-mascot',
    usageCount: 0,
    createdAt: now,
    lastUsedAt: now,
  });
  saveLibrary(records);
}

export function getThumbnailLibraryStats(): { total: number } {
  return { total: loadLibrary().length };
}
