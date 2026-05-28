/**
 * タグサムネイルキャッシュ
 * スレメモくんのタグDBからキャッシュ済みサムネイルを検索・保存
 */

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
