import type { BlogSettings, Comment, Talk } from './types';

export const OHIME_BLOG_ID = 'local-ohimechan';
export const OHIME_BLOG_NAME = 'おにひめちゃん';
export const OHIME_LIVEDOOR_BLOG_ID = 'onihimechan';
export const LIFE_BLOG_ROUTING_BADGE = 'ガルちゃんのみ';

type LifestyleBlogDefinition = {
  id: string;
  name: string;
  blogId: string;
  legacyNames?: readonly string[];
  legacyBlogIds?: readonly string[];
};

export const LIFESTYLE_BLOGS: readonly LifestyleBlogDefinition[] = [
  {
    id: 'local-kijo-matome',
    name: '鬼女まとめ',
    blogId: 'kijyosokuhou',
  },
  {
    id: 'local-kongai-channel',
    name: '婚外ちゃんねる',
    blogId: 'kongaich',
  },
  {
    id: 'local-kichisawa',
    name: '基地沢',
    blogId: 'tozayamitozayami',
  },
  {
    id: 'local-okusama',
    name: '奥様',
    blogId: 'okusamakijyo',
  },
  {
    id: 'local-unbiri',
    name: 'アンビリ',
    blogId: 'uwakimon',
  },
  {
    id: 'local-mojolica',
    name: '喪女リカ',
    blogId: 'mojolicamojorca',
  },
  {
    id: 'local-ikari-shintou',
    name: '怒り新党',
    blogId: 'ikarishintou',
  },
  {
    id: OHIME_BLOG_ID,
    name: OHIME_BLOG_NAME,
    blogId: OHIME_LIVEDOOR_BLOG_ID,
    legacyNames: ['おひめちゃん'],
    legacyBlogIds: ['ohimechan'],
  },
  {
    id: 'local-heart-life',
    name: 'はーとらいふ',
    blogId: 'heart_life8',
  },
  {
    id: 'local-kichimama',
    name: 'キチママちゃんねる',
    blogId: 'kichimamach',
  },
  {
    id: 'local-saikyo-kijyo',
    name: '最強の鬼女様',
    blogId: 'saikyokijyo',
  },
  {
    id: 'local-kijoume',
    name: '鬼女梅',
    blogId: 'kijoume',
  },
];

const SHARED_LIVEDOOR_AUTH_BLOG_IDS = new Set([
  'garlsvip',
  'matome_blade',
  'mnuhkhkbxmagwje',
  ...LIFESTYLE_BLOGS.map((blog) => blog.blogId),
]);

const NEWS_LIKE_BOARDS = new Set([
  'news',
  'newsplus',
  'mnewsplus',
  'bizplus',
  'seijinewsplus',
  'femnewsplus',
  'scienceplus',
  'dqnplus',
  'wildplus',
  'liveplus',
]);

const LIFE_OR_CHAT_BOARDS = new Set([
  'livegalileo',
  'livejupiter',
  'news4vip',
  'morningcoffee',
]);

const NEWS_LIKE_TITLE_PATTERNS = [
  /ニュース/,
  /速報/,
  /報道/,
  /発表/,
  /政府/,
  /首相/,
  /大臣/,
  /国会/,
  /選挙/,
  /事件/,
  /事故/,
  /逮捕/,
  /起訴/,
  /裁判/,
  /判決/,
  /政治/,
  /経済/,
  /株価/,
  /円安/,
  /円高/,
  /芸能/,
  /スポーツ/,
  /MLB/i,
  /サッカー/,
  /野球/,
];

