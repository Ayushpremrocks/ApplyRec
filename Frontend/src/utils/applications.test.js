import { describe, it, expect } from 'vitest';
import { filterAndSort, uniqueRoles, formatSalary, hasValue } from './applications';
import { toApplicationPayload } from '../services/applicationService';

const apps = [
  { id: 1, company: 'Acme', role: 'SWE', status: 'Applied', applied_date: '2025-01-10', salary: 12.5 },
  { id: 2, company: 'Beta', role: 'SDE', status: 'Offer', applied_date: '2025-02-01', salary: 0 },
  { id: 3, company: 'Gamma', role: 'SWE', status: 'Rejected', applied_date: '2024-12-01', salary: null },
  { id: 4, company: 'acme labs', role: 'PM', status: 'Applied', applied_date: '2025-01-20', salary: 30 },
];

const ids = (list) => list.map((a) => a.id);

describe('filterAndSort', () => {
  it('sorts newest first by default', () => {
    expect(ids(filterAndSort(apps, {}))).toEqual([2, 4, 1, 3]);
  });

  it('filters by decimal salary range and excludes missing salaries', () => {
    expect(ids(filterAndSort(apps, { minSalary: '12.5', maxSalary: '20' }))).toEqual([1]);
  });

  it('treats a salary of 0 as a real value', () => {
    expect(ids(filterAndSort(apps, { minSalary: '0', maxSalary: '0' }))).toEqual([2]);
  });

  it('combines status, role and case-insensitive search', () => {
    expect(ids(filterAndSort(apps, { search: 'ACME', status: 'Applied' }))).toEqual([4, 1]);
    expect(ids(filterAndSort(apps, { role: 'SWE' }))).toEqual([1, 3]);
  });

  it('sorts salary with missing values last', () => {
    expect(ids(filterAndSort(apps, { sortBy: 'salary-high' }))).toEqual([4, 1, 2, 3]);
    expect(ids(filterAndSort(apps, { sortBy: 'salary-low' }))).toEqual([2, 1, 4, 3]);
  });

  it('does not mutate the input', () => {
    const copy = [...apps];
    filterAndSort(apps, { sortBy: 'company-desc' });
    expect(apps).toEqual(copy);
  });
});

describe('helpers', () => {
  it('derives sorted unique roles', () => {
    expect(uniqueRoles(apps)).toEqual(['PM', 'SDE', 'SWE']);
  });

  it('formats salary including 0', () => {
    expect(formatSalary(0)).toBe('0 LPA');
    expect(formatSalary('12.50')).toBe('12.5 LPA');
    expect(formatSalary(null)).toBeNull();
    expect(hasValue(0)).toBe(true);
    expect(hasValue('')).toBe(false);
  });

  it('builds API payloads that keep salary 0 and null out blanks', () => {
    const payload = toApplicationPayload({
      company: ' Acme ', role: 'SWE', status: 'Applied', appliedDate: '2025-01-01',
      notes: '  ', followUp: false, jobId: '', salary: '0',
    });
    expect(payload).toMatchObject({ company: 'Acme', notes: null, jobId: null, salary: 0 });
  });
});
