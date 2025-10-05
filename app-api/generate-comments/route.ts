import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { talkTitle, talkBody, existingComments, count = 20 } = await request.json();

    if (!talkTitle || !existingComments) {
      return NextResponse.json(
        { error: 'トークタイトルと既存コメントが必要です' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEYが設定されていません' },
        { status: 500 }
      );
    }

    // 既存コメントを取得（最大10件、なければ全件）
    const commentSample = existingComments.slice(0, Math.min(10, existingComments.length));
    const sampleComments = commentSample.map((c: any, i: any) => `${i + 1}. ${c.body}`).join('\n\n');

    const prompt = `あなたは2chまとめサイトやShikutokuのような掲示板のコメントを生成するAIです。

以下のトーク（スレッド）に対して、**正確に${count}件**のリアルで多様性のあるコメントを生成してください。

【トークタイトル】
${talkTitle}

${talkBody ? `【本文】\n${talkBody}\n` : ''}

【既存コメント】
${sampleComments}

# 既存コメントの活用方法
**重要**: 上記の既存コメントを分析して、以下を参考にしてください：
1. **話題の流れ**: 既存コメントで議論されている内容に沿ったコメントも生成する
2. **トーンやスタイル**: 既存コメントの雰囲気（熱量、言葉遣い）を参考にする
3. **返信や反応**: 既存コメントに対する賛成・反対・質問などの反応も含める
4. **自然な会話**: まるで掲示板で人々が会話しているような自然な流れを作る

例えば、既存コメントが「すごい」という内容なら：
- 「それな」「同感」などの同意
- 「いや、そうか？」などの反論
- 「具体的にどこが？」などの質問
などを織り交ぜる。

# 絶対ルール
1. **必ず${count}件のコメントを生成すること**
2. **必ず長さのバリエーションを含めること**（1行だけのコメントばかりにしない）
3. **中程度と長文のコメントには必ず改行を入れること**
4. **既存コメントの話題を参考にしつつ、新しい視点も加える**

# 長さのバリエーション（必須）

**${count}件のうち、以下の配分で生成してください：**

1. **超短い（1行、3-10文字）**: ${Math.floor(count * 0.2)}件
   - 例：「草」「これ」「マ？」「ファーwww」「やばい」「えぇ...」

2. **短い（1-2行、15-40文字）**: ${Math.floor(count * 0.3)}件
   - 例：「まじかよw」「すごすぎて草生える」「これは期待できそう」
   - 1文か2文程度の短いコメント

3. **中程度（3-5行、60-120文字）**: ${Math.floor(count * 0.3)}件
   - **必ず2-3箇所で改行を入れる**
   - 具体的な意見や感想を複数文で
   - 例：
     「これは評価分かれそうだな
     個人的には期待してるけど
     過去の実績考えるとちょっと不安もある」

4. **長文（6-10行、150-300文字）**: 残りの件数
   - **必ず4-6箇所で改行を入れる**
   - 詳しい考察、体験談、複数の論点
   - 過去の経験や具体例を交える
   - 例：
     「正直これはかなり期待できると思う

     前に似たようなケースで成功した例があって、そのときも最初は賛否両論だったんだよね
     でも蓋を開けてみたら予想以上に良かった

     今回も同じパターンになる可能性高いんじゃないかな
     ただし油断は禁物で、しっかり様子見は必要だと思う」

## スタイルのバリエーション
1. **一言リアクション**: 「草」「これ」「マ？」「ファーwww」「やばい」「えぇ...」
2. **感嘆・驚き**: 「すごい！」「まじか」「信じられん」「ヤバすぎて草」
3. **詳しい考察・分析**: 背景説明、データ、過去の事例との比較など（必ず長文で）
4. **体験談**: 「自分も似た経験あるけど〜」「うちの会社も〜」など（長文）
5. **ツッコミ・皮肉**: 「いやいやw」「流石にそれはない」「嘘だろwww」
6. **質問・疑問**: 「ソースは？」「本当に？」「どういうこと？」
7. **共感・同意**: 「わかる」「それな」「同感」「これはある」
8. **否定・反論**: 「でもさ〜」「逆に〜」「それ違くね？」

## 重要な注意点
- **必ず長文コメントを含める**（6-10行の詳しい考察を20%）
- **改行を積極的に使う**:
  - 中程度のコメント: 2-3箇所で改行
  - 長文コメント: 4-6箇所で改行して段落を分ける
  - 改行は文の区切りや話題の切り替えで入れる
- **アンカー（返信）の使用**:
  - 約20-30%のコメントには「>>数字」形式のアンカーを含めてOK
  - 例：「>>1 これマジ？」「>>3 それな」「>>5 いやそれは違うだろ」
  - 2ch、5ch、がるちゃん、Shikutokuで使われる一般的な返信形式
  - アンカー番号は既存コメントの番号を参考に自然に
- **ネットスラング使用**: w、草、マジ、ガチ、やばい、なお、模様、案件、〜な件、逝った、ワロタ、等
- **2ch/5ch/がるちゃん的表現**: 「〜だろ」「〜じゃん」「〜っしょ」「〜なんだが」「〜やで」
- **句読点少なめ**: 長文以外は句読点を控えめに
- コメント番号や名前は不要（本文のみ）
- 画像URLや外部リンクは含めない
- 攻撃的・差別的な内容は避ける

# 出力形式

各コメントを「---」で区切って出力してください。

**絶対に守ること：**
1. **${count}件のコメントを生成**
2. **上記の長さのバリエーション配分を厳守**
3. **中程度・長文のコメントには必ず改行を含める**

例（20件の場合の正しい例）：
草
---
やばい
---
マ？
---
これは期待
---
まじかよwww
---
すごすぎて草生える
---
これは評価分かれそうだな
個人的には期待してるけど
過去の実績考えるとちょっと不安もある
---
正直この展開は予想外だった
でも逆に面白くなってきたと思う
今後の動きに注目だわ
---
ちょっと待って、これガチなの？
だとしたら相当やばいことになるぞ
---
個人的にはもっと慎重に判断すべきだと思うんだよね
過去の事例を見ても、こういうケースは後から問題が発覚することが多いし

前に似たようなケースで最初は好評だったけど半年後に炎上したパターンあったよね
あれも最初はみんな絶賛してたのに蓋を開けてみたら裏で色々あったって話
だから今回も様子見が正解だと思うわ
---
えぇ...
---
これはない
---
(以下、残りの8件も同様のバリエーションで...)

**再確認**: あなたは**必ず${count}件**のコメントを、上記の長さ配分で生成してください。
`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('予期しないレスポンス形式です');
    }

    // 生成されたコメントを「---」で分割
    let generatedComments = content.text
      .split('---')
      .map(comment => comment.trim())
      .filter(comment => comment.length > 0);

    // 要求された件数に満たない場合はエラー
    if (generatedComments.length < count) {
      console.warn(`Expected ${count} comments, but got ${generatedComments.length}`);
    }

    // 正確に指定された件数だけ返す
    generatedComments = generatedComments.slice(0, count);

    return NextResponse.json({
      success: true,
      comments: generatedComments,
      count: generatedComments.length,
      requested: count,
    });
  } catch (error) {
    console.error('AI comment generation error:', error);
    return NextResponse.json(
      {
        error: 'コメント生成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