const GIRLS_CHANNEL_NEWS_TITLE_PATTERNS = [
  /ニュース/,
  /速報/,
  /報道/,
  /新聞/,
  /通信/,
  /発表/,
  /事件/,
  /事故/,
  /逮捕/,
  /容疑/,
  /起訴/,
  /裁判/,
  /判決/,
  /被告/,
  /警察/,
  /死亡/,
  /死去/,
  /殺人/,
  /暴行/,
  /強盗/,
  /詐欺/,
  /火災/,
  /災害/,
  /地震/,
  /台風/,
  /政府/,
  /首相/,
  /大臣/,
  /国会/,
  /選挙/,
  /政治/,
  /政党/,
  /経済/,
  /株価/,
  /円安/,
  /円高/,
  /外交/,
  /防衛/,
  /増税/,
  /減税/,
  /Yahoo!ニュース/i,
  /NHK/,
  /共同通信/,
  /時事通信/,
];

const SPORTS_OR_CELEBRITY_PATTERNS = [
  /芸能/,
  /芸能人/,
  /俳優/,
  /女優/,
  /タレント/,
  /アイドル/,
  /歌手/,
  /声優/,
  /モデル/,
  /グラドル/,
  /アナウンサー/,
  /インフルエンサー/,
  /YouTuber/i,
  /ユーチューバー/,
  /お笑い/,
  /芸人/,
  /司会/,
  /熱愛/,
  /芸能界/,
  /スポーツ/,
  /プロ野球/,
  /野球/,
  /サッカー/,
  /バスケ/,
  /バスケット/,
  /ラグビー/,
  /バレー/,
  /テニス/,
  /卓球/,
  /ゴルフ/,
  /大相撲/,
  /力士/,
  /格闘技/,
  /ボクシング/,
  /Jリーグ/i,
  /Bリーグ/i,
  /MLB/i,
  /NBA/i,
  /NFL/i,
  /W杯/,
  /ワールドカップ/,
  /五輪/,
  /オリンピック/,
  /日本代表/,
  /侍ジャパン/,
  /ドジャース/,
  /パドレス/,
  /メッツ/,
  /カブス/,
  /レッドソックス/,
  /ジャイアンツ/,
  /エンゼルス/,
  /ヤンキース/,
  /投手/,
  /先発/,
  /完封/,
  /完投/,
  /無失点/,
  /奪三振/,
  /\d+\s*K/i,
  /大谷/,
  /山本由伸/,
  /山本由伸さん/,
  /佐々木朗希/,
  /ダルビッシュ/,
  /鈴木誠也/,
  /今永昇太/,
  /吉田正尚/,
  /千賀滉大/,
  /村上宗隆/,
  /久保建英/,
  /三笘薫/,
];

const POLITICAL_TOPIC_PATTERNS = [
  /政治/,
  /政界/,
  /政府/,
  /与党/,
  /野党/,
  /国会/,
  /内閣/,
  /首相/,
  /総理/,
  /大臣/,
  /官房長官/,
  /政党/,
  /自民党/,
  /立憲/,
  /維新/,
  /公明党/,
  /共産党/,
  /国民民主/,
  /れいわ/,
  /参政党/,
  /社民党/,
  /選挙/,
  /投票/,
  /候補者/,
  /議員/,
  /衆院/,
  /参院/,
  /知事/,
  /市長/,
  /都議/,
  /県議/,
  /条例/,
  /法案/,
  /増税/,
  /減税/,
  /外交/,
  /安全保障/,
  /防衛/,
  /憲法/,
  /改憲/,
  /保守/,
  /リベラル/,
  /左派/,
  /右派/,
];

