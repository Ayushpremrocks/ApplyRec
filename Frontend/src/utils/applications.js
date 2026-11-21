import { parseDateOnly } from './date';

/** Must match the backend's ApplicationStatus values. */
export const STATUSES = ['Applied', 'OA', 'Interview', 'Rejected', 'Offer'];

/** CSS custom property holding each status colour (see styles/index.css). */
export const STATUS_VAR = {
  Applied: 'var(--st-applied)',
  OA: 'var(--st-oa)',
  Interview: 'var(--st-interview)',
  Rejected: 'var(--st-rejected)',
  Offer: 'var(--st-offer)',
};

export const OPENING_TYPES = [
  { value: 'ON_CAMPUS', label: 'On-campus' },
  { value: 'OFF_CAMPUS', label: 'Off-campus' },
];

export const OPENING_LABEL = { ON_CAMPUS: 'On-campus', OFF_CAMPUS: 'Off-campus' };

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'company-asc', label: 'Company A–Z' },
  { value: 'company-desc', label: 'Company Z–A' },
  { value: 'salary-high', label: 'Salary: high to low' },
  { value: 'salary-low', label: 'Salary: low to high' },
  { value: 'interview-soon', label: 'Next interview' },
];

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

/** True for any real salary value, including 0. */
export function hasValue(v) {
  return v !== null && v !== undefined && v !== '';
}

export function formatSalary(salary) {
  if (!hasValue(salary)) return null;
  const num = Number(salary);
  if (Number.isNaN(num)) return null;
  return `${Number.isInteger(num) ? num : Number(num.toFixed(2))} LPA`;
}

/** Mirrors the backend's tag normalisation so the UI shows what will be saved. */
export function normalizeTag(tag) {
  return (tag || '').trim().replace(/\s+/g, ' ').toLowerCase().slice(0, MAX_TAG_LENGTH);
}

