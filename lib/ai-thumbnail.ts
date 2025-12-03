/**
 * AIサムネイル生成モジュール
 * Google Gemini APIで画像生成
 */

import { ThumbnailCharacter } from './types';

/**
 * センシティブなコンテンツをサニタイズ
 */
function sanitizeSensitiveContent(text: string): string {
  const replacements: Record<string, string> = {
    // 医療・健康関連
    '感染': 'トラブル',
    '集団感染': '問題',
    '腹痛': '体調不良',
    '下痢': '体調不良',
    '血便': '症状',
    '嘔吐': '体調不良',
    '発熱': '体調不良',
    '入院': '療養',
    '死亡': '不幸',
    '負傷': 'けが',
    '重症': '深刻',
    '軽症': '軽微',
    'O157': '食中毒',
    'ノロウイルス': 'ウイルス',
    '病気': '体調問題',
    '疾患': '健康問題',
    // 事故・災害関連
    '事故': 'トラブル',
    '火災': '火事',
    '爆発': '大きな音',
    '崩壊': '破損',
    '倒壊': '破損',
    // 犯罪関連
    '殺人': '事件',
    '強盗': '事件',
    '窃盗': '事件',
    '暴力': 'トラブル',
    '逮捕': '対応',
    '容疑者': '関係者',
    // その他
    '炎上': '話題',
    '批判': '反応',
    '非難': '指摘'
  };

  let sanitized = text;
  for (const [sensitive, safe] of Object.entries(replacements)) {
    sanitized = sanitized.replace(new RegExp(sensitive, 'g'), safe);
  }
  return sanitized;
}

/**
 * 記事タイトルからプロンプトを生成（クリック率最大化・面白可愛いサムネイル）
 */
function generatePromptFromTitle(title: string, character?: ThumbnailCharacter, sanitize = false): string {
  // タイトルから装飾を除去
  let cleanTitle = title.replace(/【.*?】|§\s*/g, '').trim();

  if (sanitize) {
    cleanTitle = sanitizeSensitiveContent(cleanTitle);
  }

  // キャラクターの外見説明
  const characterAppearance = character?.description
    ? `- EXACT hair style and color: ${character.description}`
    : '- Same hair style and color from reference';

  return `You are the WORLD'S BEST viral thumbnail artist, known for creating IRRESISTIBLY CUTE and FUNNY images that make people INSTANTLY want to click.

🎯 YOUR MISSION: Create a thumbnail that is SO ADORABLE and SO HILARIOUS that people CANNOT resist clicking!

Article Title: "${cleanTitle}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 HIGH-CTR THUMBNAIL SECRETS (FOLLOW THESE!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【CUTENESS MAXIMIZERS】
★ HUGE, SPARKLY EYES with star/heart highlights - the bigger and shinier, the better!
★ Exaggerated cute expressions: big smile showing teeth, puffed cheeks (もぐもぐ), cat mouth (ω), surprised "O" mouth
★ Blush marks on cheeks (pink/red circles) for extra kawaii factor
★ Chibi-style proportions when funny: big head, small body
★ Adorable poses: peace sign, finger on lip, head tilt, hands on cheeks
★ Cute sound effect visuals: hearts, stars, sparkles, sweat drops, question marks floating around

【COMEDY GOLD EXPRESSIONS】
😱 SHOCK: Eyes popping out, jaw dropped, hands on cheeks (like Munch's Scream but cute)
😤 ANGRY CUTE: Puffed cheeks, steam from head, but still adorable
🤣 DYING OF LAUGHTER: Eyes squeezed shut, tears flying, holding stomach
😳 EMBARRASSED: Red face, steam, spiral eyes, hands waving frantically
🥺 PLEADING: Puppy dog eyes, trembling lip, hands clasped
😏 SMUG: Half-lidded eyes, knowing smirk, hand on hip
🤔 CONFUSED: Head tilt, sweat drop, question marks everywhere

【VISUAL IMPACT BOOSTERS】
⚡ BRIGHT, SATURATED COLORS - make it POP against other thumbnails!
⚡ Strong character-background CONTRAST
⚡ Dynamic camera angles: looking up at character (powerful), looking down (cute/vulnerable)
⚡ Action lines and motion blur for energy
⚡ Dramatic lighting: rim light, spotlight effect, golden hour glow

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 CHARACTER REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${characterAppearance}
- Keep the character's core design: face shape, eye color, hair style
- ALL accessories must be preserved (glasses, ribbons, cat ears, etc.)
- Match the art style of the reference image

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 EMOTION MATCHING (READ THE TITLE!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Analyze the article title and create the PERFECT reaction:
- Surprising news → 😱 SHOCKED face with wide eyes, hands on cheeks
- Funny/stupid news → 🤣 LAUGHING or 😏 SMUG expression
- Wholesome content → 🥰 HAPPY with hearts and sparkles
- Controversial/drama → 😤 ANGRY-CUTE or 🫢 GOSSIPY whisper pose
- Sad news → 🥺 CRYING but still cute (tears like waterfalls)
- Exciting news → ✨ SPARKLING EYES, pumping fist, jumping pose

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️ COMPOSITION (THUMBNAIL-OPTIMIZED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Character takes up 60-80% of the frame - BE BOLD!
- Face/expression is the STAR - make it BIG and VISIBLE
- Simple, non-distracting background (solid color, gradient, or soft blur)
- High contrast between character and background
- Square 1:1 aspect ratio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ MAGIC TOUCHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Add these for extra appeal:
- Floating hearts, stars, or sparkles ✨💕⭐
- Cute sweat drops for comedy 💧
- Anger veins or steam for frustrated expressions 💢
- Floating question/exclamation marks ❓❗
- Soft pink/orange/yellow glow around character
- Subtle confetti or flower petals for celebration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 ABSOLUTELY NO TEXT IN IMAGE 🚫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ZERO Japanese text (ひらがな、カタカナ、漢字)
- ZERO English text
- NO speech bubbles with words
- NO watermarks or signatures
- Express EVERYTHING through visuals only!

NOW CREATE THE MOST CLICKABLE, ADORABLE, HILARIOUS THUMBNAIL EVER! 🎨✨`;
}