const LIFE_OR_CHAT_TOPIC_PATTERNS = [
  /生活/,
  /日常/,
  /暮らし/,
  /雑談/,
  /相談/,
  /悩み/,
  /愚痴/,
  /あるある/,
  /体験談/,
  /人間関係/,
  /友達/,
  /知人/,
  /近所/,
  /ご近所/,
  /職場/,
  /仕事/,
  /バイト/,
  /パート/,
  /家族/,
  /親/,
  /母親/,
  /父親/,
  /兄弟/,
  /姉妹/,
  /夫/,
  /妻/,
  /旦那/,
  /嫁/,
  /義母/,
  /義父/,
  /義実家/,
  /姑/,
  /舅/,
  /子供/,
  /子ども/,
  /育児/,
  /子育て/,
  /ママ友/,
  /学校/,
  /保育園/,
  /幼稚園/,
  /恋愛/,
  /彼氏/,
  /彼女/,
  /結婚/,
  /離婚/,
  /婚活/,
  /家事/,
  /料理/,
  /掃除/,
  /洗濯/,
  /片付け/,
  /節約/,
  /買い物/,
  /スーパー/,
  /ご飯/,
  /食事/,
  /部屋/,
  /家/,
  /賃貸/,
  /引っ越し/,
  /美容/,
  /服/,
  /ファッション/,
  /メイク/,
  /健康/,
  /睡眠/,
  /眠れない/,
  /寝れない/,
  /寝不足/,
  /昼夜逆転/,
  /夜更かし/,
  /早起き/,
  /直し方/,
  /治し方/,
  /どうすれば/,
  /どうしたら/,
  /病院/,
  /介護/,
];

export function normalizeBlogSettingsForSharedAuth(blogs: BlogSettings[]): BlogSettings[] {
  return blogs.map((blog) => {
    const migratedLegacyBlog = migrateLegacyLifestyleBlog(blog);
    const lifestyleBlog = findLifestyleBlogDefinition(migratedLegacyBlog);
    const migratedBlog = lifestyleBlog
      ? {
          ...migratedLegacyBlog,
          name: lifestyleBlog.name,
          blogId: lifestyleBlog.blogId,
          apiUsername: migratedLegacyBlog.apiUsername || 'garlsvip',
        }
      : migratedLegacyBlog;

    if (
      migratedBlog.blogType !== 'girls-matome' &&
      !migratedBlog.apiUsername &&
      SHARED_LIVEDOOR_AUTH_BLOG_IDS.has(migratedBlog.blogId)
    ) {
      return { ...migratedBlog, apiUsername: 'garlsvip' };
    }
    return migratedBlog;
  });
}

function migrateLegacyLifestyleBlog(blog: BlogSettings): BlogSettings {
  if (blog.id === 'local-kichisawa' && blog.blogId === 'kijyosokuhou') {
    return {
      ...blog,
      id: 'local-kijo-matome',
      name: '鬼女まとめ',
      blogId: 'kijyosokuhou',
    };
  }

  return blog;
}

export function ensureLifestyleBlogs(blogs: BlogSettings[]): BlogSettings[] {
  const normalizedBlogs = normalizeBlogSettingsForSharedAuth(blogs);
  const credentialSource = normalizedBlogs.find((blog) =>
    blog.blogType !== 'girls-matome' &&
    SHARED_LIVEDOOR_AUTH_BLOG_IDS.has(blog.blogId) &&
    blog.apiKey
  );

  if (!credentialSource?.apiKey) return normalizedBlogs;

  const nextBlogs = [...normalizedBlogs];
  for (const lifestyleBlog of LIFESTYLE_BLOGS) {
    if (nextBlogs.some((blog) => matchesLifestyleBlog(blog, lifestyleBlog))) continue;

    nextBlogs.push({
      id: lifestyleBlog.id,
      name: lifestyleBlog.name,
      blogId: lifestyleBlog.blogId,
      apiUsername: credentialSource.apiUsername || 'garlsvip',
      apiKey: credentialSource.apiKey,
      blogType: 'livedoor',
      disabled: false,
    });
  }
  return nextBlogs;
}

export function ensureLifestyleBlogsSelectedForOtherBlogs(settingsText: string | null): string | null {
  if (!settingsText) return settingsText;

  try {
    const settings = JSON.parse(settingsText) as {
      postToOtherBlogs?: boolean;
      selectedOtherBlogIds?: string[];
    };

    if (!settings.postToOtherBlogs) return settingsText;
    const selectedIds = Array.isArray(settings.selectedOtherBlogIds)
      ? [...new Set(settings.selectedOtherBlogIds)]
      : [];
    const nextSelectedIds = [
      ...selectedIds,
      ...LIFESTYLE_BLOGS.map((blog) => blog.id).filter((id) => !selectedIds.includes(id)),
    ];
    if (nextSelectedIds.length === selectedIds.length) return settingsText;

    return JSON.stringify({
      ...settings,
      selectedOtherBlogIds: nextSelectedIds,
    });
  } catch {
    return settingsText;
  }
}

