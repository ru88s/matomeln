import type { BlogSettings, Comment, Talk } from './types';

export const OHIME_BLOG_ID = 'local-ohimechan';
export const OHIME_BLOG_NAME = 'おにひめちゃん';
export const OHIME_LIVEDOOR_BLOG_ID = 'onihimechan';
const OHIME_LEGACY_BLOG_IDS = ['ohimechan'] as const;

const SHARED_LIVEDOOR_AUTH_BLOG_IDS = [
  'garlsvip',
  'matome_blade',
  'mnuhkhkbxmagwje',
  OHIME_LIVEDOOR_BLOG_ID,
] as const;

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
  /ヤンキース/,
  /大谷/,
  /佐々木朗希/,
  /ダルビッシュ/,
  /久保建英/,
  /三笘薫/,
];

export function normalizeBlogSettingsForSharedAuth(blogs: BlogSettings[]): BlogSettings[] {
  return blogs.map((blog) => {
    const migratedBlog = isOhimeBlog(blog)
      ? {
          ...blog,
          name: OHIME_BLOG_NAME,
          blogId: OHIME_LIVEDOOR_BLOG_ID,
          apiUsername: blog.apiUsername || 'garlsvip',
        }
      : blog;

    if (
      migratedBlog.blogType !== 'girls-matome' &&
      !migratedBlog.apiUsername &&
      SHARED_LIVEDOOR_AUTH_BLOG_IDS.includes(migratedBlog.blogId as typeof SHARED_LIVEDOOR_AUTH_BLOG_IDS[number])
    ) {
      return { ...migratedBlog, apiUsername: 'garlsvip' };
    }
    return migratedBlog;
  });
}

export function ensureOhimeBlog(blogs: BlogSettings[]): BlogSettings[] {
  const normalizedBlogs = normalizeBlogSettingsForSharedAuth(blogs);
  const hasOhime = normalizedBlogs.some((blog) => isOhimeBlog(blog));
  if (hasOhime) return normalizedBlogs;

  const credentialSource = normalizedBlogs.find((blog) =>
    blog.blogType !== 'girls-matome' &&
    SHARED_LIVEDOOR_AUTH_BLOG_IDS.includes(blog.blogId as typeof SHARED_LIVEDOOR_AUTH_BLOG_IDS[number]) &&
    blog.apiKey
  );

  if (!credentialSource?.apiKey) return normalizedBlogs;

  return [
    ...normalizedBlogs,
    {
      id: OHIME_BLOG_ID,
      name: OHIME_BLOG_NAME,
      blogId: OHIME_LIVEDOOR_BLOG_ID,
      apiUsername: credentialSource.apiUsername || 'garlsvip',
      apiKey: credentialSource.apiKey,
      blogType: 'livedoor',
      disabled: false,
    },
  ];
}

export function ensureOhimeSelectedForOtherBlogs(settingsText: string | null): string | null {
  if (!settingsText) return settingsText;

  try {
    const settings = JSON.parse(settingsText) as {
      postToOtherBlogs?: boolean;
      selectedOtherBlogIds?: string[];
    };

    if (!settings.postToOtherBlogs) return settingsText;
    const selectedIds = Array.isArray(settings.selectedOtherBlogIds)
      ? settings.selectedOtherBlogIds
      : [];
    if (selectedIds.includes(OHIME_BLOG_ID)) return settingsText;

    return JSON.stringify({
      ...settings,
      selectedOtherBlogIds: [...selectedIds, OHIME_BLOG_ID],
    });
  } catch {
    return settingsText;
  }
}

export function isOhimeBlog(blog: Pick<BlogSettings, 'id' | 'name' | 'blogId'>): boolean {
  return (
    blog.id === OHIME_BLOG_ID ||
    blog.blogId === OHIME_LIVEDOOR_BLOG_ID ||
    OHIME_LEGACY_BLOG_IDS.includes(blog.blogId as typeof OHIME_LEGACY_BLOG_IDS[number]) ||
    blog.name.includes(OHIME_BLOG_NAME) ||
    blog.name.includes('おひめちゃん')
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
  if (!isOhimeBlog(blog)) return null;
  if (hasUrlInFirstComment(params.comments)) {
    return 'レス1にURLがある記事のため';
  }
  if (isSportsOrCelebrityTopic(params)) {
    return 'スポーツ・芸能人系記事のため';
  }
  if (isNewsLikeArticle(params)) {
    return 'ニュース系記事のため';
  }
  return null;
}
