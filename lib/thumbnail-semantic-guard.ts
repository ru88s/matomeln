export type ThumbnailSemanticStatus = 'accept' | 'reject' | 'review';

export interface ThumbnailSemanticCandidate {
  label?: string | null;
  target?: string | null;
  title?: string | null;
  keywords?: string[] | null;
  reason?: string | null;
}

export interface ThumbnailSemanticAssessment {
  status: ThumbnailSemanticStatus;
  reason: string;
}

type AmbiguousSense = 'music_drum' | 'laundry_drum' | null;

const MAX_LLM_REVIEW_MS = 10000;
const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'gemma4:e4b';

const DANGEROUSLY_GENERIC_LABELS = new Set([
  '本',
  '米',
  '中',
  '日',
  '人',
  '男',
  '女',
  '子',
  '親',
  '車',
  '店',
  '家',
  '金',
  '犬',
  '猫',
  '山',
  '川',
  '海',
]);

const DRUM_LAUNDRY_PATTERNS = [
  /ドラム式/,
  /ドラム洗濯/,
  /ドラム型洗濯/,
  /洗濯機/,
  /洗濯/,
  /乾燥機/,
  /家電/,
  /ランドリー/,
];

const DRUM_MUSIC_PATTERNS = [
  /ドラムセット/,
  /ドラマー/,
  /ドラミング/,
  /バンド/,
  /楽器/,
  /演奏/,
  /叩/,
  /スティック/,
  /シンバル/,
  /スネア/,
  /バスドラ/,
  /ライブ/,
  /スタジオ/,
  /ビート/,
  /リズム/,
  /音楽/,
  /ロック/,
  /ジャズ/,
  /吹奏楽/,
  /軽音/,
];

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ \t\r\n　"'`“”‘’「」『』【】\[\]（）()<>＜＞]/g, '');
}

function hasAnyPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function detectDrumSense(value: string): AmbiguousSense {
  if (!value.includes('ドラム')) return null;

  const hasLaundry = hasAnyPattern(value, DRUM_LAUNDRY_PATTERNS);
  const hasMusic = hasAnyPattern(value, DRUM_MUSIC_PATTERNS);

  if (hasLaundry && !hasMusic) return 'laundry_drum';
  if (hasMusic && !hasLaundry) return 'music_drum';

  return null;
}

function hasBareDrumLabel(candidate: ThumbnailSemanticCandidate): boolean {
  const label = normalize(candidate.label || '');
  if (label === 'ドラム') return true;

  const targetTokens = (candidate.target || '')
    .split(/[,、，\n\r\t/／|｜;；\s]+/)
    .map((token) => normalize(token))
    .filter(Boolean);

  return targetTokens.includes('ドラム');
}