/** @deprecated Use ensureLifestyleBlogs. */
export function ensureOhimeBlog(blogs: BlogSettings[]): BlogSettings[] {
  return ensureLifestyleBlogs(blogs);
}

/** @deprecated Use ensureLifestyleBlogsSelectedForOtherBlogs. */
export function ensureOhimeSelectedForOtherBlogs(settingsText: string | null): string | null {
  return ensureLifestyleBlogsSelectedForOtherBlogs(settingsText);
}

export function isOhimeBlog(blog: Pick<BlogSettings, 'id' | 'name' | 'blogId'>): boolean {
  const ohimeBlog = LIFESTYLE_BLOGS.find((definition) => definition.id === OHIME_BLOG_ID);
  return !!ohimeBlog && matchesLifestyleBlog(blog, ohimeBlog);
}

export function isLifestyleBlog(blog: Pick<BlogSettings, 'id' | 'name' | 'blogId'>): boolean {
  return !!findLifestyleBlogDefinition(blog);
}

function findLifestyleBlogDefinition(blog: Pick<BlogSettings, 'id' | 'name' | 'blogId'>): LifestyleBlogDefinition | undefined {
  return LIFESTYLE_BLOGS.find((definition) => matchesLifestyleBlog(blog, definition));
}

function matchesLifestyleBlog(
  blog: Pick<BlogSettings, 'id' | 'name' | 'blogId'>,
  definition: LifestyleBlogDefinition,
): boolean {
  return (
    blog.id === definition.id ||
    blog.blogId === definition.blogId ||
    definition.legacyBlogIds?.includes(blog.blogId) === true ||
    blog.name.includes(definition.name) ||
    definition.legacyNames?.some((name) => blog.name.includes(name)) === true
  );
}

