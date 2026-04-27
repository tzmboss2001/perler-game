import { clearToken, getToken } from "./authApi";
import { handleAuthExpiredApiResponse } from "./authExpiry";

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface FinishedWorkItem {
  id: number;
  title: string;
  description: string;
  cover_url: string;
  image_urls: string[];
  image_count: number;
  status: number;
  is_public: boolean;
  review_status: number;
  review_reason: string;
  like_count?: number;
  liked?: boolean;
  created_at: string;
  user?: {
    id: number;
    nickname: string;
    avatar: string;
  };
}

export interface CreateFinishedWorkData {
  title: string;
  description?: string;
  images_base64: string[];
  is_public?: boolean;
}

interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FinishedWorkListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  sort?: 'latest' | 'hottest';
}

export interface FinishedWorkReportItem {
  id: number;
  work_id: number;
  work_title: string;
  work_owner_id: number;
  reporter_id: number;
  reporter_nickname: string;
  reason: string;
  detail: string;
  status: number;
  handle_note: string;
  handled_by: number;
  handled_by_name: string;
  handled_at: string;
  created_at: string;
}

export interface ReviewFinishedWorkData {
  action: "approve" | "reject" | "hide" | "restore";
  reason?: string;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  timeout = 30000,
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["x-token"] = token;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    if (!res.ok) {
      throw new Error(`request failed: ${res.status}`);
    }
    const result = await res.json();
    handleAuthExpiredApiResponse(result, clearToken);
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("请求超时，请检查网络后重试");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const finishedWorkApi = {
  create: async (
    data: CreateFinishedWorkData,
  ): Promise<ApiResponse<FinishedWorkItem>> => {
    return request("/api/v1/finished-works", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listMy: async (
    page = 1,
    pageSize = 20,
  ): Promise<ApiResponse<PageResult<FinishedWorkItem>>> => {
    return request(
      `/api/v1/finished-works/my?page=${page}&pageSize=${pageSize}`,
      { method: "GET" },
    );
  },

  listPublic: async (
    pageOrParams: number | FinishedWorkListParams = 1,
    pageSize = 20,
  ): Promise<ApiResponse<PageResult<FinishedWorkItem>>> => {
    const params = typeof pageOrParams === 'number'
      ? { page: pageOrParams, pageSize }
      : { page: 1, pageSize: 20, ...pageOrParams };
    const query = new URLSearchParams({
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
    });
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    if (params.sort) query.set('sort', params.sort);
    return request(
      `/api/v1/finished-works/public?${query.toString()}`,
      { method: "GET" },
    );
  },

  listPublicByUser: async (
    userId: number,
    pageOrParams: number | FinishedWorkListParams = 1,
    pageSize = 20,
  ): Promise<ApiResponse<PageResult<FinishedWorkItem>>> => {
    const params = typeof pageOrParams === 'number'
      ? { page: pageOrParams, pageSize }
      : { page: 1, pageSize: 20, ...pageOrParams };
    const query = new URLSearchParams({
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
    });
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
    if (params.sort) query.set('sort', params.sort);
    return request(
      `/api/v1/finished-works/users/${userId}/public?${query.toString()}`,
      { method: "GET" },
    );
  },

  getPublicDetail: async (
    id: number,
  ): Promise<ApiResponse<FinishedWorkItem>> => {
    return request(`/api/v1/finished-works/${id}`, { method: "GET" });
  },

  toggleLike: async (
    id: number,
  ): Promise<ApiResponse<{ liked: boolean; like_count: number }>> => {
    return request(`/api/v1/finished-works/${id}/like`, { method: "POST" });
  },

  report: async (
    id: number,
    reason: string,
    detail = "",
  ): Promise<ApiResponse<null>> => {
    return request(`/api/v1/finished-works/${id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason, detail }),
    });
  },

  getModerationReports: async (
    params: { page?: number; pageSize?: number; status?: number } = {},
  ): Promise<ApiResponse<PageResult<FinishedWorkReportItem>>> => {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const status = typeof params.status === "number" ? params.status : -1;
    return request(
      `/api/v1/finished-works/moderation/reports?page=${page}&pageSize=${pageSize}&status=${status}`,
      { method: "GET" },
    );
  },

  getModerationWorks: async (
    params: { page?: number; pageSize?: number; review_status?: number } = {},
  ): Promise<ApiResponse<PageResult<FinishedWorkItem>>> => {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const reviewStatus =
      typeof params.review_status === "number" ? params.review_status : -1;
    return request(
      `/api/v1/finished-works/moderation/works?page=${page}&pageSize=${pageSize}&review_status=${reviewStatus}`,
      { method: "GET" },
    );
  },

  reviewWork: async (
    workId: number,
    data: ReviewFinishedWorkData,
  ): Promise<ApiResponse<null>> => {
    return request(`/api/v1/finished-works/moderation/works/${workId}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  handleReport: async (
    reportId: number,
    action: "accept" | "reject",
    note = "",
  ): Promise<ApiResponse<null>> => {
    return request(
      `/api/v1/finished-works/moderation/reports/${reportId}/handle`,
      {
        method: "POST",
        body: JSON.stringify({ action, note }),
      },
    );
  },

  delete: async (id: number): Promise<ApiResponse<null>> => {
    return request(`/api/v1/finished-works/${id}`, { method: "DELETE" });
  },
};

export default finishedWorkApi;
