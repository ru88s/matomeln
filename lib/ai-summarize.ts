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

// YouTube URLスパムを検出（URLだけの荒らしレス）
export function isYouTubeSpam(text: string): boolean {
  const youtubePattern = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//i;
  if (!youtubePattern.test(text)) return false;

  // URL部分を除去して残りのテキストを確認
  const textWithoutUrls = text.replace(/https?:\/\/[^\s\u3000<>「」『』（）()[\]{}、。，．]+/g, '').trim();
  // アンカーも除去
  const textWithoutAnchors = textWithoutUrls.replace(/>>(\d+)/g, '').trim();

  // URL以外の内容が20文字未満なら荒らしと判定
  if (textWithoutAnchors.length < 20) {
    console.log(`🚫 YouTube URLスパム検出: 残テキスト=${textWithoutAnchors.length}文字「${textWithoutAnchors.substring(0, 30)}」`);
    return true;
  }

  return false;
}

// 政治/宗教煽りコピペを検出（【〇〇】で始まるテンプレ + 煽りキーワード）
// 例: 「>>1 【イスラム化する世界】フランスはイスラム教移民を…」
//   どのスレッドにも貼られる定型コピペで、スレッド本題と無関係なものを除外
export function isOffTopicPoliticalSpam(text: string): boolean {
  // アンカーを除いた本文
  const body = text.replace(/>>(\d+)/g, '').replace(/＞＞[０-９\d]+/g, '').trim();

  // 先頭60文字以内に【〇〇〇】（2文字以上）があるか
  // 【ネタバレ】等の正当な使い方もあるので、煽りキーワードと組み合わせて判定
  const bracketMatch = body.slice(0, 60).match(/【[^】]{2,30}】/);
  if (!bracketMatch) return false;

  // 政治/宗教/民族煽りキーワード
  const inflammatoryKeywords = [
    'イスラム', 'ムスリム', 'ムハンマド', 'コーラン',
    'キリスト教', 'ユダヤ', 'シオニスト',
    '移民', '難民', '不法滞在',
    '韓国人', '朝鮮人', '在日', '反日', '親日',
    '中国共産党', '中共', 'チャイナ',
    '統一教会', '創価', 'カルト',
    'ネトウヨ', 'パヨク', '工作員',
    '棄教', '改宗', '異教徒',
  ];
  const hitCount = inflammatoryKeywords.filter(kw => body.includes(kw)).length;

  // 【】テンプレ + 煽りキーワード2個以上 → 高確率でコピペ
  if (hitCount >= 2) {
    console.log(`🚫 政治/宗教コピペ検出: 「${bracketMatch[0]}」+ 煽り語${hitCount}個`);
    return true;
  }

  return false;
}

