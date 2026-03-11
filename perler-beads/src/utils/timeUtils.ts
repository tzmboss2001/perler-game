export function formatRelativeTime(input: string | Date | null | undefined): string {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0) return '刚刚';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return '刚刚';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}分钟前`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}小时前`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}天前`;

  return formatAbsoluteTime(date);
}

export function formatAbsoluteTime(input: string | Date | null | undefined): string {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';

  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}
