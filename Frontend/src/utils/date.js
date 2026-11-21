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

/** "Mon, 12 Jun, 3:30 PM" in the viewer's timezone. */
export function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
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

/** "in 3 hours", "tomorrow", "in 5 days" for a future timestamp. */
export function timeUntil(value, now = new Date()) {
  const t = new Date(value);
  const diffMs = t - now;
  if (Number.isNaN(diffMs)) return '';
  if (diffMs <= 0) return 'now';
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  if (hours < 1) return `in ${Math.max(1, Math.round(diffMs / 60000))} min`;
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThat = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const days = Math.round((startOfThat - startOfToday) / MS_PER_DAY);
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** Today's date as "YYYY-MM-DD" in the viewer's timezone (for <input type="date">). */
export function todayIso(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" in local time (for <input type="datetime-local">). */
export function toDateTimeLocal(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Week of 9 Jun" label for analytics. */
export function formatWeek(value) {
  const d = parseDateOnly(value);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}
