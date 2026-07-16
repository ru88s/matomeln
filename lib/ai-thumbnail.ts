/**
 * AIサムネイル生成モジュール
 * Google Gemini APIで画像生成
 */

import { ThumbnailCharacter } from './types';
import {
  createThumbnailPromptPlan,
  formatThumbnailPromptPlan,
  type ThumbnailPromptContext,
} from './thumbnail-prompt-planner';

/** API呼び出しのタイムアウト（60秒） */
const API_TIMEOUT_MS = 60000;
/** リトライ回数 */
const MAX_RETRIES = 2;
const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-lite-image';

/**
 * タイムアウト付きfetch
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('APIリクエストがタイムアウトしました（60秒）');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * リトライ可能なエラーかどうか判定
 */
function isRetryableError(status: number): boolean {
  return status === 429 || status === 503 || status === 502;
}

/**
 * 記事タイトルに最適なキャラクターをAIで選択
 */
export async function selectCharacterForArticle(
  apiKey: string,
  title: string,
  characters: ThumbnailCharacter[]
): Promise<ThumbnailCharacter | undefined> {
  if (characters.length === 0) {
    return undefined;
  }

  if (characters.length === 1) {
    return characters[0];
  }

  // 50%の確率でランダム選択（AI偏り防止・API呼び出し節約）
  if (Math.random() < 0.5) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    console.log(`🎲 ランダムでキャラクター選択: ${characters[randomIndex].name}（API呼び出しスキップ）`);
    return characters[randomIndex];
  }

  // キャラクター情報をプロンプト用にフォーマット（順序をシャッフル）
  const shuffledIndices = characters.map((_, i) => i);
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }

  const characterList = shuffledIndices.map((originalIndex, displayIndex) =>
    `${displayIndex + 1}. "${characters[originalIndex].name}": ${characters[originalIndex].description || '説明なし'}`
  ).join('\n');

  const prompt = `記事タイトルに合うキャラクターを1つ選んで番号のみ回答。

【記事】${title}

${characterList}`;

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 2.0,
            maxOutputTokens: 10
          }
        })
      },
      15000 // キャラクター選択は15秒で十分
    );

    if (!response.ok) {
      console.warn('キャラクター選択API失敗、ランダム選択');
      return characters[Math.floor(Math.random() * characters.length)];
    }

    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // 数字を抽出
    const match = text.match(/\d+/);
    if (match) {
      const displayIndex = parseInt(match[0], 10) - 1;
      if (displayIndex >= 0 && displayIndex < characters.length) {
        // シャッフルされた表示順→元のインデックスに変換
        const originalIndex = shuffledIndices[displayIndex];
        console.log(`🎭 AIがキャラクター選択: ${characters[originalIndex].name}`);
        return characters[originalIndex];
      }
    }

    console.warn('キャラクター選択結果をパースできず、ランダム選択:', text);
    return characters[Math.floor(Math.random() * characters.length)];
  } catch (error) {
    console.warn('キャラクター選択エラー、ランダム選択:', error);
    return characters[Math.floor(Math.random() * characters.length)];
  }
}

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
function generatePromptFromTitle(
  title: string,
  character?: ThumbnailCharacter,
  sanitize = false,
  promptPlanBlock = ''
): string {
  // タイトルから装飾を除去
  let cleanTitle = title.replace(/【.*?】|§\s*/g, '').trim();

  if (sanitize) {
    cleanTitle = sanitizeSensitiveContent(cleanTitle);
  }

  // キャラクターの外見説明
  const characterAppearance = character?.description
    ? `- EXACT hair style and color: ${character.description}`
    : '- Same hair style and color from reference';

  return `You are the WORLD'S BEST Japanese matome-blog thumbnail artist. Create STORY-DRIVEN thumbnails as polished Japanese anime key art for a Garubi-like matome blog: elegant character proportions, refined linework, detailed hair and clothing, luminous eyes, transparent light, vivid but balanced colors, cinematic depth, and a beautifully finished commercial-illustration look. Keep the character appealing and expressive without making the head or body extremely chibi. Avoid hard plastic toy realism, stiff 3D figurine texture, photorealism, muddy colors, thick crude outlines, flat clip-art rendering, and excessive gloss. Do NOT imitate any specific commercial artwork, existing anime character, or real person likeness.

🎯 YOUR MISSION: Create a reusable thumbnail that TELLS THE STORY of the article through visuals only!

Visual context only (DO NOT render this text in the image): "${cleanTitle}"

Use the context above only to infer the scene, mood, character reaction, setting, props, and colors.
Never copy, translate, summarize, abbreviate, or stylize the article title as visible text in the image.

${promptPlanBlock ? `${promptPlanBlock}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 SCENE & BACKGROUND (MOST IMPORTANT!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
READ the article title carefully and CREATE A MATCHING SCENE:

【ANALYZE THE TITLE FOR CONTEXT】
Extract: WHO, WHAT, WHERE, WHEN from the title
- Celebrity/Entertainment → generic stage, TV studio lights, cameras, red carpet, interview set. Do NOT depict a real celebrity likeness.
- Sports → generic stadium, field, gym, podium, locker room. Do NOT depict a real athlete likeness.
- Politics/News → generic government building, press conference room, blank documents, voting box without labels. Do NOT depict a real politician likeness.
- Food/Restaurant → Kitchen, dining table, cafe, restaurant interior
- Travel/Places → Landmark, street scene, nature, famous locations
- Technology → Modern office, computer setup, futuristic setting with blank screens or abstract UI shapes only
- School/Education → Classroom, campus, graduation ceremony
- Romance/Dating → Park, cafe date, sunset beach, cherry blossoms
- Money/Business → Office, abstract chart screens without readable numbers or letters, luxury items
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
"芸能人がレストランで..." → Generic entertainment-news mascot in fancy restaurant interior, tables, chandeliers, no real-person likeness
"サッカー選手が優勝..." → Stadium background with crowd, confetti, trophy
"新商品が発売..." → Store/product display background, shopping atmosphere
"結婚を発表..." → Romantic setting, flowers, soft lighting, hearts
"炎上した発言..." → News studio or social media visual metaphor with stylized fire effects and no UI text

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 CHARACTER IDENTITY (keep same)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${characterAppearance}
Keep the character's IDENTITY from reference:
- Same polished anime/illustration mascot identity, face shape, eye color
- Same hair color, hair style, hair length
- Same accessories (glasses, ribbons, cat ears, hair clips)

🔄 MUST BE DIFFERENT (create variety!):
- Create a BRAND NEW POSE different from the reference!
- Change the outfit to match the article's scene
- Use a different camera angle
- Show the character actively doing something related to the article

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
😊 EXPRESSION & POSE (MATCH THE MOOD!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Character's reaction should match the article's emotional tone:

【POSITIVE NEWS】 → Bright smile, sparkling eyes, natural anime hand gesture, lively posture, subtle light particles
【SHOCKING NEWS】 → Wide eyes, small hands beside cheeks, jaw dropped, sweat drops
【FUNNY/SILLY】 → Laughing with tears, one small hand near stomach, playful body tilt
【CONTROVERSIAL】 → Smug face, arms crossed, raised eyebrow, knowing look
【SAD/TRAGIC】 → Subtle tears, downcast eyes, restrained emotional pose
【ANGRY/OUTRAGE】 → Determined expression, tense posture, clenched fist, but still visually appealing
【CONFUSED】 → Head tilt, confusion swirl, sweat drop, finger on chin
【EXCITED】 → Sparkling eyes, raised fists, energetic pose, stars around

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 ART STYLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Polished modern Japanese anime key visual, not realistic 3D
- Elegant stylized proportions; avoid super-deformed, oversized-head, or tiny-body chibi anatomy
- Fine, controlled linework with detailed hair strands, fabric folds, and carefully rendered eyes
- Clean anime shading enriched by soft painterly gradients and crisp highlights
- Clear blue skies, luminous rim light, floating light particles, or other tasteful atmospheric detail when appropriate
- Bright, clean, premium commercial-illustration finish with rich color separation; never dull, muddy, or overly pastel
- Garubi-like approachable character appeal, while the overall finish remains graceful rather than childish
- High readability at small thumbnail size

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✋ HANDS & LIMBS QUALITY (VERY IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Use natural, anatomically coherent anime-style hands
- Exactly two arms and at most two visible hands
- Keep hands small, simple, and away from the focal point
- Prefer simple open hands, tiny fists, or hands partly hidden behind props
- If fingers are visible, each hand must have normal simple anatomy
- Avoid close-up hands, detailed fingers, peace signs, crossed fingers, pointing fingers, and complex hand gestures
- Avoid duplicated hands, extra arms, extra fingers, malformed fingers, fused fingers, or floating hands
- When unsure, hide one or both hands behind the body, sleeve, object, or frame edge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖼️ COMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Character: 40-65% of frame (leave room for a scenic background!)
- Position: Slightly off-center for dynamic composition
- Background: VISIBLE and DETAILED (not just solid color!)
- Depth: Layered foreground, midground, and scenic background with subtle atmospheric perspective; sharp main character
- Camera angle: Match the mood (low angle = powerful, high angle = cute)
- Square 1:1 aspect ratio
- Designed for livedoor blog thumbnails: clear subject at small size, strong contrast, no clutter

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ VISUAL ENHANCEMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Lighting that matches the scene (stage lights, sunset, neon, etc.)
- Atmospheric effects: Tasteful light particles, lens glints, petals, snow, rain drops, or confetti as the scene allows
- Emotion indicators: Hearts, stars, sweat drops, anger marks, confusion swirls
- Color grading: Warm for happy, cool for sad, vibrant for exciting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 ABSOLUTELY NO TEXT IN IMAGE 🚫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ZERO Japanese text (ひらがな、カタカナ、漢字)
- ZERO English text
- ZERO article title text, headlines, captions, subtitles, labels, logos, UI text, numbers, or readable symbols
- NO speech bubbles with words
- NO readable text on signs, books, newspapers, documents, phones, computers, TV screens, scoreboards, product packages, clothes, badges, or background posters
- If a prop normally has text, render it as blank, blurred, abstract shapes, icons, color blocks, or decorative lines that are not readable
- NO watermarks or signatures
- Tell the story through VISUALS ONLY!

CREATE A BEAUTIFULLY FINISHED ANIME KEY-VISUAL THUMBNAIL WHERE THE EXPRESSIVE MASCOT AND CINEMATIC BACKGROUND TELL THE STORY.`;
}

/**
 * タグ名から汎用サムネイル用のタイトルを生成
 * キャッシュ保存用：特定の記事に依存しない汎用的なサムネイルを生成するため
 */
export function generateGenericTitleForTag(tagName: string, category?: string | null): string {
  if (category === '芸能系' || category === '芸能') {
    return `${tagName}の最新ニュース`;
  } else if (category === 'スポーツ系' || category === 'スポーツ・運動') {
    return `${tagName}の話題`;
  } else if (category === 'TV・映画・サブスク系' || category === '番組・映画・CM') {
    return `${tagName}について`;
  } else if (category === 'ゲーム・ホビー系' || category === 'ゲーム・ホビー・IT') {
    return `${tagName}の最新情報`;
  } else {
    return `${tagName}について`;
  }
}

export interface ThumbnailGenerationResult {
  success: boolean;
  imageBase64?: string;
  error?: string;
  /** 参考画像の読み込みに失敗した数 */
  referenceImageFailures?: number;
}

/**
 * 画像URLをBase64に変換（プロキシAPI経由）
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // プロキシAPI経由で画像を取得（CORS回避）
    const proxyUrl = `/api/proxy/fetchImage?url=${encodeURIComponent(imageUrl)}`;
    const response = await fetchWithTimeout(proxyUrl, {}, 15000);

    if (!response.ok) {
      console.warn('Proxy fetch failed:', response.status);
      return null;
    }

    const result = await response.json() as { error?: string; data?: string; mimeType?: string };

    if (result.error) {
      console.warn('Proxy error:', result.error);
      return null;
    }

    return {
      data: result.data || '',
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
  sanitize = false,
  promptContext: ThumbnailPromptContext = {}
): Promise<ThumbnailGenerationResult> {
  // リクエストパーツを構築（参考画像を先に、テキストを後に）
  type TextPart = { text: string };
  type ImagePart = { inlineData: { mimeType: string; data: string } };
  const parts: (TextPart | ImagePart)[] = [];

  // 参考画像がある場合は先頭に追加（最大3枚）
  let hasReferenceImages = false;
  let referenceImageFailures = 0;
  const totalReferenceImages = character?.referenceImageUrls?.length || 0;

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
        referenceImageFailures++;
        console.warn('⚠️ 参考画像の読み込みに失敗:', imageUrl);
      }
    }

    if (referenceImageFailures > 0 && !hasReferenceImages) {
      console.warn(`⚠️ 全ての参考画像（${totalReferenceImages}枚）の読み込みに失敗。キャラクター一貫性が低下する可能性があります`);
    }
  }

  // プロンプトを生成して追加
  const promptPlan = sanitize ? null : await createThumbnailPromptPlan(title, promptContext);
  const prompt = generatePromptFromTitle(title, character, sanitize, formatThumbnailPromptPlan(promptPlan));

  if (hasReferenceImages) {
    // 参考画像がある場合は強力なキャラクター指定を追加
    parts.push({
      text: `⚠️ CHARACTER IDENTITY INSTRUCTION ⚠️

The above reference image(s) show the character "${character?.name || 'キャラクター'}" that must appear in the thumbnail.

🔒 KEEP THE SAME (identity only):
- Cute anime/illustration mascot style, with soft 2.5D anime shading
- Face shape, eye shape, eye color
- Hair color, hair style, hair length
- All accessories (glasses, ribbons, cat ears, hair clips)

🔄 MUST BE DIFFERENT FROM REFERENCE (create variety!):
- POSE: Create a completely NEW and DIFFERENT pose! Do NOT copy the reference pose!
- EXPRESSION: Match the article's mood (happy, shocked, angry, etc.)
- OUTFIT: Change clothing to match the scene/article theme
- ANGLE: Use a different camera angle than the reference
- ACTION: Show the character DOING something related to the article

The reference is ONLY for character identity. Everything else should be fresh and unique!
Keep the final look cute, lively, and anime-like. Avoid stiff realistic 3D toy/figurine rendering.
Use small, simple, natural anime-style hands. Keep at most two visible hands, avoid detailed fingers, and hide hands if the pose becomes anatomically complex.

Now create a thumbnail following these rules:

${prompt}`
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

  // リトライ付きでAPI呼び出し
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Nano Banana 2 Lite（Gemini 3.1 Flash Lite Image）を使用
      const response: Response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`,
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

        // リトライ可能なエラー
        if (isRetryableError(response.status) && attempt < MAX_RETRIES) {
          const waitSec = response.status === 429 ? 10 : 3;
          console.warn(`⏳ API ${response.status}エラー。${waitSec}秒後にリトライ（${attempt + 1}/${MAX_RETRIES}）`);
          await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
          continue;
        }

        // 429エラー（レート制限）リトライ失敗
        if (response.status === 429) {
          return {
            success: false,
            error: 'APIのレート制限に達しました。しばらく時間をおいてから再度お試しください。',
            referenceImageFailures
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
            return generateThumbnail(apiKey, title, character, true, promptContext);
          }
          return {
            success: false,
            error: 'センシティブなコンテンツのため画像を生成できませんでした。タイトルの表現を変更してください。',
            referenceImageFailures
          };
        }

        return {
          success: false,
          error: errorData.error?.message || `API Error: ${response.status}`,
          referenceImageFailures
        };
      }

      interface GeminiCandidate {
        finishReason?: string;
        content?: {
          parts?: Array<{ inlineData?: { data: string; mimeType: string } }>;
        };
      }
      interface GeminiResponse {
        candidates?: GeminiCandidate[];
      }
      const data = await response.json() as GeminiResponse;

      // 安全フィルターでブロックされた場合
      if (data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        const finishReason = candidate.finishReason;

        if (finishReason === 'SAFETY' || finishReason === 'IMAGE_SAFETY') {
          if (!sanitize) {
            console.log('安全フィルターでブロック。サニタイズして再試行...');
            return generateThumbnail(apiKey, title, character, true, promptContext);
          }
          return {
            success: false,
            error: 'センシティブなコンテンツのため画像を生成できませんでした。',
            referenceImageFailures
          };
        }
      }

      // 画像データを探す
      if (!data.candidates?.[0]?.content?.parts) {
        return {
          success: false,
          error: '画像データが返されませんでした',
          referenceImageFailures
        };
      }

      const responseParts = data.candidates[0].content.parts;
      const imagePart = responseParts.find((part) => part.inlineData);

      if (!imagePart?.inlineData?.data) {
        return {
          success: false,
          error: '画像データが見つかりませんでした',
          referenceImageFailures
        };
      }

      return {
        success: true,
        imageBase64: imagePart.inlineData.data,
        referenceImageFailures
      };

    } catch (error) {
      // タイムアウトやネットワークエラーのリトライ
      if (attempt < MAX_RETRIES) {
        console.warn(`⏳ ネットワークエラー。3秒後にリトライ（${attempt + 1}/${MAX_RETRIES}）:`, error);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      console.error('Thumbnail generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '画像生成に失敗しました',
        referenceImageFailures
      };
    }
  }

  // ここには到達しないはずだが念のため
  return { success: false, error: '予期しないエラーが発生しました', referenceImageFailures: 0 };
}

/**
 * OpenAI API で画像を生成
 * モデル: gpt-image-1 または gpt-image-1-mini
 * 参考画像がある場合はマルチモーダル入力で忠実にキャラクターを再現
 */
export async function generateThumbnailWithOpenAI(
  apiKey: string,
  title: string,
  character?: ThumbnailCharacter,
  sanitize = false,
  model: 'gpt-image-1' | 'gpt-image-1-mini' = 'gpt-image-1',
  quality: 'low' | 'medium' | 'high' = 'medium',
  promptContext: ThumbnailPromptContext = {}
): Promise<ThumbnailGenerationResult> {
  // プロンプトを生成
  const promptPlan = sanitize ? null : await createThumbnailPromptPlan(title, promptContext);
  const basePrompt = generatePromptFromTitle(title, character, sanitize, formatThumbnailPromptPlan(promptPlan));

  // マルチモーダル入力のcontentを構築
  const content: Array<{ type: string; text?: string; image_url?: string }> = [];

  // 参考画像を取得して先頭に追加
  let hasReferenceImages = false;
  let referenceImageFailures = 0;
  const totalReferenceImages = character?.referenceImageUrls?.length || 0;

  if (character?.referenceImageUrls && character.referenceImageUrls.length > 0) {
    const imagesToUse = character.referenceImageUrls.slice(0, 3);
    console.log('📷 [OpenAI] 参考画像を読み込み中...', imagesToUse.length, '枚');

    for (const imageUrl of imagesToUse) {
      const imageData = await fetchImageAsBase64(imageUrl);
      if (imageData) {
        content.push({
          type: 'input_image',
          image_url: `data:${imageData.mimeType};base64,${imageData.data}`
        });
        console.log('✓ [OpenAI] 参考画像を追加しました:', imageUrl);
        hasReferenceImages = true;
      } else {
        referenceImageFailures++;
        console.warn('⚠️ [OpenAI] 参考画像の読み込みに失敗:', imageUrl);
      }
    }

    if (referenceImageFailures > 0 && !hasReferenceImages) {
      console.warn(`⚠️ [OpenAI] 全ての参考画像（${totalReferenceImages}枚）の読み込みに失敗。キャラクター一貫性が低下する可能性があります`);
    }
  }

  // プロンプトを構築
  let fullPrompt = basePrompt;
  if (hasReferenceImages) {
    fullPrompt = `⚠️ CHARACTER IDENTITY INSTRUCTION ⚠️

The reference image(s) show the character "${character?.name || 'キャラクター'}" that must appear in the thumbnail.

🔒 KEEP THE SAME (identity only):
- Cute anime/illustration mascot style, with soft 2.5D anime shading
- Face shape, eye shape, eye color
- Hair color, hair style, hair length
- All accessories (glasses, ribbons, cat ears, hair clips)

🔄 MUST BE DIFFERENT FROM REFERENCE (create variety!):
- POSE: Create a completely NEW and DIFFERENT pose! Do NOT copy the reference pose!
- EXPRESSION: Match the article's mood (happy, shocked, angry, etc.)
- OUTFIT: Change clothing to match the scene/article theme
- ANGLE: Use a different camera angle than the reference
- ACTION: Show the character DOING something related to the article

The reference is ONLY for character identity. Everything else should be fresh and unique!
Keep the final look cute, lively, and anime-like. Avoid stiff realistic 3D toy/figurine rendering.
Use small, simple, natural anime-style hands. Keep at most two visible hands, avoid detailed fingers, and hide hands if the pose becomes anatomically complex.

Now create a thumbnail following these rules:

${basePrompt}`;
  }

  let apiUrl: string;
  let fetchOptions: RequestInit;

  if (hasReferenceImages) {
    // 参考画像あり: /v1/images/edits（multipart/form-data）
    apiUrl = 'https://api.openai.com/v1/images/edits';
    const formData = new FormData();
    formData.append('model', model);
    formData.append('prompt', fullPrompt);
    formData.append('size', '1024x1024');
    formData.append('quality', quality);

    for (const imgInput of content) {
      if (imgInput.type === 'input_image' && imgInput.image_url) {
        const base64Match = imgInput.image_url.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          const mimeType = base64Match[1];
          const base64Data = base64Match[2];
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const ext = mimeType.split('/')[1] || 'png';
          const blob = new Blob([bytes], { type: mimeType });
          formData.append('image[]', blob, `ref.${ext}`);
        }
      }
    }

    fetchOptions = {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData
    };
  } else {
    // 参考画像なし: /v1/images/generations（JSON）
    apiUrl = 'https://api.openai.com/v1/images/generations';
    fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        prompt: fullPrompt,
        quality: quality,
        size: '1024x1024',
        response_format: 'b64_json',
      })
    };
  }

  // リトライ付きでAPI呼び出し
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(apiUrl, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }

        // リトライ可能なエラー
        if (isRetryableError(response.status) && attempt < MAX_RETRIES) {
          const waitSec = response.status === 429 ? 10 : 3;
          console.warn(`⏳ [OpenAI] API ${response.status}エラー。${waitSec}秒後にリトライ（${attempt + 1}/${MAX_RETRIES}）`);
          await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
          continue;
        }

        if (response.status === 429) {
          return {
            success: false,
            error: 'APIのレート制限に達しました。しばらく時間をおいてから再度お試しください。',
            referenceImageFailures
          };
        }

        const errorMessage = errorData.error?.message || errorText;

        // コンテンツポリシー違反
        if (errorMessage.includes('safety') || errorMessage.includes('content_policy') || errorMessage.includes('blocked')) {
          if (!sanitize) {
            console.log('[OpenAI] コンテンツポリシー違反。サニタイズして再試行...');
            return generateThumbnailWithOpenAI(apiKey, title, character, true, model, quality, promptContext);
          }
          return {
            success: false,
            error: 'コンテンツポリシーにより画像を生成できませんでした。タイトルの表現を変更してください。',
            referenceImageFailures
          };
        }

        return {
          success: false,
          error: errorData.error?.message || `API Error: ${response.status}`,
          referenceImageFailures
        };
      }

      interface OpenAIImageResponse {
        data?: Array<{ b64_json?: string }>;
      }
      const data = await response.json() as OpenAIImageResponse;

      if (!data.data?.[0]?.b64_json) {
        return {
          success: false,
          error: '画像データが返されませんでした',
          referenceImageFailures
        };
      }

      return {
        success: true,
        imageBase64: data.data[0].b64_json,
        referenceImageFailures
      };

    } catch (error) {
      // タイムアウトやネットワークエラーのリトライ
      if (attempt < MAX_RETRIES) {
        console.warn(`⏳ [OpenAI] ネットワークエラー。3秒後にリトライ（${attempt + 1}/${MAX_RETRIES}）:`, error);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      console.error('[OpenAI] Thumbnail generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '画像生成に失敗しました',
        referenceImageFailures
      };
    }
  }

  // ここには到達しないはずだが念のため
  return { success: false, error: '予期しないエラーが発生しました', referenceImageFailures: 0 };
}

/**
 * Base64画像をData URLに変換
 */
export function base64ToDataUrl(base64: string, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${base64}`;
}
