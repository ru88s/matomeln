import type { Comment } from './types';
import { type ThumbnailVisualStyle, validateThumbnailVisualStyle } from './thumbnail-visual-style';

export interface ThumbnailPromptContext {
  originalTitle?: string;
  firstCommentBody?: string;
  selectedComments?: Comment[];
  reuseTag?: string;
}

export interface ThumbnailPromptPlan {
  visualStyle: ThumbnailVisualStyle;
  category: string;
  scene: string;
  mainObjects: string[];
  emotion: string;
  characterAction: string;
  colorMood: string;
  avoid: string[];
  reuseTag: string;
  confidence: number;
  reason: string;
}

const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'gemma4:e4b';
const PROMPT_PLAN_TIMEOUT_MS = 12000;

const REQUIRED_AVOID_TERMS = [
  'visible text',
  'letters',
  'numbers',
  'article title text',
  'captions',
  'speech bubble text',
  'brand logos',
  'watermarks',
  'real person likeness',
  'specific celebrity face likeness',
  'graphic gore',
  'sexual content',
];

const UNSAFE_TEXT_PATTERNS = [
  /文字/,
  /テキスト/,
  /字幕/,
  /タイトル/,
  /見出し/,
  /ロゴ/,
  /看板/,
  /speech bubble/i,
  /text/i,
  /logo/i,
  /headline/i,
];

const DRUM_LAUNDRY_PATTERNS = [
  /ドラム式/,
  /ドラム洗濯/,
  /洗濯機/,
  /洗濯/,
  /乾燥機/,
  /ランドリー/,
  /washing machine/i,
  /laundry/i,
  /dryer/i,
];

const DRUM_MUSIC_PATTERNS = [
  /ドラムセット/,
  /ドラマー/,
  /楽器ドラム/,
  /バンド/,
  /楽器/,
  /演奏/,
  /シンバル/,
  /スネア/,
  /バスドラ/,
  /drum set/i,
  /drum kit/i,
  /cymbal/i,
  /snare/i,
  /drumstick/i,
  /concert/i,
  /music studio/i,
];

function getOllamaConfig(): { endpoint: string; model: string; enabled: boolean } {
  if (typeof window === 'undefined') {
    return { endpoint: DEFAULT_OLLAMA_ENDPOINT, model: DEFAULT_OLLAMA_MODEL, enabled: false };
  }

  const provider = localStorage.getItem('matomeln_ai_summary_provider');
  const explicit = localStorage.getItem('matomeln_thumbnail_prompt_planner');

  return {
    endpoint: (localStorage.getItem('matomeln_ollama_endpoint') || DEFAULT_OLLAMA_ENDPOINT).replace(/\/$/, ''),
    model: localStorage.getItem('matomeln_ollama_model') || DEFAULT_OLLAMA_MODEL,
    enabled: explicit === 'true' || (explicit !== 'false' && provider === 'ollama'),
  };
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned = value
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .filter((item) => !UNSAFE_TEXT_PATTERNS.some((pattern) => pattern.test(item)));

  return Array.from(new Set(cleaned)).slice(0, maxItems);
}

function parseJsonObject(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function detectDrumSense(value: string): 'laundry' | 'music' | null {
  if (!/ドラム|drum|laundry|washing/i.test(value)) return null;
  const laundry = DRUM_LAUNDRY_PATTERNS.some((pattern) => pattern.test(value));
  const music = DRUM_MUSIC_PATTERNS.some((pattern) => pattern.test(value));
  if (laundry && !music) return 'laundry';
  if (music && !laundry) return 'music';
  return null;
}

function hasDrumSenseMismatch(title: string, plan: ThumbnailPromptPlan): boolean {
  const titleSense = detectDrumSense(title);
  if (!titleSense) return false;

  const planText = [
    plan.category,
    plan.scene,
    plan.emotion,
    plan.characterAction,
    plan.colorMood,
    plan.reuseTag,
    ...plan.mainObjects,
    ...plan.avoid,
  ].join(' ');
  const planSense = detectDrumSense(planText);

  if (/ドラム|drum/i.test(title) && !titleSense && planSense) {
    return true;
  }

  return Boolean(planSense && planSense !== titleSense);
}

function compactComments(comments: Comment[] | undefined): string {
  if (!comments || comments.length === 0) return '';
  return comments
    .slice(0, 8)
    .map((comment) => `${comment.res_id}: ${comment.body.replace(/\s+/g, ' ').slice(0, 180)}`)
    .join('\n');
}

function normalizePlan(raw: unknown, title: string, firstCommentBody = ''): ThumbnailPromptPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const category = cleanText(record.category, 32);
  const scene = cleanText(record.scene, 120);
  const emotion = cleanText(record.emotion, 48);
  const characterAction = cleanText(record.characterAction, 100);
  const colorMood = cleanText(record.colorMood, 80);
  const reuseTag = cleanText(record.reuseTag, 32);
  const reason = cleanText(record.reason, 160);
  const confidence = typeof record.confidence === 'number' ? record.confidence : 0;
  const mainObjects = cleanList(record.mainObjects, 6, 40);
  const avoid = Array.from(new Set([...cleanList(record.avoid, 8, 50), ...REQUIRED_AVOID_TERMS]));

  if (!scene || mainObjects.length === 0 || confidence < 0.5) {
    return null;
  }

  return {
    visualStyle: validateThumbnailVisualStyle(record.visualStyle, title, firstCommentBody),
    category: category || 'generic',
    scene,
    mainObjects,
    emotion: emotion || 'curious',
    characterAction: characterAction || 'reacting to the topic with a cute expressive pose',
    colorMood: colorMood || 'clean vivid anime colors, luminous highlights, cinematic depth',
    avoid,
    reuseTag,
    confidence,
    reason,
  };
}