function extractBoardFromUrl(url: string): string | null {
  const fiveChMatch = url.match(/5ch\.(?:net|io)\/test\/read\.cgi\/([a-z0-9_]+)\//i);
  if (fiveChMatch) return fiveChMatch[1].toLowerCase();

  const talkMatch = url.match(/talk\.jp\/boards\/([a-z0-9_]+)\//i);
  if (talkMatch) return talkMatch[1].toLowerCase();

  const open2chMatch = url.match(/open2ch\.net\/test\/read\.cgi\/([a-z0-9_]+)\//i);
  if (open2chMatch) return open2chMatch[1].toLowerCase();

  return null;
}

function isGirlsChannelUrl(url?: string): boolean {
  return /girlschannel\.net\/topics\/\d+/i.test(url || '');
}

export function isNewsLikeArticle(params: {
  url?: string;
  title?: string;
  tags?: string[];
  talk?: Pick<Talk, 'title' | 'tag_names'> | null;
}): boolean {
  const board = params.url ? extractBoardFromUrl(params.url) : null;
  if (board && NEWS_LIKE_BOARDS.has(board)) return true;

  const title = `${params.title || ''} ${params.talk?.title || ''}`;
  if (NEWS_LIKE_TITLE_PATTERNS.some((pattern) => pattern.test(title))) return true;

  const tags = [...(params.tags || []), ...(params.talk?.tag_names || [])].join(' ');
  return /ニュース|政治|経済|芸能|スポーツ|事件|事故|速報|報道/.test(tags);
}

export function isGirlsChannelNewsOrPoliticalArticle(params: {
  url?: string;
  title?: string;
  tags?: string[];
  talk?: Pick<Talk, 'title' | 'tag_names'> | null;
  comments?: Pick<Comment, 'res_id' | 'body'>[];
}): boolean {
  if (!isGirlsChannelUrl(params.url)) return false;
  if (isPoliticalTopic(params)) return true;

  const tags = [...(params.tags || []), ...(params.talk?.tag_names || [])].join(' ');
  if (/ニュース|政治|経済|事件|事故|速報|報道/.test(tags)) return true;

  const text = [
    params.title || '',
    params.talk?.title || '',
    getFirstCommentBody(params.comments),
  ].join(' ');

  return GIRLS_CHANNEL_NEWS_TITLE_PATTERNS.some((pattern) => pattern.test(text));
}

function getFirstCommentBody(comments?: Pick<Comment, 'res_id' | 'body'>[]): string {
  return comments?.find((comment) => String(comment.res_id) === '1')?.body || '';
}

export function isSportsOrCelebrityTopic(params: {
  title?: string;
  tags?: string[];
  talk?: Pick<Talk, 'title' | 'tag_names'> | null;
  comments?: Pick<Comment, 'res_id' | 'body'>[];
}): boolean {
  const tags = [...(params.tags || []), ...(params.talk?.tag_names || [])].join(' ');
  const text = [
    params.title || '',
    params.talk?.title || '',
    tags,
    getFirstCommentBody(params.comments),
  ].join(' ');

  return SPORTS_OR_CELEBRITY_PATTERNS.some((pattern) => pattern.test(text));
}

export function isPoliticalTopic(params: {
  title?: string;
  tags?: string[];
  talk?: Pick<Talk, 'title' | 'tag_names'> | null;
  comments?: Pick<Comment, 'res_id' | 'body'>[];
}): boolean {
  const tags = [...(params.tags || []), ...(params.talk?.tag_names || [])].join(' ');
  const text = [
    params.title || '',
    params.talk?.title || '',
    tags,
    getFirstCommentBody(params.comments),
  ].join(' ');

  return POLITICAL_TOPIC_PATTERNS.some((pattern) => pattern.test(text));
}

export function isLifeOrChatTopic(params: {
  url?: string;
  title?: string;
  tags?: string[];
  talk?: Pick<Talk, 'title' | 'tag_names'> | null;
  comments?: Pick<Comment, 'res_id' | 'body'>[];
}): boolean {
  const board = params.url ? extractBoardFromUrl(params.url) : null;
  if (board && LIFE_OR_CHAT_BOARDS.has(board)) return true;

  const tags = [...(params.tags || []), ...(params.talk?.tag_names || [])].join(' ');
  const text = [
    params.title || '',
    params.talk?.title || '',
    tags,
    getFirstCommentBody(params.comments),
  ].join(' ');

  return LIFE_OR_CHAT_TOPIC_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasUrlInFirstComment(comments?: Pick<Comment, 'res_id' | 'body'>[]): boolean {
  const firstCommentBody = getFirstCommentBody(comments);
  if (!firstCommentBody) return false;
  return /(?:https?:\/\/|www\.)[^\s<>"']+/i.test(firstCommentBody);
}

export function shouldSkipOtherBlogPost(blog: BlogSettings, params: {
  url?: string;
  title?: string;
  tags?: string[];
  talk?: Pick<Talk, 'title' | 'tag_names'> | null;
  comments?: Pick<Comment, 'res_id' | 'body'>[];
}): boolean {
  return getOtherBlogPostSkipReason(blog, params) !== null;
}

export function getOtherBlogPostSkipReason(blog: BlogSettings, params: {
  url?: string;
  title?: string;
  tags?: string[];
  talk?: Pick<Talk, 'title' | 'tag_names'> | null;
  comments?: Pick<Comment, 'res_id' | 'body'>[];
}): string | null {
  if (!isLifestyleBlog(blog)) return null;

  if (!isGirlsChannelUrl(params.url)) {
    return 'ガルちゃん以外の記事のため';
  }

  if (isGirlsChannelNewsOrPoliticalArticle(params)) {
    return isPoliticalTopic(params) ? '政治系記事のため' : 'ニュース系記事のため';
  }

  return null;
}