export interface ThumbnailGenerationResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
}

/**
 * 画像URLをBase64に変換（プロキシAPI経由）
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // プロキシAPI経由で画像を取得（CORS回避）
    const proxyUrl = `/api/proxy/fetchImage?url=${encodeURIComponent(imageUrl)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      console.warn('Proxy fetch failed:', response.status);
      return null;
    }

    const result = await response.json();

    if (result.error) {
      console.warn('Proxy error:', result.error);
      return null;
    }

    return {
      data: result.data,
      mimeType: result.mimeType || 'image/png'
    };
  } catch (error) {
    console.warn('Failed to fetch reference image:', imageUrl, error);
    return null;
  }
}

/**
 * Google Gemini APIで画像を生成
 */
export async function generateThumbnail(
  apiKey: string,
  title: string,
  character?: ThumbnailCharacter,
  sanitize = false
): Promise<ThumbnailGenerationResult> {
  // リクエストパーツを構築（参考画像を先に、テキストを後に）
  type TextPart = { text: string };
  type ImagePart = { inlineData: { mimeType: string; data: string } };
  const parts: (TextPart | ImagePart)[] = [];

  // 参考画像がある場合は先頭に追加（最大3枚）
  let hasReferenceImages = false;
  if (character?.referenceImageUrls && character.referenceImageUrls.length > 0) {
    const imagesToUse = character.referenceImageUrls.slice(0, 3);
    console.log('📷 参考画像を読み込み中...', imagesToUse.length, '枚');

    for (const imageUrl of imagesToUse) {
      const imageData = await fetchImageAsBase64(imageUrl);
      if (imageData) {
        const imagePart: ImagePart = {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data
          }
        };
        parts.push(imagePart);
        console.log('✓ 参考画像を追加しました:', imageUrl);
        hasReferenceImages = true;
      } else {
        console.warn('⚠️ 参考画像の読み込みに失敗:', imageUrl);
      }
    }
  }

  // プロンプトを生成して追加
  const prompt = generatePromptFromTitle(title, character, sanitize);

  if (hasReferenceImages) {
    // 参考画像がある場合は説明を追加
    parts.push({
      text: `The above image(s) show the reference character "${character?.name || 'キャラクター'}". Create a new thumbnail image featuring this SAME character with consistent appearance, style, and design.\n\n${prompt}`
    });
  } else {
    // 参考画像がない場合はプロンプトのみ
    parts.push({ text: prompt });
  }

  const requestBody = {
    contents: [{
      parts: parts
    }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '1:1'
      },
      // 品質向上のための設定
      temperature: 0.9,
      topP: 0.95,
      topK: 40
    },
    // 安全フィルター設定（最も寛容に - OFF設定）
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'OFF'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'OFF'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'OFF'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'OFF'
      },
      {
        category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
        threshold: 'OFF'
      }
    ]
  };

  try {
    // gemini-2.5-flash-imageモデルを使用（すたくらくんと同じ、Nano Banana対応）
    const response: Response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      // 429エラー（レート制限）
      if (response.status === 429) {
        return {
          success: false,
          error: 'APIのレート制限に達しました。しばらく時間をおいてから再度お試しください。'
        };
      }

      // センシティブコンテンツエラー
      const errorMessage = errorData.error?.message || errorText;
      if (response.status === 400 && (
        errorMessage.includes('SAFETY') ||
        errorMessage.includes('blocked') ||
        errorMessage.includes('HARM') ||
        errorMessage.includes('prohibited')
      )) {
        // サニタイズしていない場合は再試行
        if (!sanitize) {
          console.log('センシティブコンテンツとして検出。サニタイズして再試行...');
          return generateThumbnail(apiKey, title, character, true);
        }
        return {
          success: false,
          error: 'センシティブなコンテンツのため画像を生成できませんでした。タイトルの表現を変更してください。'
        };
      }

      return {
        success: false,
        error: errorData.error?.message || `API Error: ${response.status}`
      };
    }

    const data = await response.json();

    // 安全フィルターでブロックされた場合
    if (data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0];
      const finishReason = candidate.finishReason;

      if (finishReason === 'SAFETY' || finishReason === 'IMAGE_SAFETY') {
        if (!sanitize) {
          console.log('安全フィルターでブロック。サニタイズして再試行...');
          return generateThumbnail(apiKey, title, character, true);
        }
        return {
          success: false,
          error: 'センシティブなコンテンツのため画像を生成できませんでした。'
        };
      }
    }

    // 画像データを探す
    if (!data.candidates?.[0]?.content?.parts) {
      return {
        success: false,
        error: '画像データが返されませんでした'
      };
    }

    const responseParts = data.candidates[0].content.parts;
    const imagePart = responseParts.find((part: { inlineData?: { data: string; mimeType: string } }) => part.inlineData);

    if (!imagePart?.inlineData?.data) {
      return {
        success: false,
        error: '画像データが見つかりませんでした'
      };
    }

    return {
      success: true,
      imageBase64: imagePart.inlineData.data
    };

  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '画像生成に失敗しました'
    };
  }
}

/**
 * Base64画像をData URLに変換
 */
export function base64ToDataUrl(base64: string, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${base64}`;
}