function buildPlanningPrompt(title: string, context: ThumbnailPromptContext): string {
  const originalTitle = context.originalTitle && context.originalTitle !== title
    ? `\n元記事タイトル: ${context.originalTitle}`
    : '';
  const firstComment = context.firstCommentBody
    ? `\nレス1本文:\n${context.firstCommentBody.slice(0, 900)}`
    : '';
  const selected = compactComments(context.selectedComments);
  const selectedBlock = selected ? `\n選択レス抜粋:\n${selected}` : '';
  const reuseTag = context.reuseTag ? `\n再利用タグ候補: ${context.reuseTag}` : '';

  return `まとめブログ用AIサムネイルの「演出設計JSON」を作ってください。
画像そのものは別AIで生成します。あなたは短い設計だけ返します。

目的:
- 記事内容に合う visualStyle を許可候補から1つ選ぶ
- 見た瞬間にテーマが分かる小物・背景・表情を選ぶ
- 文字やタイトルを画像内に入れず、絵だけで伝える
- 使い回し可能なサムネになりやすくする

厳守:
- JSON以外は返さない
- scene/mainObjects/emotion/characterAction/colorMood は英語または短い日本語で簡潔に
- 実在人物の顔・体型・服装を特定して描かせない。芸能人/選手/政治家は generic にする
- 画像内テキスト、文字、数字、ロゴ、看板、字幕、吹き出し文字は禁止
- アダルト、グロ、差別表現、攻撃的表現を避ける
- 「ドラム」は、ドラムセット/楽器、ドラム式洗濯機、ドラム缶を絶対に混同しない
- 不確実なら confidence を下げる

visualStyleの許可候補と選び方:
- anime_key_visual: 生活、恋愛、雑談、面白、ゲーム、漫画、芸能人、スポーツ選手
- product_photo: 食べ物、旅行、風景、商品。人物を主役にしない
- editorial_photo: 事件、政治、災害。人物の顔を出さず、象徴物や無人風景のみ
- mascot: 内容を判定できない場合
- 実在人物、芸能人、選手を写真風にしない

返却JSON:
{"visualStyle":"anime_key_visual|editorial_photo|product_photo|mascot","category":"","scene":"","mainObjects":[],"emotion":"","characterAction":"","colorMood":"","avoid":[],"reuseTag":"","confidence":0,"reason":""}

サムネ生成対象タイトル:
${title}${originalTitle}${reuseTag}${firstComment}${selectedBlock}`;
}

export async function createThumbnailPromptPlan(
  title: string,
  context: ThumbnailPromptContext = {}
): Promise<ThumbnailPromptPlan | null> {
  const config = getOllamaConfig();
  if (!config.enabled) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROMPT_PLAN_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        think: false,
        format: 'json',
        options: {
          temperature: 0.2,
          num_ctx: 4096,
          num_predict: 600,
        },
        messages: [
          {
            role: 'system',
            content: 'Return valid minified JSON only. No markdown. No explanation.',
          },
          {
            role: 'user',
            content: buildPlanningPrompt(title, context),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn('ローカルLLMサムネ設計をスキップ:', response.status);
      return null;
    }

    const data = await response.json() as { message?: { content?: string }; response?: string };
    const parsed = parseJsonObject(data.message?.content || data.response || '');
    const plan = normalizePlan(parsed, context.originalTitle || title, context.firstCommentBody);
    if (plan && hasDrumSenseMismatch(title, plan)) {
      console.warn('ローカルLLMサムネ設計を意味不一致で破棄:', title, plan);
      return null;
    }
    if (plan) {
      console.log('ローカルLLMサムネ設計:', plan);
    }
    return plan;
  } catch (error) {
    console.warn('ローカルLLMサムネ設計をスキップ:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function formatThumbnailPromptPlan(plan: ThumbnailPromptPlan | null): string {
  if (!plan) return '';

  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧭 VALIDATED LOCAL LLM THUMBNAIL PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use this validated plan as the primary visual direction. If any item conflicts with safety, no-text, or character-identity rules, ignore the conflicting item.

- Category: ${plan.category}
- Visual style: ${plan.visualStyle}
- Scene/backdrop: ${plan.scene}
- Main visual objects: ${plan.mainObjects.join(', ')}
- Character emotion: ${plan.emotion}
- Character action: ${plan.characterAction}
- Color mood: ${plan.colorMood}
- Reuse tag/theme: ${plan.reuseTag || 'none'}
- Avoid: ${plan.avoid.join(', ')}
- Plan confidence: ${plan.confidence.toFixed(2)}
- Plan reason: ${plan.reason || 'local LLM visual planning'}`;
}
