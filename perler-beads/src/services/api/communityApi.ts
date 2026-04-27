/**
 * 绀惧尯 API 鏈嶅姟
 */

import { clearToken, getToken } from './authApi';
import { handleAuthExpiredApiResponse } from './authExpiry';

// API 鍝嶅簲绫诲瀷
interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// 浣滆€呬俊鎭?
export interface CommunityPostAuthor {
  id: number;
  nickname: string;
  avatar: string;
}

// 绀惧尯浣滃搧鍒楄〃椤癸紙涓嶅惈 bead_data锛?
export interface CommunityPostListItem {
  id: number;
  title: string;
  category?: string;
  tags?: string;
  thumbnail_url: string;
  preview_url?: string;
  grid_width: number;
  grid_height: number;
  color_count: number;
  difficulty: string;
  like_count: number;
  view_count: number;
  make_count: number;
  palette_brand?: string;
  palette_version?: string;
  palette_name?: string;
  review_status?: number;
  review_reason?: string;
  user: CommunityPostAuthor;
  created_at: string;
}

// 绀惧尯浣滃搧璇︽儏锛堝惈 bead_data锛?
export interface CommunityPostDetail {
  id: number;
  title: string;
  category?: string;
  tags?: string;
  description: string;
  thumbnail_url: string;
  preview_url?: string;
  image_urls: string[];
  bead_data: Record<string, unknown>;
  grid_width: number;
  grid_height: number;
  bead_count: number;
  color_count: number;
  difficulty: string;
  like_count: number;
  view_count: number;
  make_count: number;
  palette_brand?: string;
  palette_version?: string;
  palette_name?: string;
  review_status?: number;
  review_reason?: string;
  liked?: boolean;
  user: CommunityPostAuthor;
  created_at: string;
}

export interface CommunityModerationListParams {
  page?: number;
  pageSize?: number;
  review_status?: number;
}

export interface ReviewCommunityPostData {
  action: 'approve' | 'reject' | 'hide' | 'restore';
  reason?: string;
}

export interface CommunityPreviewBackfillData {
  limit?: number;
}

export interface CommunityModerationStats {
  total_posts: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  hidden_count: number;
  pending_reports: number;
  high_priority_reports: number;
  overdue_reports: number;
  today_new_posts: number;
  today_reviews: number;
  today_reports: number;
  today_backfilled: number;
}

export interface CommunityModerationLogListParams {
  page?: number;
  pageSize?: number;
  post_id?: number;
}

export interface CommunityReviewLogItem {
  id: number;
  post_id: number;
  post_title: string;
  reviewer_id: number;
  reviewer_nickname?: string;
  action: string;
  from_review_status: number;
  to_review_status: number;
  reason?: string;
  created_at: string;
}

export interface CreateCommunityReportData {
  reason: string;
  detail?: string;
  evidence_urls?: string[];
}

export interface CommunityModerationReportListParams {
  page?: number;
  pageSize?: number;
  status?: number;
  high_only?: boolean;
  overdue_only?: boolean;
}

export interface HandleCommunityReportData {
  action: 'accept' | 'reject';
  note?: string;
}

export interface BatchHandleCommunityReportsData {
  report_ids: number[];
  action: 'accept' | 'reject';
  note?: string;
}

export interface CommunityReportItem {
  id: number;
  post_id: number;
  post_title: string;
  post_user_id: number;
  reporter_id: number;
  reporter_nickname: string;
  reason: string;
  detail?: string;
  evidence_urls?: string[];
  priority: number;
  risk_reason?: string;
  overdue?: boolean;
  age_hours?: number;
  status: number;
  handle_note?: string;
  handled_by: number;
  handled_by_name?: string;
  handled_at: string;
  created_at: string;
}

// 鍙戝竷浣滃搧璇锋眰
export interface CreatePostData {
  title: string;
  description?: string;
  tags?: string;
  category?: string;
  bead_data: Record<string, unknown>;
  grid_width: number;
  grid_height: number;
  bead_count: number;
  color_count: number;
  difficulty: string;
  thumbnail_base64?: string;
  project_id?: number;
  palette_brand?: string;
  palette_version?: string;
  palette_name?: string;
}

export interface CreatePostResponse {
  id: number;
  title: string;
  category?: string;
  thumbnail_url?: string;
  preview_url?: string;
  updated_existing?: boolean;
}

// 鐐硅禐鍝嶅簲
export interface LikeResponse {
  liked: boolean;
  like_count: number;
}

// 鍒嗛〉缁撴灉
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 鍒楄〃璇锋眰鍙傛暟
export interface CommunityListParams {
  page?: number;
  pageSize?: number;
  tag?: string;
  category?: string;
  keyword?: string;
  sort?: string;
}

export interface CommunityMyPostListParams {
  page?: number;
  pageSize?: number;
  review_status?: number;
}

/**
 * 閫氱敤璇锋眰鍑芥暟
 */
