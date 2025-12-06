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
      size_boost: 'large' | null;
    };
    reason: string;
  }[];
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

  // コメント本文を簡潔に（レス番号と本文のみ、スレ主マーク付き）
  const postsText = comments
    .map((comment, index) => {
      const postNum = index + 1;
      const ownerMark = comment.is_talk_owner ? '[主]' : '';
      // 本文を切り詰め
      const body = comment.body.length > maxBodyLength
        ? comment.body.slice(0, maxBodyLength) + '…'
        : comment.body;
      return `${postNum}${ownerMark}: ${body}`;
    })
    .join('\n');

  return `以下のスレッドから、面白くまとめるために最適なレスを選択してください。

タイトル: ${title}
レス数: ${totalPosts}件

【レス一覧】
${postsText}

【選択ルール】
- 面白い、印象的、重要なレスを15〜25個選択してください
- ストーリーの流れが分かるように選んでください
- レス1は含めないでください（自動追加されます）
- スレ主[主]のレスは優先的に選んでください

【色の使用ルール】
- 使用できる色: "red", "blue", "green", "pink", "orange", "purple", null
- 紫色(purple)はスレ主専用です
- 連続するレスに同じ色を付けないでください
- 色なし(null)を積極的に使ってください（50%程度）

【サイズルール】
- "large": 特に重要・面白いレスのみ（2〜4個）
- null: 通常（デフォルト）
- "small": 補足的なレス

以下のJSON形式で返答してください：
{"selected_posts":[{"post_number":2,"decorations":{"color":"blue","size_boost":null},"reason":"理由"}]}

JSONのみを返してください。説明文は不要です。`;
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

function normalizeColor(color: string | null): string | null {
  if (!color) return null;
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
  const selectedPosts = [...aiResponse.selected_posts];
  const selectedNumbers = new Set(selectedPosts.map(p => p.post_number));
  const totalPosts = comments.length;

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

      // >>数字 のパターンを検出
      const anchorMatches = comment.body.match(/>>(\d+)/g);
      if (anchorMatches) {
        for (const match of anchorMatches) {
          const targetNum = parseInt(match.replace('>>', ''));
          if (targetNum > 0 && targetNum <= totalPosts && !selectedNumbers.has(targetNum)) {
            newPosts.push({
              post_number: targetNum,
              decorations: { color: null, size_boost: null },
              reason: `アンカー先（>>から自動追加）`
            });
            selectedNumbers.add(targetNum);
          }
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

    const anchorMatches = comment.body.match(/>>(\d+)/g);
    if (anchorMatches) {
      for (const match of anchorMatches) {
        const targetNum = parseInt(match.replace('>>', ''));
        if (selectedNumbers.has(targetNum)) {
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
  }

  // 最後のレス（落ちコメント）を赤色に
  const lastPostNum = totalPosts;
  const lastPost = selectedPosts.find(p => p.post_number === lastPostNum);
  if (lastPost) {
    lastPost.decorations.color = '#ef4444';
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

  // 連続した同じ色を修正
  fixConsecutiveColors(selectedPosts, comments);

  return { selected_posts: selectedPosts };
}

// 連続した同じ色を修正する（null連続はOK、色付き連続はNG）
function fixConsecutiveColors(
  selectedPosts: AISummarizeResponse['selected_posts'],
  comments: Comment[]
): void {
  // 使用可能な色（紫以外、バリエーション用にシャッフル的に使用）
  const availableColors = [
    '#3b82f6', // 青
    '#22c55e', // 緑
    '#ec4899', // ピンク
    '#f97316', // オレンジ
    '#eab308', // 黄色
    '#06b6d4', // シアン
    '#64748b', // グレー
    '#000000', // 黒
  ];

  let colorIndex = 0;

  for (let i = 1; i < selectedPosts.length; i++) {
    const currentPost = selectedPosts[i];
    const prevPost = selectedPosts[i - 1];

    const currentColor = currentPost.decorations.color;
    const prevColor = prevPost.decorations.color;

    // 両方nullなら問題なし（色なし連続は許容）
    if (currentColor === null && prevColor === null) {
      continue;
    }

    // 現在の色と前の色が同じ場合（両方とも色付き）
    if (currentColor !== null && prevColor !== null && currentColor === prevColor) {
      // スレ主のレスは紫色を維持する必要がある
      const comment = comments[currentPost.post_number - 1];
      if (comment?.is_talk_owner) {
        // スレ主の場合は前の色を変更
        const prevComment = comments[prevPost.post_number - 1];
        if (!prevComment?.is_talk_owner) {
          // 前のレスがスレ主でなければ、前の色を変更
          const newColor = availableColors.find(c => c !== currentColor && c !== '#a855f7');
          if (newColor) {
            prevPost.decorations.color = newColor;
          }
        }
        // 前もスレ主なら紫の連続は許容（稀なケース）
      } else {
        // 通常のレスの場合は現在の色を変更
        // 前の色と異なる色を選ぶ（ローテーションで選択）
        let newColor: string | null = null;
        for (let j = 0; j < availableColors.length; j++) {
          const candidate = availableColors[(colorIndex + j) % availableColors.length];
          if (candidate !== prevColor && candidate !== '#a855f7') {
            newColor = candidate;
            colorIndex = (colorIndex + j + 1) % availableColors.length;
            break;
          }
        }
        if (newColor) {
          currentPost.decorations.color = newColor;
        }
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
    })
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = error.error?.message || '';
    console.error('Claude API Error:', error);

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

  const data = await response.json();
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
  } catch {
    // 不完全なJSONを修復
    const repaired = repairIncompleteJson(jsonStr);
    const parsed = JSON.parse(repaired);
    return enhanceAIResponse(parsed, comments);
  }
}

// 不完全なJSONを修復
function repairIncompleteJson(jsonStr: string): string {
  let str = jsonStr.trim();

  // 最後の不完全な要素を削除
  const lastCompleteIndex = str.lastIndexOf('}');
  if (lastCompleteIndex > 0) {
    str = str.substring(0, lastCompleteIndex + 1);
  }

  // 閉じ括弧を追加
  const openBraces = (str.match(/{/g) || []).length;
  const closeBraces = (str.match(/}/g) || []).length;
  const openBrackets = (str.match(/\[/g) || []).length;
  const closeBrackets = (str.match(/\]/g) || []).length;

  str += '}'.repeat(Math.max(0, openBraces - closeBraces));
  str += ']'.repeat(Math.max(0, openBrackets - closeBrackets));

  return str;
}
