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

export interface BlogSettings {
  id: string;
  name: string;
  blogId: string;
  apiKey: string;
}