async function request<T>(url: string, options: RequestInit = {}, timeout = 30000): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['x-token'] = token;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }

    const result = await response.json();
    handleAuthExpiredApiResponse(result, clearToken);
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络后重试');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
export const communityApi = {
  /**
   * 鑾峰彇绀惧尯浣滃搧鍒楄〃
   */
  getPosts: async (params: CommunityListParams = {}): Promise<ApiResponse<PageResult<CommunityPostListItem>>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.tag) searchParams.set('tag', params.tag);
    if (params.category) searchParams.set('category', params.category);
    if (params.keyword) searchParams.set('keyword', params.keyword);
    if (params.sort) searchParams.set('sort', params.sort);

    const url = `/api/v1/community/posts?${searchParams.toString()}`;
    return request(url, { method: 'GET' });
  },

  /**
   * 鑾峰彇浣滃搧璇︽儏
   */
  getPostById: async (id: number): Promise<ApiResponse<CommunityPostDetail>> => {
    return request(`/api/v1/community/posts/${id}`, { method: 'GET' });
  },

  getPostsByUser: async (userId: number, params: CommunityListParams = {}): Promise<ApiResponse<PageResult<CommunityPostListItem>>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.keyword) searchParams.set('keyword', params.keyword);
    if (params.sort) searchParams.set('sort', params.sort);
    const query = searchParams.toString();
    const url = query ? `/api/v1/community/users/${userId}/posts?${query}` : `/api/v1/community/users/${userId}/posts`;
    return request(url, { method: 'GET' });
  },

  /**
   * 澧炲姞鍒朵綔娆℃暟
   */
  incrementMakeCount: async (id: number): Promise<void> => {
    try {
      await request(`/api/v1/community/posts/${id}/make`, { method: 'POST' });
    } catch {
      // 闈欓粯澶辫触锛屼笉闃诲鐢ㄦ埛鎿嶄綔
    }
  },

  /**
   * 鍙戝竷浣滃搧鍒扮ぞ鍖?
   */
  createPost: async (data: CreatePostData): Promise<ApiResponse<CreatePostResponse>> => {
    return request('/api/v1/community/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMyPosts: async (params: CommunityMyPostListParams = {}): Promise<ApiResponse<PageResult<CommunityPostListItem>>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (typeof params.review_status === 'number') {
      searchParams.set('review_status', params.review_status.toString());
    }
    const query = searchParams.toString();
    const url = query ? `/api/v1/community/my/posts?${query}` : '/api/v1/community/my/posts';
    return request(url, { method: 'GET' });
  },

  /**
   * 鐐硅禐/鍙栨秷鐐硅禐锛坱oggle锛?
   */
  likePost: async (id: number): Promise<ApiResponse<LikeResponse>> => {
    return request(`/api/v1/community/posts/${id}/like`, { method: 'POST' });
  },

  reportPost: async (id: number, data: CreateCommunityReportData): Promise<ApiResponse<null>> => {
    return request(`/api/v1/community/posts/${id}/report`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getModerationPosts: async (
    params: CommunityModerationListParams = {}
  ): Promise<ApiResponse<PageResult<CommunityPostListItem>>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (typeof params.review_status === 'number') {
      searchParams.set('review_status', params.review_status.toString());
    }
    const query = searchParams.toString();
    const url = query ? `/api/v1/community/moderation/posts?${query}` : '/api/v1/community/moderation/posts';
    return request(url, { method: 'GET' });
  },

  reviewPost: async (id: number, data: ReviewCommunityPostData): Promise<ApiResponse<null>> => {
    return request(`/api/v1/community/moderation/posts/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getModerationLogs: async (
    params: CommunityModerationLogListParams = {}
  ): Promise<ApiResponse<PageResult<CommunityReviewLogItem>>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.post_id) searchParams.set('post_id', params.post_id.toString());
    const query = searchParams.toString();
    const url = query ? `/api/v1/community/moderation/logs?${query}` : '/api/v1/community/moderation/logs';
    return request(url, { method: 'GET' });
  },

  backfillMissingPreviews: async (
    data: CommunityPreviewBackfillData = {}
  ): Promise<ApiResponse<{ updated_count: number; limit: number }>> => {
    return request('/api/v1/community/moderation/previews/backfill', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getModerationStats: async (): Promise<ApiResponse<CommunityModerationStats>> => {
    return request('/api/v1/community/moderation/stats', { method: 'GET' });
  },

  getModerationReports: async (
    params: CommunityModerationReportListParams = {}
  ): Promise<ApiResponse<PageResult<CommunityReportItem>>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (typeof params.status === 'number') searchParams.set('status', params.status.toString());
    if (params.high_only) searchParams.set('high_only', '1');
    if (params.overdue_only) searchParams.set('overdue_only', '1');
    const query = searchParams.toString();
    const url = query ? `/api/v1/community/moderation/reports?${query}` : '/api/v1/community/moderation/reports';
    return request(url, { method: 'GET' });
  },

  getReportAlerts: async (limit = 10): Promise<ApiResponse<{ list: CommunityReportItem[]; limit: number }>> => {
    return request(`/api/v1/community/moderation/reports/alerts?limit=${limit}`, { method: 'GET' });
  },

  handleReport: async (id: number, data: HandleCommunityReportData): Promise<ApiResponse<null>> => {
    return request(`/api/v1/community/moderation/reports/${id}/handle`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  batchHandleReports: async (
    data: BatchHandleCommunityReportsData
  ): Promise<ApiResponse<{ handled_count: number }>> => {
    return request('/api/v1/community/moderation/reports/batch-handle', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export default communityApi;