export function uniqueRoles(applications) {
  return [...new Set(applications.map((a) => a.role).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function uniqueTags(applications) {
  return [...new Set(applications.flatMap((a) => a.tags || []))].sort((a, b) => a.localeCompare(b));
}

/** The next interview that has not started yet, or null. */
export function nextInterview(app, now = Date.now()) {
  return (app.interviews || []).find((i) => new Date(i.scheduled_at).getTime() > now) || null;
}

/** Upcoming interviews across active applications, soonest first. */
export function upcomingInterviews(applications, now = Date.now(), withinDays = 14) {
  const limit = now + withinDays * 24 * 60 * 60 * 1000;
  return applications
    .filter((a) => !a.archived)
    .flatMap((a) => (a.interviews || []).map((interview) => ({ interview, application: a })))
    .filter(({ interview }) => {
      const t = new Date(interview.scheduled_at).getTime();
      return t > now && t <= limit;
    })
    .sort((x, y) => new Date(x.interview.scheduled_at) - new Date(y.interview.scheduled_at));
}

/** Short source label, e.g. "Off-campus · referral". */
export function sourceLabel(app) {
  if (!app.opening_type) return null;
  const base = OPENING_LABEL[app.opening_type];
  return app.opening_type === 'OFF_CAMPUS' && app.referral ? `${base} · referral` : base;
}

const time = (app) => parseDateOnly(app.applied_date)?.getTime() ?? 0;
const salaryOf = (app) => (hasValue(app.salary) ? Number(app.salary) : null);

/** Salaries missing a value always sort last. */
function compareSalary(a, b, direction) {
  const sa = salaryOf(a);
  const sb = salaryOf(b);
  if (sa === null && sb === null) return 0;
  if (sa === null) return 1;
  if (sb === null) return -1;
  return direction * (sa - sb);
}

function compareNextInterview(a, b) {
  const na = nextInterview(a);
  const nb = nextInterview(b);
  if (!na && !nb) return time(b) - time(a);
  if (!na) return 1;
  if (!nb) return -1;
  return new Date(na.scheduled_at) - new Date(nb.scheduled_at);
}

const SORTERS = {
  newest: (a, b) => time(b) - time(a) || b.id - a.id,
  oldest: (a, b) => time(a) - time(b) || a.id - b.id,
  'company-asc': (a, b) => a.company.localeCompare(b.company),
  'company-desc': (a, b) => b.company.localeCompare(a.company),
  'salary-high': (a, b) => compareSalary(a, b, -1),
  'salary-low': (a, b) => compareSalary(a, b, 1),
  'interview-soon': compareNextInterview,
};

export const EMPTY_FILTERS = {
  status: null,
  role: '',
  tag: '',
  source: '',
  minSalary: '',
  maxSalary: '',
  search: '',
};

/** Number of active filters, for the "Filters (2)" badge. Search and status are shown elsewhere. */
export function countAdvancedFilters(filters) {
  return ['role', 'tag', 'source', 'minSalary', 'maxSalary'].filter((k) => hasValue(filters[k])).length;
}

function matchesSource(app, source) {
  switch (source) {
    case 'ON_CAMPUS':
      return app.opening_type === 'ON_CAMPUS';
    case 'OFF_CAMPUS':
      return app.opening_type === 'OFF_CAMPUS';
    case 'REFERRAL':
      return app.opening_type === 'OFF_CAMPUS' && app.referral;
    case 'NONE':
      return !app.opening_type;
    default:
      return true;
  }
}

/**
 * Filters and sorts applications in the browser. A user's list is small, so fetching it
 * once and filtering locally keeps stats, roles and the board consistent.
 * `archived` selects which set is shown: active (default) or archived.
 */
export function filterAndSort(applications, { status, role, tag, source, minSalary, maxSalary, search, sortBy, archived = false }) {
  const query = (search || '').trim().toLowerCase();
  const min = hasValue(minSalary) ? Number(minSalary) : null;
  const max = hasValue(maxSalary) ? Number(maxSalary) : null;

  const filtered = applications.filter((app) => {
    if (Boolean(app.archived) !== archived) return false;
    if (status && app.status !== status) return false;
    if (role && app.role !== role) return false;
    if (tag && !(app.tags || []).includes(tag)) return false;
    if (source && !matchesSource(app, source)) return false;
    if (query) {
      const haystack = [app.company, app.role, ...(app.tags || [])].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (min !== null || max !== null) {
      const s = salaryOf(app);
      if (s === null) return false;
      if (min !== null && s < min) return false;
      if (max !== null && s > max) return false;
    }
    return true;
  });

  return filtered.sort(SORTERS[sortBy] || SORTERS.newest);
}

/** Client-side validation that mirrors the API's rules. Returns { field: message }. */
export function validateApplication(form) {
  const errors = {};
  if (!form.company.trim()) errors.company = 'Company is required';
  else if (form.company.trim().length > 255) errors.company = 'Keep it under 255 characters';
  if (!form.role.trim()) errors.role = 'Role is required';
  else if (form.role.trim().length > 255) errors.role = 'Keep it under 255 characters';
  if (!form.appliedDate) errors.appliedDate = 'Pick the date you applied';
  if (hasValue(form.salary)) {
    const n = Number(form.salary);
    if (Number.isNaN(n) || n < 0) errors.salary = 'Salary cannot be negative';
    else if (n > 9999.99) errors.salary = 'Salary must be at most 9999.99 LPA';
    else if (!/^\d+(\.\d{1,2})?$/.test(String(form.salary))) errors.salary = 'Use at most 2 decimal places';
  }
  if (form.jobUrl?.trim()) {
    if (!/^https?:\/\/\S+$/i.test(form.jobUrl.trim())) errors.jobUrl = 'Enter a full link starting with https://';
    else if (form.jobUrl.trim().length > 2048) errors.jobUrl = 'Link is too long';
  }
  if (form.jobId && form.jobId.length > 100) errors.jobId = 'Keep it under 100 characters';
  return errors;
}
