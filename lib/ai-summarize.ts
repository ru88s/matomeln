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

// プロンプト生成
export function buildAISummarizePrompt(title: string, comments: Comment[]): string {
  const totalPosts = comments.length;

  // スレ主のレス番号を特定
  const ownerPostNumbers: number[] = [];
  comments.forEach((comment, index) => {
    if (comment.is_talk_owner) {
      ownerPostNumbers.push(index + 1);
    }
  });

  const postsText = comments
    .map((comment, index) => {
      const postNum = index + 1;
      const ownerMark = comment.is_talk_owner ? ' [スレ主]' : '';
      return `[${postNum}]${ownerMark} ${comment.body}`;
    })
    .join('\n\n');

  return `あなたは5chスレッドのまとめ記事を作成するアシスタントです。

以下のスレッドから、まとめ記事に適したレスを選択し、装飾を提案してください。

【タイトル】
${title}

【レス総数】
${totalPosts}件

【全レス内容】
${postsText}

【選択基準】
- **レス1（スレ立て）は含めない**（自動的に追加されます）
- **🔥 最重要：スレ主（[スレ主]マーク付き）のレスは優先的に選択してください 🔥**
  - スレ主のレスはストーリーの核心であり、省略すると話の流れが分からなくなります
  - スレ主のレス番号: ${ownerPostNumbers.length > 0 ? ownerPostNumbers.join(', ') : 'なし'}
  - スレ主のレスは特別な理由がない限り全て選択してください
- ストーリーの流れが分かるレス
- 面白い・インパクトのあるレス
- オチやツッコミになるレス
- **>>（アンカー）を含むレスも、まとめに必要なら必ず選択してください**
- 全体の30-50%程度に絞る（${Math.floor(totalPosts * 0.3)}-${Math.floor(totalPosts * 0.5)}件程度）

【除外基準 - これらのレスは絶対に選択しないこと】
**🚫 最重要：スレッドタイトルとの関連性チェック 🚫**
- **レスを選択する前に、必ずスレッドタイトル「${title}」との関連性を確認してください**
- **タイトルのテーマと全く無関係な話題のレスは絶対に選択しないでください**

以下のレスは絶対に選択しないこと：
1. **スレッドのテーマや内容に無関係なレス（最も重要！）**
   - 例：ポケモンのスレで、国際結婚の統計データ
   - 例：ゲームのスレで、全く関係のない政治や歴史の話題
   - 例：スポーツのスレで、食べ物の話題
   - **🚫 統計データやランキング形式のコピペ（特に注意！）🚫**
     * 【アメリカの国際結婚データ】【統計】のような見出し
     * 「1位○○」「2位△△」「3位××」のようなランキング形式
     * 「○○万人」「△△%」のような数値データの羅列
     * 検定試験、受験者数、人口統計、学習者数、留学生数などの箇条書きデータ
     * 「在日○○人」「在韓○○人」のような国際比較データ
     * 「国籍放棄者」「日本籍」のような政治的統計データ
     * ドット（.）で区切られた複数行のデータ羅列
   - **これらはスレッドテーマと99%無関係なスパムです。絶対に選択しないでください。**

2. **スパム的な短文コメント（15文字未満は特に注意）**
   - 例：「やめてくれ」「うざい」「消えろ」「なんやコイツってんの？」など、議論に貢献しないもの
   - 例：「草」「これ」「わかる」「それな」などの一言コメント
   - **15文字未満のレスは、よほど重要でない限り選択しないでください**
   - **ただし、オチや落ちコメントとして機能する場合は例外**

3. **荒らしや煽りのみのレス**
   - 議論を妨害する目的のコメント
   - 攻撃的・侮辱的な短文

4. **話の流れに全く関係のない一言コメント**
   - スレッドの本題と関係ない雑談
   - 文脈から切り離された意味不明なコメント

5. **宣伝や広告目的のレス**
   - 商品やサービスの宣伝

**判断基準：**
- レスを選ぶ前に自問：「このレスはスレッドタイトル『${title}』と直接関係があるか？」
- 答えがNoなら、そのレスは選択しない
- これらのレスはストーリーの理解を妨げ、まとめ記事の質を大きく下げます

【選択後の最終チェック（必須）】
レス選択が完了したら、selected_postsの各レスを1つずつ以下の項目で確認してください：

✓ **関連性チェック**: このレスはスレッドタイトル「${title}」と直接関係がありますか？
  → Noなら即座に削除

✓ **文字数チェック**: このレスは15文字以上の意味のある内容ですか？
  → Noで、かつオチでもないなら削除

✓ **スパムチェック**: このレスは統計データ、ランキング形式、または無関係なコピペですか？
  → Yesなら即座に削除

✓ **価値チェック**: このレスはまとめ記事の読者にとって価値がありますか？
  → Noなら削除

**最終確認：選択したレスの中に、上記の除外基準に該当するものが1つでも残っていないか再確認してください。**

【自動処理ルール - これらは自動的に処理されますが、基本のレスは選択してください】
**⚠️ 重要：アンカーを「含むレス」自体は必ず選択してください ⚠️**

1. **レス1（スレ立て）**: 自動的に追加され、赤色が設定されます

2. **アンカー先の自動追加**:
   **あなたが選択したレスに>>数字が含まれている場合、そのアンカー先は自動的に追加されます**
   - 例：あなたがレス3「>>2 作曲と野球みること」を選択した場合
     → レス2「趣味は？」が自動的に追加されます

   **ただし、アンカーを含むレス自体（例：レス3）は必ず選択してください**
   **アンカー先（例：レス2）だけが自動追加されます**

3. **後方参照の自動追加**:
   選択済みのレスを参照しているレスも自動追加されます
   - 例：レス10を選択済み、レス20が「>>10」を含む場合
     → レス20も自動的に追加されます

4. **再帰的検出**:
   自動追加されたレスからさらにアンカーが見つかれば、それも自動追加

5. **落ちコメント**:
   最後のレス（スレの最終レス）は自動的に赤色が設定されます

【装飾ルール - 色は控えめに、メリハリをつけて】
- **デフォルト**: 選択したレスは全て「太字」と「文字サイズ中」を適用
- **🚨 重要：すべてのレスに色をつける必要はありません！ 🚨**
  * 色をつけすぎると逆に見にくくなります
  * 本当に面白い・ためになる・重要なレスだけに色をつけてください
  * 全体の30-40%程度に色をつけるのが目安
  * 残りは null（色なし）でOK

- **色はカラーコードで指定してください（10色から選択）**：
  * "#ef4444" - 赤: インパクトのある発言、ツッコミ、重要なポイント
  * "#3b82f6" - 青: 冷静な指摘、補足説明、客観的な意見
  * "#a855f7" - 紫: **スレ主専用色**（スレ主のレスには必ずこの色を使用）
  * "#22c55e" - 緑: 為になる情報、解決策、ポジティブな意見
  * "#ec4899" - ピンク: 可愛い発言、ほっこりする内容、愛のある発言
  * "#f97316" - オレンジ: 警告、注意喚起、熱い発言
  * "#eab308" - 黄色: 面白い発言、明るい話題、笑える内容
  * "#06b6d4" - シアン: 新しい視点、クールな意見、技術的な内容
  * "#64748b" - グレー: 中立的な意見、淡々とした説明
  * null - **色なし（基本はこれを使う）**

- **連続した同じ色は避けてください**
  * 色をつける場合、隣り合うレスに同じ色を使わないでください
  * 色なし(null)は連続してもOK

- **スレ主のレスは紫色（#a855f7）で固定**
  * [スレ主]マークが付いているレスは必ず紫色を使用してください
  * スレ主のレス番号: ${ownerPostNumbers.length > 0 ? ownerPostNumbers.join(', ') : 'なし'}

- **自動設定される色**：
  * レス1（スレ立て） → "#ef4444"（赤色、自動設定）
  * 最後のレス（落ちコメント） → "#ef4444"（赤色、自動設定）

【色の使い方のコツ】
- **控えめに使う**のがポイント
- 本当に目立たせたいレスだけに色をつける
- 普通のレスは色なし(null)でOK

【文字サイズルール - 🔥最重要：メリハリをつけて！🔥】
- **3種類のサイズから選べます**：
  * "large" - 大（22px）: **🎯 以下のレスには必ずlargeを使用 🎯**
  * null - 中（18px）: 通常のレス（デフォルト）
  * "small" - 小（14px）: 補足的な情報、脇役的なレス

- **🚨 "large"を使うべきレス（必須）🚨**：
  1. **落ち・オチ** - スレの流れを締めくくる面白い発言
  2. **ボケ** - 笑いを取りに行っている発言
  3. **ツッコミ** - ボケに対する的確な返し
  4. **名言・パンチライン** - 印象に残る一言
  5. **衝撃的な発言** - 読者が「えっ！？」となる内容
  6. **スレのハイライト** - 話の核心や盛り上がり

- **⚠️ 全部「中」にしないでください！⚠️**
  * まとめ記事はメリハリが命です
  * 面白いコメントが「大」で目立つことで読者を惹きつけます
  * **最低でも選択レスの10%以上はlargeにしてください**

- 目安配分: 大 10-20%、中 70-80%、小 5-10%

以下のJSON形式で返答してください：
{
  "selected_posts": [
    {
      "post_number": 2,
      "decorations": {
        "color": "#3b82f6",
        "size_boost": null
      },
      "reason": "選択理由"
    },
    {
      "post_number": 5,
      "decorations": {
        "color": "#ef4444",
        "size_boost": "large"
      },
      "reason": "インパクトのある発言"
    },
    {
      "post_number": 8,
      "decorations": {
        "color": "#a855f7",
        "size_boost": "small"
      },
      "reason": "補足的な情報"
    }
  ]
}

【重要な出力ルール】
1. **必ずJSON形式のみで返答してください。説明文は一切不要です。**
2. **JSONは必ず完全な形式で出力してください。途中で切れないように注意してください。**
3. **配列の最後の要素にもカンマを付けないでください。**
4. **すべての波括弧 {} と角括弧 [] を正しく閉じてください。**
5. **文字列は必ずダブルクォート "" で囲んでください。**
6. **レス数が多い場合でも、selected_posts配列を途中で切らないでください。**
7. **colorはカラーコード（例: "#ef4444"）またはnullで指定してください。**
8. **size_boostは"large"、"small"、またはnullで指定してください。**

出力例：
{"selected_posts":[{"post_number":2,"decorations":{"color":"#3b82f6","size_boost":null},"reason":"理由"},{"post_number":5,"decorations":{"color":"#ef4444","size_boost":"large"},"reason":"オチ"}]}

上記のルールを厳守し、完全で有効なJSONのみを出力してください。`;
}

