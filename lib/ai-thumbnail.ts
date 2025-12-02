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
 * 記事タイトルからプロンプトを生成
 */
function generatePromptFromTitle(title: string, characterDescription?: string, sanitize = false): string {
  // タイトルから装飾を除去
  let cleanTitle = title.replace(/【.*?】|§\s*/g, '').trim();

  if (sanitize) {
    cleanTitle = sanitizeSensitiveContent(cleanTitle);
  }

  // キャラクター設定があれば追加
  const characterSection = characterDescription ? `
🎭 CHARACTER (IMPORTANT - must appear in the image):
- Include this character in the thumbnail: "${characterDescription}"
- The character should be the main visual element
- Character should react to or interact with the article topic
- Maintain consistent character design and style
- Character expression should match the article mood
` : '';

  return `You are a PROFESSIONAL THUMBNAIL DESIGNER creating eye-catching blog thumbnails.

Create a visually striking thumbnail image for this article:
"${cleanTitle}"
${characterSection}
🎨 STYLE REQUIREMENTS:
- Modern, clean design with bold colors
- Professional illustration or graphic design style
- Eye-catching composition that grabs attention
- Suitable for a Japanese blog/news site

🖼️ COMPOSITION:
- Use symbolic imagery that represents the article topic
- Bold, simple shapes that read well at small sizes
- Strong focal point
- Good contrast between elements

💡 VISUAL APPROACH:
- Analyze the article title and create relevant imagery
- Use metaphors and visual symbols
- Create emotional impact through color and composition
- Make it clickable and interesting

📐 TECHNICAL:
- 1:1 square aspect ratio
- High contrast, vibrant colors
- Clean edges, professional quality

🚫 TEXT RULES (CRITICAL):
- NO text in the image whatsoever
- NO Japanese characters
- NO English text
- Use ONLY visual imagery
- The title is for understanding the concept only`;
}

export interface ThumbnailGenerationResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
}

/**
 * 画像URLをBase64に変換
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return {
      data: base64,
      mimeType: blob.type || 'image/png'
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
  const prompt = generatePromptFromTitle(title, character?.description, sanitize);

  // リクエストパーツを構築
  type TextPart = { text: string };
  type ImagePart = { inlineData: { mimeType: string; data: string } };
  const parts: (TextPart | ImagePart)[] = [];

  // 参考画像がある場合は追加（最大3枚）
  if (character?.referenceImageUrls && character.referenceImageUrls.length > 0) {
    const imagesToUse = character.referenceImageUrls.slice(0, 3);

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
      }
    }

    // 参考画像がある場合はプロンプトに追記
    if (parts.length > 0) {
      const textPart: TextPart = {
        text: `The above image(s) show the reference character "${character.name}". Create a new thumbnail image featuring this SAME character with consistent appearance, style, and design.\n\n${prompt}`
      };
      parts.push(textPart);
    } else {
      parts.push({ text: prompt });
    }
  } else {
    parts.push({ text: prompt });
  }

  const requestBody = {
    contents: [{
      parts: parts
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE']
    }
  };

  try {
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

    const parts = data.candidates[0].content.parts;
    const imagePart = parts.find((part: { inlineData?: { data: string; mimeType: string } }) => part.inlineData);

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
