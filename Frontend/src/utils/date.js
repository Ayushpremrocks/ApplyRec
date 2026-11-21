const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Parses a date into a local-midnight Date.
 * "YYYY-MM-DD" strings are treated as calendar dates (NOT UTC midnight), so they never
 * shift by a day in timezones west of UTC. Full ISO timestamps are converted to the
 * viewer's local calendar day.
 */
export function parseDateOnly(value) {
  if (!value) return null;
  const match = typeof value === 'string' ? DATE_ONLY.exec(value) : null;
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatDate(value) {
  const d = parseDateOnly(value);
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function relativeTime(value, now = new Date()) {
  const d = parseDateOnly(value);
  if (!d) return '';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today - d) / MS_PER_DAY);

  if (diffDays < 0) return `on ${formatDate(value)}`;
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  return `on ${formatDate(value)}`;
}

/** Today's date as "YYYY-MM-DD" in the viewer's timezone (for <input type="date">). */
export function todayIso(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
