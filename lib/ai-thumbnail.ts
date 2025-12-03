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
 * 記事タイトルからプロンプトを生成（クリック率最大化・シーンマッチング・面白可愛いサムネイル）
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

  return `You are the WORLD'S BEST viral thumbnail artist who creates STORY-DRIVEN thumbnails. Your images tell a story at a glance with perfect scene composition, matching backgrounds, and expressive characters.

🎯 YOUR MISSION: Create a thumbnail that TELLS THE STORY of the article through visuals!

Article Title: "${cleanTitle}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 SCENE & BACKGROUND (MOST IMPORTANT!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
READ the article title carefully and CREATE A MATCHING SCENE:

【ANALYZE THE TITLE FOR CONTEXT】
Extract: WHO, WHAT, WHERE, WHEN from the title
- Celebrity/Entertainment → Stage, TV studio, red carpet, concert venue, interview set
- Sports → Stadium, field, gym, podium, locker room
- Politics/News → Government building, press conference, office
- Food/Restaurant → Kitchen, dining table, cafe, restaurant interior
- Travel/Places → Landmark, street scene, nature, famous locations
- Technology → Modern office, computer setup, futuristic setting
- School/Education → Classroom, campus, graduation ceremony
- Romance/Dating → Park, cafe date, sunset beach, cherry blossoms
- Money/Business → Office, stock market screens, luxury items
- Crime/Incident → Dark alley (stylized), police tape, courtroom
- Health/Medical → Hospital, pharmacy, gym (for fitness)
- Fashion → Runway, boutique, mirror, closet
- Gaming/Anime → Game-like background, fantasy world
- Music → Concert stage, recording studio, instruments
- Weather/Season → Matching sky, rain, snow, autumn leaves, summer beach

【BACKGROUND DETAIL LEVELS】
★ HIGH DETAIL backgrounds that MATCH the story:
- Real locations: Recognizable landmarks, cityscapes, interiors
- Atmospheric elements: Time of day lighting, weather effects
- Props and objects: Items related to the topic (microphones, food, sports equipment)
- Depth and perspective: Foreground, midground, background layers

【EXAMPLE SCENE MATCHING】
"芸能人がレストランで..." → Character in fancy restaurant interior, tables, chandeliers
"サッカー選手が優勝..." → Stadium background with crowd, confetti, trophy
"新商品が発売..." → Store/product display background, shopping atmosphere
"結婚を発表..." → Romantic setting, flowers, soft lighting, hearts
"炎上した発言..." → News studio or social media visual metaphor (fire effects stylized)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 CHARACTER REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${characterAppearance}
- Keep the character's core design: face shape, eye color, hair style
- ALL accessories must be preserved (glasses, ribbons, cat ears, etc.)
- Match the art style of the reference image
- OUTFIT can change to match the scene (school uniform, casual, formal, costume)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
😊 EXPRESSION & POSE (MATCH THE MOOD!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Character's reaction should match the article's emotional tone:

【POSITIVE NEWS】 → 😄 Big smile, sparkling eyes, peace sign, jumping, hearts floating
【SHOCKING NEWS】 → 😱 Wide eyes, hands on cheeks, jaw dropped, sweat drops
【FUNNY/SILLY】 → 🤣 Laughing with tears, holding stomach, pointing and laughing
【CONTROVERSIAL】 → 😏 Smug face, arms crossed, raised eyebrow, knowing look
【SAD/TRAGIC】 → 🥺 Tears (cute style), downcast eyes, holding tissue
【ANGRY/OUTRAGE】 → 😤 Puffed cheeks, steam, clenched fists, but still cute!
【CONFUSED】 → 🤔 Head tilt, question marks, sweat drop, finger on chin
【EXCITED】 → ✨ Sparkling eyes, raised fists, energetic pose, stars around

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️ COMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Character: 50-70% of frame (leave room for background!)
- Position: Slightly off-center for dynamic composition
- Background: VISIBLE and DETAILED (not just solid color!)
- Depth: Slight blur on far background, sharp character
- Camera angle: Match the mood (low angle = powerful, high angle = cute)
- Square 1:1 aspect ratio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ VISUAL ENHANCEMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Lighting that matches the scene (stage lights, sunset, neon, etc.)
- Atmospheric effects: Sparkles, confetti, petals, snow, rain drops
- Emotion indicators: Hearts, stars, sweat drops, anger marks, question marks
- Color grading: Warm for happy, cool for sad, vibrant for exciting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 ABSOLUTELY NO TEXT IN IMAGE 🚫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ZERO Japanese text (ひらがな、カタカナ、漢字)
- ZERO English text
- NO speech bubbles with words
- NO watermarks or signatures
- Tell the story through VISUALS ONLY!

CREATE A THUMBNAIL WHERE THE BACKGROUND AND SCENE TELL THE STORY! 🎨✨`;
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
