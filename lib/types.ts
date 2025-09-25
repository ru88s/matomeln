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
}

export interface Comment {
  id: string;
  res_id: string;
  name: string;
  body: string;
  talk_id: string;
  created_at: string;
  images?: string[];
  is_talk_owner?: boolean;
  is_admin_muted?: boolean;
  is_user_muted?: boolean;
}

export interface MatomeOptions {
  includeImages: boolean;
  style: 'simple' | 'rich';
  includeTimestamp: boolean;
  includeName: boolean;
}