function candidateText(candidate: ThumbnailSemanticCandidate): string {
  return [
    candidate.label,
    candidate.target,
    candidate.title,
    ...(candidate.keywords || []),
    candidate.reason,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');
}

export function isDangerouslyGenericThumbnailLabel(label: string): boolean {
  const normalized = normalize(label);
  if (!normalized || normalized.length < 2) return true;
  if (DANGEROUSLY_GENERIC_LABELS.has(normalized)) return true;
  if (/^[ぁ-ん]+$/.test(normalized)) return true;
  if (/^\d+$/.test(normalized)) return true;
  return false;
}

export function refineSemanticThumbnailKeywords(title: string, keywords: string[]): string[] {
  const sense = detectDrumSense(title);

  if (!sense) {
    return keywords.filter((keyword) => normalize(keyword) !== 'ドラム');
  }

  const filtered = keywords.filter((keyword) => {
    const normalizedKeyword = normalize(keyword);
    if (normalizedKeyword === 'ドラム') return false;
    const keywordSense = detectDrumSense(keyword);
    return !keywordSense || keywordSense === sense;
  });

  const semanticKeyword = sense === 'music_drum' ? '楽器ドラム' : 'ドラム式洗濯機';
  return Array.from(new Set([semanticKeyword, ...filtered]));
}

export function assessThumbnailSemanticFit(
  title: string,
  candidate: ThumbnailSemanticCandidate
): ThumbnailSemanticAssessment {
  const titleSense = detectDrumSense(title);
  const text = candidateText(candidate);
  const candidateSense = detectDrumSense(text);

  if (titleSense && candidateSense && titleSense !== candidateSense) {
    return {
      status: 'reject',
      reason: `ambiguous-drum-mismatch:${titleSense}->${candidateSense}`,
    };
  }

  if (titleSense === 'laundry_drum' && hasBareDrumLabel(candidate) && candidateSense !== 'laundry_drum') {
    return {
      status: 'reject',
      reason: 'bare-drum-tag-for-laundry-title',
    };
  }

  if (titleSense === 'music_drum' && hasBareDrumLabel(candidate) && candidateSense !== 'music_drum') {
    return {
      status: 'review',
      reason: 'bare-drum-tag-for-music-title',
    };
  }

  if (title.includes('ドラム') && !titleSense && candidateSense) {
    return {
      status: 'review',
      reason: `unknown-drum-title-with-${candidateSense}-candidate`,
    };
  }

  if (title.includes('ドラム') && text.includes('ドラム') && !titleSense && !candidateSense) {
    return {
      status: 'review',
      reason: 'ambiguous-bare-drum',
    };
  }

  return {
    status: 'accept',
    reason: 'semantic-fit',
  };
}

function getLocalOllamaConfig(): { endpoint: string; model: string; enabled: boolean } {
  if (typeof window === 'undefined') {
    return { endpoint: DEFAULT_OLLAMA_ENDPOINT, model: DEFAULT_OLLAMA_MODEL, enabled: false };
  }

  return {
    endpoint: (localStorage.getItem('matomeln_ollama_endpoint') || DEFAULT_OLLAMA_ENDPOINT).replace(/\/$/, ''),
    model: localStorage.getItem('matomeln_ollama_model') || DEFAULT_OLLAMA_MODEL,
    enabled:
      localStorage.getItem('matomeln_ai_summary_provider') === 'ollama' &&
      localStorage.getItem('matomeln_thumbnail_semantic_llm_guard') !== 'false',
  };
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

async function askLocalLLMForSemanticFit(
  title: string,
  candidate: ThumbnailSemanticCandidate,
  assessment: ThumbnailSemanticAssessment
): Promise<boolean | null> {
  const config = getLocalOllamaConfig();
  if (!config.enabled) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MAX_LLM_REVIEW_MS);

  const prompt = `記事タイトルとサムネ候補が同じ意味の画像として使えるか判定してください。
似ている単語でも別物なら match=false。
特に「ドラム」は楽器のドラムセットとドラム式洗濯機を混同しないでください。

記事タイトル:
${title}

サムネ候補:
${JSON.stringify(candidate, null, 2)}

機械判定:
${assessment.reason}

JSONだけ返却:
{"match":true|false,"reason":"短く"}`;

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
          temperature: 0,
          num_ctx: 2048,
          num_predict: 120,
        },
        messages: [
          {
            role: 'system',
            content: 'Return valid minified JSON only. The root object must be {"match":boolean,"reason":string}.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = await response.json() as { message?: { content?: string }; response?: string };
    const parsed = parseJsonObject(data.message?.content || data.response || '') as { match?: unknown; reason?: unknown } | null;
    if (!parsed || typeof parsed.match !== 'boolean') return null;

    if (!parsed.match) {
      console.warn('ローカルLLMがサムネ再利用を不採用:', parsed.reason || assessment.reason, candidate);
    }
    return parsed.match;
  } catch (error) {
    console.warn('ローカルLLMサムネ意味判定をスキップ:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function shouldUseThumbnailCandidate(
  title: string,
  candidate: ThumbnailSemanticCandidate
): Promise<boolean> {
  const assessment = assessThumbnailSemanticFit(title, candidate);

  if (assessment.status === 'reject') {
    console.warn('サムネ候補を意味不一致で不採用:', assessment.reason, candidate);
    return false;
  }

  if (assessment.status === 'accept') {
    return true;
  }

  const llmResult = await askLocalLLMForSemanticFit(title, candidate, assessment);
  if (llmResult !== null) return llmResult;

  console.warn('サムネ候補を曖昧判定で不採用:', assessment.reason, candidate);
  return false;
}
