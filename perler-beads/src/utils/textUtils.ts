const REPLACEMENT_CHAR = '\uFFFD';

export function sanitizeDisplayText(value: string | undefined | null): string {
  if (!value) return '';
  return value.replace(REPLACEMENT_CHAR, '').trim();
}

export function sanitizeDisplayTitle(value: string | undefined | null, fallback = '未命名作品'): string {
  const text = sanitizeDisplayText(value);
  if (!text) return fallback;

  if (/[?？]{3,}/.test(text)) {
    return fallback;
  }

  if (/^[?？\s._-]+$/.test(text)) {
    return fallback;
  }

  const stripped = text.replace(/[\s._-]/g, '');
  const questionLikeCount = (stripped.match(/[?？]/g) || []).length;
  if (questionLikeCount >= Math.max(3, Math.ceil(stripped.length * 0.4))) {
    return fallback;
  }

  return text;
}
