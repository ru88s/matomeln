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
 * 記事タイトルからプロンプトを生成（すたくらくん同等の詳細プロンプト）
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

  // プロフェッショナルなペルソナ
  const professionalPersona = `You are a PROFESSIONAL THUMBNAIL DESIGNER with years of experience creating high-CTR (Click-Through Rate) thumbnails for viral content.

【Your Expertise】
✅ Visual Psychology: You understand what makes people click - eye contact, emotion, contrast, curiosity gaps
✅ Composition Mastery: Perfect balance of character, emotion, and background to tell a story at a glance
✅ Color Theory: Strategic use of vibrant, complementary colors that stand out in feeds
✅ Emotional Impact: Ability to convey the article's emotion instantly through character expression and pose
✅ Trend Awareness: Knowledge of current visual trends in Japanese web media and social platforms
✅ Character Consistency: Maintaining recognizable character designs while adapting to different scenarios

Your thumbnails have generated millions of clicks. Create another masterpiece.

`;

  return `${professionalPersona}Create a MASTERPIECE, eye-catching high-quality scene with the SAME CHARACTER from the reference image(s) above.

Article Title: "${cleanTitle}"

🎯 CHARACTER CONSISTENCY (CRITICALLY IMPORTANT):
ANALYZE the reference image(s) carefully and replicate:
${characterAppearance}
- EXACT face structure: same eye shape, eye color, iris details, nose style, mouth shape
- EXACT hair: color, length, texture, styling, bangs, volume
- Body proportions and body type must match perfectly
- ALL accessories: glasses (if present), cat ears (if present), ribbon (if present), hair clips, earrings
- Accessory details: exact position, color, size, shape
- Keep the IDENTICAL art style, line work, and coloring technique
- Only modify: pose, facial expression, outfit (if scene requires), background

💫 EMOTION AND EXPRESSION:
Analyze the article's emotional tone and reflect it:
- Happy/Joyful article → Bright smile, sparkling eyes, energetic pose, warm colors
- Sad/Disappointed → Downcast eyes, slumped shoulders, subdued expression, cooler tones
- Surprised/Shocked → Wide eyes, open mouth, raised eyebrows, dynamic motion
- Excited/Enthusiastic → Big smile, raised arms, jumping or bouncing pose
- Calm/Peaceful → Gentle smile, relaxed posture, soft serene expression
- Worried/Anxious → Furrowed brow, tense posture, nervous expression

🎨 ART STYLE REQUIREMENTS:
- Modern Japanese anime/manga style (like high-quality light novel illustrations)
- Clean, crisp line art with consistent line weight
- Cel shading with soft gradients and smooth transitions
- Vibrant but balanced color palette with proper color harmony
- Professional-grade rendering quality
- Smooth anti-aliasing on all edges
- Rich detail in hair, eyes, and clothing

🖼️ COMPOSITION AND FRAMING:
- Use rule of thirds or golden ratio for character placement
- Appropriate framing based on scene:
  * Emotional scenes: Medium close-up (chest and above)
  * Action scenes: Full body or dynamic angle
  * Calm scenes: Medium shot with breathing space
- Proper head room and negative space
- Dynamic angles when appropriate for the theme
- Character as clear focal point

🌟 BACKGROUND QUALITY:
- HIGH DETAIL background with atmospheric depth
- Proper perspective with foreground/midground/background layers
- Environmental storytelling matching article theme:
  * Indoor scenes: Detailed room elements, furniture, decorations
  * Outdoor scenes: Sky, clouds, buildings, nature elements
  * Abstract scenes: Thematic patterns, colors, symbolic elements
- Appropriate depth of field (slight background blur to emphasize character)
- Environmental props and details that enhance the story

💡 LIGHTING AND ATMOSPHERE:
- Professional lighting setup matching the mood:
  * Happy scenes: Bright, warm lighting with soft highlights
  * Dramatic scenes: Strong contrast, rim lighting, dynamic shadows
  * Calm scenes: Soft, diffused lighting with gentle gradients
- Realistic light sources and shadow directions
- Atmospheric effects: Light rays, ambient glow, particles
- Color grading that enhances emotional tone

✨ VISUAL EFFECTS (use appropriately):
- Sparkles and light particles for magical or happy moments
- Soft glow and bloom for dreamy or romantic scenes
- Motion lines for dynamic action
- Cherry blossom petals for spring or romantic themes
- Lens flare for bright, hopeful scenes
- Subtle texture overlay for depth (fabric, hair, background)

📐 TECHNICAL SPECIFICATIONS:
- 1:1 square aspect ratio (perfect for thumbnails)
- High resolution with sharp details
- Proper color balance and saturation
- Professional composition with visual flow
- Clean edges and smooth gradients

🚫🚫🚫 TEXT RULES (ABSOLUTELY CRITICAL) 🚫🚫🚫
ZERO TEXT ALLOWED IN THE IMAGE!
- NO Japanese characters (hiragana, katakana, kanji) - rendering quality is extremely poor
- NO English text overlays or captions
- NO speech bubbles with any text
- NO signs, labels, or UI elements with text
- NO watermarks, signatures, or artist names
- NO sound effects written as text (like "ドキドキ" or "キラキラ")
- Use ONLY visual storytelling: expressions, body language, visual symbols, colors

The article title is for understanding the SCENE CONCEPT only.
DO NOT write any part of the title as text in the image.
Use visual metaphors and imagery instead.`;
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
      // 品質向上のための設定（すたくらくんと同じ）
      temperature: 0.9,
      topP: 0.95,
      topK: 40
    },
    // 安全フィルター設定（最も寛容に）
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE'
      }
    ]
  };

  try {
    // gemini-2.5-flash-imageモデルを使用（すたくらくんと同じ）
    const response: Response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
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
