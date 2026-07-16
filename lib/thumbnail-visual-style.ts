export type ThumbnailVisualStyle =
  | 'anime_key_visual'
  | 'editorial_photo'
  | 'product_photo'
  | 'mascot';

const POLITICS_OR_INCIDENT = /政治|政府|国会|選挙|議員|首相|大臣|政党|事件|事故|逮捕|裁判|災害|地震|台風|火災|死亡|殺人|強盗|詐欺|避難/;
const REAL_PERSON_TOPIC = /芸能|俳優|女優|タレント|アイドル|歌手|声優|モデル|芸人|YouTuber|スポーツ|野球|サッカー|選手|試合|投手|先発|登板|無失点|奪三振|ホームラン|ゴール|優勝|MLB|NBA|五輪|オリンピック/i;
const PHOTO_FRIENDLY_TOPIC = /料理|ご飯|食事|弁当|外食|カフェ|レストラン|食べ|グルメ|ラーメン|うどん|そば|寿司|焼肉|カレー|パン|スイーツ|ケーキ|コーヒー|旅行|観光|温泉|ホテル|風景|景色|商品|新製品|家電|家具|ガジェット|スマホ|パソコン|自動車|コスメ/;
const ANIME_FRIENDLY_TOPIC = /生活|日常|暮らし|雑談|相談|悩み|愚痴|あるある|家族|親|夫|妻|旦那|嫁|子供|育児|恋愛|彼氏|彼女|結婚|離婚|仕事|職場|学校|ゲーム|漫画|アニメ|ネット|面白/;

export function inferThumbnailVisualStyle(title: string, firstCommentBody = ''): ThumbnailVisualStyle {
  const context = `${title}\n${firstCommentBody.slice(0, 800)}`;
  if (POLITICS_OR_INCIDENT.test(context)) return 'editorial_photo';
  if (REAL_PERSON_TOPIC.test(context)) return 'anime_key_visual';
  if (PHOTO_FRIENDLY_TOPIC.test(context)) return 'product_photo';
  if (ANIME_FRIENDLY_TOPIC.test(context)) return 'anime_key_visual';
  return 'mascot';
}

export function validateThumbnailVisualStyle(
  requested: unknown,
  title: string,
  firstCommentBody = ''
): ThumbnailVisualStyle {
  const inferred = inferThumbnailVisualStyle(title, firstCommentBody);
  if (requested !== 'anime_key_visual' && requested !== 'editorial_photo'
    && requested !== 'product_photo' && requested !== 'mascot') {
    return inferred;
  }

  const context = `${title}\n${firstCommentBody.slice(0, 800)}`;
  if (POLITICS_OR_INCIDENT.test(context)) return 'editorial_photo';
  if (REAL_PERSON_TOPIC.test(context) && (requested === 'editorial_photo' || requested === 'product_photo')) {
    return 'anime_key_visual';
  }
  if (requested === 'editorial_photo' && !POLITICS_OR_INCIDENT.test(context)) return inferred;
  if (requested === 'product_photo' && !PHOTO_FRIENDLY_TOPIC.test(context)) return inferred;
  return requested;
}

export function isPhotographicThumbnailStyle(style: ThumbnailVisualStyle): boolean {
  return style === 'editorial_photo' || style === 'product_photo';
}

export function thumbnailStylePrompt(style: ThumbnailVisualStyle): string {
  switch (style) {
    case 'editorial_photo':
      return `Create a clearly illustrative editorial photograph, not documentary evidence. Show no identifiable person and no human face. Use symbolic objects, architecture, weather, empty locations, or anonymous silhouettes only. Cinematic but restrained newsroom color grading. Never imply that the generated scene is a real photograph of the reported event.`;
    case 'product_photo':
      return `Create a premium realistic commercial photograph focused on the food, place, scenery, product category, or object. Natural materials, believable lighting, clean composition, shallow depth of field where appropriate. Do not invent a brand logo, package text, or identifiable person.`;
    case 'mascot':
      return `Create a polished Garubi-like original anime mascot illustration with a clean background, friendly expression, refined linework, luminous color, and a simple reusable composition.`;
    default:
      return `Create polished modern Japanese anime key art with elegant stylized proportions, refined linework, luminous eyes, transparent light, vivid balanced colors, and cinematic depth. Never depict a real person's likeness.`;
  }
}