// AIレスポンスを強化（レス1追加、アンカー先追加など）
export function enhanceAIResponse(
  aiResponse: AISummarizeResponse,
  comments: Comment[]
): AISummarizeResponse {
  const selectedPosts = [...aiResponse.selected_posts];
  const selectedNumbers = new Set(selectedPosts.map(p => p.post_number));
  const totalPosts = comments.length;

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

  // ソートして返す
  selectedPosts.sort((a, b) => a.post_number - b.post_number);

  // スレ主のレスは紫色に強制変更
  for (const post of selectedPosts) {
    const comment = comments[post.post_number - 1];
    if (comment?.is_talk_owner) {
      post.decorations.color = '#a855f7'; // 紫色
    }
  }

  // 連続した同じ色を修正
  fixConsecutiveColors(selectedPosts, comments);

  // 文字サイズのメリハリを強制（最低10%はlargeに）
  ensureSizeVariety(selectedPosts, comments);

  return { selected_posts: selectedPosts };
}

// 文字サイズのメリハリを強制する（AIが全部「中」にしてしまう問題への対策）
function ensureSizeVariety(
  selectedPosts: AISummarizeResponse['selected_posts'],
  comments: Comment[]
): void {
  // 色付きのレス（AIが重要と判断したレス）のみを対象
  const coloredPosts = selectedPosts.filter(p => p.decorations.color !== null);

  // largeが設定されているレスの数をカウント
  const largeCount = selectedPosts.filter(p => p.decorations.size_boost === 'large').length;

  // 最低10%はlargeにする（色付きレスから優先的に選択）
  const targetLargeCount = Math.max(2, Math.ceil(selectedPosts.length * 0.1));

  if (largeCount < targetLargeCount) {
    const needLarge = targetLargeCount - largeCount;

    // largeにする候補を選定（色付きで、まだlargeでないレス）
    const candidates = coloredPosts
      .filter(p => p.decorations.size_boost !== 'large')
      .filter(p => {
        // レス1と最後のレスは除外（自動設定される）
        const isFirst = p.post_number === 1;
        const isLast = p.post_number === comments.length;
        return !isFirst && !isLast;
      });

    // 候補が足りない場合は色なしレスからも選択
    if (candidates.length < needLarge) {
      const additionalCandidates = selectedPosts
        .filter(p => p.decorations.color === null)
        .filter(p => p.decorations.size_boost !== 'large')
        .filter(p => {
          const isFirst = p.post_number === 1;
          const isLast = p.post_number === comments.length;
          return !isFirst && !isLast;
        });
      candidates.push(...additionalCandidates);
    }

    // 短いコメント（ツッコミやオチの可能性が高い）を優先
    candidates.sort((a, b) => {
      const aBody = comments[a.post_number - 1]?.body || '';
      const bBody = comments[b.post_number - 1]?.body || '';
      return aBody.length - bBody.length;
    });

    // 必要な数だけlargeに変更
    for (let i = 0; i < Math.min(needLarge, candidates.length); i++) {
      candidates[i].decorations.size_boost = 'large';
    }
  }

  // 最後のレスは落ちコメントなのでlargeに
  const lastPost = selectedPosts.find(p => p.post_number === comments.length);
  if (lastPost) {
    lastPost.decorations.size_boost = 'large';
  }
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
  const prompt = buildAISummarizePrompt(title, comments);

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
    if (response.status === 529) {
      throw new Error('APIが混雑しています。しばらく待ってから再試行してください。');
    }
    if (response.status === 401) {
      throw new Error('APIキーが無効です。設定ページで正しいAPIキーを入力してください。');
    }
    throw new Error(error.error?.message || 'API呼び出しに失敗しました');
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
