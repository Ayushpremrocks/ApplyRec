import { describe, it, expect } from 'vitest';
import { parseDateOnly, formatDate, relativeTime, todayIso } from './date';

describe('date utils (TZ=America/Los_Angeles)', () => {
  it('parses YYYY-MM-DD as a local calendar date, not UTC midnight', () => {
    const d = parseDateOnly('2025-02-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 1, 1]);
    expect(formatDate('2025-02-01')).toBe('Feb 1, 2025');
  });

  it('returns null / N/A for empty or invalid input', () => {
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly('garbage')).toBeNull();
    expect(formatDate('')).toBe('N/A');
  });

  it('computes relative days against local today', () => {
    const now = new Date(2025, 1, 10, 23, 30); // Feb 10, 11:30pm local
    expect(relativeTime('2025-02-10', now)).toBe('today');
    expect(relativeTime('2025-02-09', now)).toBe('yesterday');
    expect(relativeTime('2025-02-07', now)).toBe('3 days ago');
    expect(relativeTime('2025-02-03', now)).toBe('1 week ago');
    expect(relativeTime('2024-01-01', now)).toBe('on Jan 1, 2024');
  });

  it('formats today for date inputs', () => {
    expect(todayIso(new Date(2025, 0, 5))).toBe('2025-01-05');
  });
});
