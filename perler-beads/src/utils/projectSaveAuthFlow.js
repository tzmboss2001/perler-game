const AUTH_EXPIRED_MESSAGE_PATTERNS = [
  "未登录",
  "登录状态已失效",
  "登录状态已过期",
  "登录凭证无效",
  "请先登录",
  "请重新登录",
];

const normalizeMessage = (value) => String(value || "").trim();

export const isAuthExpiredApiResponse = (response) => {
  if (!response) {
    return false;
  }

  if (response.code === 401) {
    return true;
  }

  const message = normalizeMessage(response.msg);
  return AUTH_EXPIRED_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern));
};

export const isAuthExpiredMessage = (message) => {
  const normalized = normalizeMessage(message);
  return AUTH_EXPIRED_MESSAGE_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export const normalizeProjectSaveFailure = ({ response, error } = {}) => {
  if (isAuthExpiredApiResponse(response) || isAuthExpiredMessage(error?.message)) {
    return {
      kind: "reauth",
      message: "登录状态已失效，请重新登录后继续云端保存。",
    };
  }

  return {
    kind: "localFallback",
    message: normalizeMessage(error?.message || response?.msg || "云端保存失败"),
  };
};
