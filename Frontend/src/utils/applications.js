import { parseDateOnly } from './date';

/** Must match the backend's ApplicationStatus values. */
export const STATUSES = ['Applied', 'OA', 'Interview', 'Rejected', 'Offer'];

export const STATUS_COLORS = {
  Applied: '#1e40af',
  OA: '#92400e',
  Interview: '#5b21b6',
  Rejected: '#991b1b',
  Offer: '#065f46',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'company-asc', label: 'Company A-Z' },
  { value: 'company-desc', label: 'Company Z-A' },
  { value: 'salary-high', label: 'Salary: High to Low' },
  { value: 'salary-low', label: 'Salary: Low to High' },
];

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

export function uniqueRoles(applications) {
  return [...new Set(applications.map((a) => a.role).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
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

const SORTERS = {
  newest: (a, b) => time(b) - time(a) || b.id - a.id,
  oldest: (a, b) => time(a) - time(b) || a.id - b.id,
  'company-asc': (a, b) => a.company.localeCompare(b.company),
  'company-desc': (a, b) => b.company.localeCompare(a.company),
  'salary-high': (a, b) => compareSalary(a, b, -1),
  'salary-low': (a, b) => compareSalary(a, b, 1),
};

/**
 * Filters and sorts applications in the browser. A user's application list is small, so
 * fetching it once and filtering locally keeps stats, roles and the board consistent.
 */
export function filterAndSort(applications, { status, role, minSalary, maxSalary, search, sortBy }) {
  const query = (search || '').trim().toLowerCase();
  const min = hasValue(minSalary) ? Number(minSalary) : null;
  const max = hasValue(maxSalary) ? Number(maxSalary) : null;

  const filtered = applications.filter((app) => {
    if (status && app.status !== status) return false;
    if (role && app.role !== role) return false;
    if (query && !app.company.toLowerCase().includes(query)) return false;
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
