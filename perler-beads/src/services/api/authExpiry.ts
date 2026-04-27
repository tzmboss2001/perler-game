interface AuthLikeResponse {
  code?: number | string;
  msg?: string;
}

const AUTH_EXPIRED_MESSAGE_PATTERNS = [
  '未登录',
  '未登陆',
  '请先登录',
  '请重新登录',
  '登录已过期',
  '登录状态已失效',
  'token',
  '鉴权',
  '未授权',
  '授权失败',
];

const normalizeMessage = (value?: string | null) => String(value || '').trim();

export function isAuthExpiredMessage(message?: string | null): boolean {
  const normalized = normalizeMessage(message).toLowerCase();
  if (!normalized) {
    return false;
  }
  return AUTH_EXPIRED_MESSAGE_PATTERNS.some((pattern) =>
    normalized.includes(pattern.toLowerCase()),
  );
}

export function isAuthExpiredApiResponse(response?: AuthLikeResponse | null): boolean {
  if (!response) {
    return false;
  }
  const code = Number(response.code);
  return code === 401 || code === 7 || isAuthExpiredMessage(response.msg);
}

export function handleAuthExpiredApiResponse(
  response?: AuthLikeResponse | null,
  onExpired?: () => void,
): boolean {
  if (!isAuthExpiredApiResponse(response)) {
    return false;
  }
  onExpired?.();
  return true;
}
