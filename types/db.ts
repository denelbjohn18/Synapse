export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Board = {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  starred: boolean;
  last_opened_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Cluster = {
  id: string;
  board_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type TopicSlot =
  | 'explain'
  | 'eli5'
  | 'fact'
  | 'images'
  | 'videos'
  | 'artifact';

export type Topic = {
  id: string;
  cluster_id: string;
  title: string;
  explanation: string | null;
  eli5: string | null;
  fact: string | null;
  images: string[];
  videos: { videoId: string; title: string; thumbnail: string }[];
  study_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BoardFilter =
  | { kind: 'all' }
  | { kind: 'starred' }
  | { kind: 'trash' }
  | { kind: 'project'; projectId: string };