// コピペ荒らしを検出（外部URL複数 + SNSハンドル等）
export function isCopyPasteSpam(text: string): boolean {
  // 外部URLの数をカウント（http/https、ドメイン直書き）
  const urlPattern = /(?:https?:\/\/[\w.-]+\.\w{2,}|[\w-]+\.(?:com|net|org|jp|io|be|dev|co\.jp|ne\.jp|or\.jp)\/\S*)/gi;
  const urls = text.match(urlPattern) || [];

  // SNSハンドル（@username）の数をカウント
  const handlePattern = /@\w{2,}/g;
  const handles = text.match(handlePattern) || [];

  // 外部URLが3つ以上 → コピペスパム
  if (urls.length >= 3) {
    console.log(`🚫 コピペスパム検出: URL=${urls.length}個`);
    return true;
  }

  // 外部URL2つ以上 + SNSハンドル2つ以上 → コピペスパム
  if (urls.length >= 2 && handles.length >= 2) {
    console.log(`🚫 コピペスパム検出: URL=${urls.length}個, ハンドル=${handles.length}個`);
    return true;
  }

  return false;
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

  // レス数に応じて選択数を調整（長いスレッドでも200以内に収める）
  // アンカー先・後方参照で増えることを考慮して、AI選択は控えめに
  const minSelection = Math.min(15, Math.floor(totalPosts * 0.1));
  const maxSelection = Math.min(40, Math.floor(totalPosts * 0.15)); // 最大40個（アンカー追加後も200以内）
  const selectionRange = `${Math.max(10, minSelection)}〜${Math.max(20, maxSelection)}`;

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
- レス1は含めないでください（自動追加されます）
- スレ主[主]のレスは優先的に選んでください
- 10文字未満の短いレスは選ばないでください（「あ」「草」など）
- アンカー（>>数字）付きレスを選ぶ場合、参照先も重要なら選んでください
- スレッド本題と無関係な政治/宗教/民族のコピペ（【イスラム化する世界】等の定型文、移民・在日・特定宗教を煽る長文など）は絶対に選ばないでください

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

  // AIが同じレス番号を複数回返した場合の重複除去（最初の1つを残す）
  const seenPostNumbers = new Set<number>();
  selectedPosts = selectedPosts.filter(post => {
    if (seenPostNumbers.has(post.post_number)) {
      console.log(`⚠️ 重複レスを除去: ${post.post_number}`);
      return false;
    }
    seenPostNumbers.add(post.post_number);
    return true;
  });

  // キーワードスパム・YouTube URLスパムを除外（レス1は除く）
  selectedPosts = selectedPosts.filter(post => {
    if (post.post_number === 1) return true; // レス1は除外しない
    const comment = comments[post.post_number - 1];
    if (!comment) return false;
    if (isKeywordSpam(comment.body)) {
      console.log(`🚫 スパムレスを除外: ${post.post_number}`);
      return false;
    }
    if (isYouTubeSpam(comment.body)) {
      console.log(`🚫 YouTube URLスパムレスを除外: ${post.post_number}`);
      return false;
    }
    if (isCopyPasteSpam(comment.body)) {
      console.log(`🚫 コピペスパムレスを除外: ${post.post_number}`);
      return false;
    }
    if (isOffTopicPoliticalSpam(comment.body)) {
      console.log(`🚫 政治/宗教コピペレスを除外: ${post.post_number}`);
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
  if (!selectedNumbers.has(1)) {
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
        if (targetNum > 0 && targetNum <= totalPosts && !selectedNumbers.has(targetNum)) {
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
      if (selectedNumbers.has(targetNum)) {
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

  // 自動追加されたレスにもスパムフィルターを適用（レス1は除く）
  selectedPosts = selectedPosts.filter(post => {
    if (post.post_number === 1) return true;
    const comment = comments[post.post_number - 1];
    if (!comment) return false;
    if (isYouTubeSpam(comment.body)) {
      console.log(`🚫 YouTube URLスパムレスを除外（自動追加分）: ${post.post_number}`);
      return false;
    }
    if (isCopyPasteSpam(comment.body)) {
      console.log(`🚫 コピペスパムレスを除外（自動追加分）: ${post.post_number}`);
      return false;
    }
    if (isOffTopicPoliticalSpam(comment.body)) {
      console.log(`🚫 政治/宗教コピペレスを除外（自動追加分）: ${post.post_number}`);
      return false;
    }
    return true;
  });

  // 200レス制限（読者の読み疲れ防止）
  const MAX_SELECTED_POSTS = 200;
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

  // JSONをパース
  let jsonStr = content;

  // ```json ブロックを除去
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return enhanceAIResponse(parsed, comments);
  } catch (e1) {
    // 不完全なJSONを修復
    try {
      const repaired = repairIncompleteJson(jsonStr);
      console.log('🔧 JSON修復を試行:', repaired.substring(0, 200));
      const parsed = JSON.parse(repaired);
      return enhanceAIResponse(parsed, comments);
    } catch (e2) {
      console.error('❌ JSON修復失敗:', e2);
      console.error('❌ 元のJSON:', jsonStr.substring(0, 500));
      // 修復も失敗した場合、空の結果を返す
      throw new Error('AIの応答を解析できませんでした。スレッドが大きすぎる可能性があります。');
    }
  }
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
