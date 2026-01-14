// Shikutoku API Types
export interface Talk {
  id: string;
  title: string;
  body: string;
  tag_names?: string[];
  created_at: string;
  updated_at: string;
  views_count: number;
  sage_count: number;
  user_id?: string;
  hash_id: string;
  comment_count?: number;
  show_id?: boolean;
}

export interface Comment {
  id: string;
  res_id: string;
  name: string;
  name_id?: string;
  body: string;
  talk_id: string;
  created_at: string;
  images?: string[];
  is_talk_owner?: boolean;
  is_admin_muted?: boolean;
  is_user_muted?: boolean;
}

export interface CommentWithStyle extends Comment {
  color?: string;
  fontSize?: 'small' | 'medium' | 'large';
}

export interface MatomeOptions {
  includeImages: boolean;
  style: 'simple' | 'rich';
  includeTimestamp: boolean;
  includeName: boolean;
  commentStyle: {
    bold: boolean;
    fontSize: 'small' | 'medium' | 'large';
    color: string;
  };
}

export type BlogType = 'livedoor' | 'girls-matome';

export interface BlogSettings {
  id: string;
  name: string;
  blogId: string;  // Livedoor: ブログID, girls-matome: APIのURL
  apiKey: string;
  blogType?: BlogType;  // デフォルト: 'livedoor'（後方互換性）
}

// AIサムネイル用キャラクター設定
export interface ThumbnailCharacter {
  id: string;
  name: string;
  description: string;  // キャラの説明（プロンプト用）
  referenceImageUrls: string[];  // 参考画像URL（複数可）
}