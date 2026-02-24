/**
 * API 服务层 - 统一请求封装
 */

const BASE_URL = '/api/v1';

// Token 管理
const TOKEN_KEY = 'perler_game_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// 统一响应类型
interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  msg: string;
}

// 通用请求函数
async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json: ApiResponse<T> = await res.json();

  if (json.code !== 0) {
    // 401 未授权，清除 token
    if (json.msg === '未登录或非法访问' || json.msg === '授权已过期') {
      clearToken();
    }
    throw new Error(json.msg || '请求失败');
  }

  return json.data;
}

// ============ Auth API ============

export interface UserInfo {
  id: number;
  email: string;
  nickname: string;
  avatar: string;
}

export interface SmartLoginResp {
  token: string;
  user_info: UserInfo;
  is_new_user: boolean;
}

export const authApi = {
  smartLogin: (email: string, password: string) =>
    request<SmartLoginResp>('/auth/smart-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getUserInfo: () =>
    request<UserInfo>('/auth/user-info'),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    }),
};

// ============ Work API ============

export interface WorkItem {
  id: number;
  title: string;
  thumbnail: string;
  template_id: string;
  bead_count: number;
  board_width: number;
  board_height: number;
  ironing_score: number;
  failure_type: string;
  risk_score: number;
  is_public: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface WorkDetail extends WorkItem {
  board_json: string;
  user_id: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WorkSaveReq {
  title: string;
  board_json: string;
  thumbnail: string;
  template_id?: string;
  bead_count: number;
  board_width: number;
  board_height: number;
  ironing_score: number;
  failure_type: string;
  risk_score: number;
  device_id?: string;
}

export const workApi = {
  save: (data: WorkSaveReq) =>
    request<{ id: number }>('/work/save', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (page = 1, pageSize = 20) =>
    request<PageResult<WorkItem>>(`/work/list?page=${page}&pageSize=${pageSize}`),

  getById: (id: number) =>
    request<WorkDetail>(`/work/${id}`),

  delete: (id: number) =>
    request<void>(`/work/${id}`, { method: 'DELETE' }),

  publish: (id: number) =>
    request<void>(`/work/${id}/publish`, { method: 'POST' }),
};

// ============ Gallery API ============

export interface GalleryItem {
  id: number;
  title: string;
  thumbnail: string;
  bead_count: number;
  board_width: number;
  board_height: number;
  ironing_score: number;
  failure_type: string;
  risk_score: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_id: number;
  author_nickname: string;
  author_avatar: string;
}

export interface GalleryDetail extends GalleryItem {
  board_json: string;
  is_liked: boolean;
}

export interface CommentItem {
  id: number;
  content: string;
  created_at: string;
  user_id: number;
  user_nickname: string;
  user_avatar: string;
}

export interface LeaderboardItem {
  rank: number;
  work_id: number;
  title: string;
  thumbnail: string;
  failure_type: string;
  risk_score: number;
  ironing_score: number;
  author_nickname: string;
  author_avatar: string;
}

export const galleryApi = {
  list: (page = 1, pageSize = 20, sort = 'latest') =>
    request<PageResult<GalleryItem>>(`/gallery/list?page=${page}&pageSize=${pageSize}&sort=${sort}`),

  getDetail: (id: number) =>
    request<GalleryDetail>(`/gallery/${id}`),

  toggleLike: (id: number) =>
    request<{ liked: boolean }>(`/gallery/${id}/like`, { method: 'POST' }),

  getComments: (id: number, page = 1, pageSize = 20) =>
    request<PageResult<CommentItem>>(`/gallery/${id}/comments?page=${page}&pageSize=${pageSize}`),

  postComment: (id: number, content: string) =>
    request<void>(`/gallery/${id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getLeaderboard: (limit = 20) =>
    request<LeaderboardItem[]>(`/gallery/leaderboard?limit=${limit}`),
};

// ============ Achievement API ============

export interface AchievementItemResp {
  achievement_id: string;
  unlocked_at: string;
}

export interface UserStatsResp {
  total_crashes: number;
  crash_undercooked: number;
  crash_partial_melt: number;
  crash_collapse: number;
  crash_burned: number;
  crash_sticky: number;
  total_works: number;
  perfect_scores: number;
  total_likes_received: number;
  total_comments: number;
  rescue_success_count: number;
  fast_ironing_count: number;
  challenge_complete_count: number;
}

export const achievementApi = {
  getMyAchievements: () =>
    request<AchievementItemResp[]>('/achievement/my'),

  unlock: (achievementId: string) =>
    request<void>('/achievement/unlock', {
      method: 'POST',
      body: JSON.stringify({ achievement_id: achievementId }),
    }),

  getMyStats: () =>
    request<UserStatsResp>('/achievement/stats'),

  updateStats: (stats: Partial<UserStatsResp>) =>
    request<void>('/achievement/stats/update', {
      method: 'POST',
      body: JSON.stringify(stats),
    }),
};

// ============ Challenge API ============

export interface ChallengeItemResp {
  id: number;
  code: string;
  name: string;
  description: string;
  type: string;
  icon: string;
  difficulty: string;
  constraints: string;
  scoring: string;
  template_id: string;
  board_width: number;
  board_height: number;
}

export interface ChallengeSubmitReq {
  challenge_code: string;
  passed: boolean;
  score: number;
  time_used: number;
  bonus_json: string;
}

export interface ChallengeLeaderboardEntry {
  rank: number;
  user_id: number;
  user_nickname: string;
  user_avatar: string;
  score: number;
  time_used: number;
}

export interface ChallengeRecordItem {
  id: number;
  challenge_code: string;
  challenge_name: string;
  passed: boolean;
  score: number;
  time_used: number;
  created_at: string;
}

export const challengeApi = {
  getDaily: () =>
    request<ChallengeItemResp[]>('/challenge/daily'),

  getWeekly: () =>
    request<ChallengeItemResp[]>('/challenge/weekly'),

  submit: (data: ChallengeSubmitReq) =>
    request<void>('/challenge/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLeaderboard: (challengeId: number, limit = 20) =>
    request<ChallengeLeaderboardEntry[]>(`/challenge/leaderboard/${challengeId}?limit=${limit}`),

  getMyRecords: (page = 1, pageSize = 20) =>
    request<PageResult<ChallengeRecordItem>>(`/challenge/my-records?page=${page}&pageSize=${pageSize}`),
};
