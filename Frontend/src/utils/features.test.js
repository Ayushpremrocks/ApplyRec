import { describe, it, expect } from 'vitest';
import {
  filterAndSort,
  nextInterview,
  normalizeTag,
  sourceLabel,
  uniqueTags,
  upcomingInterviews,
  validateApplication,
  countAdvancedFilters,
} from './applications';
import { toApplicationPayload, toInterviewPayload } from '../services/applicationService';
import { timeUntil, toDateTimeLocal } from './date';

const NOW = new Date('2025-06-10T12:00:00Z').getTime();
const hoursFromNow = (h) => new Date(NOW + h * 3600_000).toISOString();

const apps = [
  {
    id: 1, company: 'Acme', role: 'Backend Engineer', status: 'Interview', applied_date: '2025-06-01',
    tags: ['remote', 'dream company'], opening_type: 'OFF_CAMPUS', referral: true, archived: false,
    interviews: [{ id: 11, round: 'R1', scheduled_at: hoursFromNow(-5) }, { id: 12, round: 'R2', scheduled_at: hoursFromNow(30) }],
  },
  {
    id: 2, company: 'Beta', role: 'SDE', status: 'Applied', applied_date: '2025-06-05',
    tags: ['remote'], opening_type: 'ON_CAMPUS', referral: false, archived: false,
    interviews: [{ id: 21, round: 'OA call', scheduled_at: hoursFromNow(3) }],
  },
  {
    id: 3, company: 'Gamma', role: 'SDE', status: 'Rejected', applied_date: '2025-05-01',
    tags: [], opening_type: null, referral: false, archived: true,
    interviews: [{ id: 31, round: 'Hidden', scheduled_at: hoursFromNow(2) }],
  },
];
const ids = (list) => list.map((a) => a.id);

describe('filterAndSort with the new fields', () => {
  it('shows active applications by default and archived ones on request', () => {
    expect(ids(filterAndSort(apps, {}))).toEqual([2, 1]);
    expect(ids(filterAndSort(apps, { archived: true }))).toEqual([3]);
  });

  it('filters by tag and by source, including referrals', () => {
    expect(ids(filterAndSort(apps, { tag: 'dream company' }))).toEqual([1]);
    expect(ids(filterAndSort(apps, { source: 'REFERRAL' }))).toEqual([1]);
    expect(ids(filterAndSort(apps, { source: 'ON_CAMPUS' }))).toEqual([2]);
    expect(ids(filterAndSort(apps, { source: 'NONE', archived: true }))).toEqual([3]);
  });

  it('searches company, role and tags', () => {
    expect(ids(filterAndSort(apps, { search: 'backend' }))).toEqual([1]);
    expect(ids(filterAndSort(apps, { search: 'REMOTE' }))).toEqual([2, 1]);
  });

  it('counts advanced filters for the badge', () => {
    expect(countAdvancedFilters({ role: 'SDE', tag: '', source: 'REFERRAL', minSalary: '0', maxSalary: '' })).toBe(3);
  });
});

describe('interviews', () => {
  it('finds the next interview that has not started', () => {
    expect(nextInterview(apps[0], NOW).id).toBe(12);
    expect(nextInterview({ interviews: [] }, NOW)).toBeNull();
  });

  it('lists upcoming interviews soonest first and skips archived applications', () => {
    expect(upcomingInterviews(apps, NOW).map((x) => x.interview.id)).toEqual([21, 12]);
    expect(upcomingInterviews(apps, NOW, 1).map((x) => x.interview.id)).toEqual([21]);
  });

  it('describes time until an interview', () => {
    const now = new Date(NOW);
    expect(timeUntil(hoursFromNow(3), now)).toBe('in 3 hours');
    expect(timeUntil(hoursFromNow(-1), now)).toBe('now');
  });

  it('round-trips datetime-local values in local time', () => {
    const local = '2025-07-01T09:30';
    const payload = toInterviewPayload({ round: ' ', scheduledAt: local, location: ' Zoom ', notes: '' });
    expect(toDateTimeLocal(payload.scheduledAt)).toBe(local);
    expect(payload.round).toBeNull();
    expect(payload.location).toBe('Zoom');
    expect(payload.notes).toBeNull();
    expect(payload.timeZone).toBeTruthy();
  });
});

describe('tags and sources', () => {
  it('normalises tags like the server', () => {
    expect(normalizeTag('  Dream   Company ')).toBe('dream company');
    expect(normalizeTag('x'.repeat(40))).toHaveLength(30);
  });

  it('collects unique tags', () => {
    expect(uniqueTags(apps)).toEqual(['dream company', 'remote']);
  });

  it('labels the source', () => {
    expect(sourceLabel(apps[0])).toBe('Off-campus · referral');
    expect(sourceLabel(apps[1])).toBe('On-campus');
    expect(sourceLabel(apps[2])).toBeNull();
  });
});

describe('toApplicationPayload', () => {
  const base = {
    company: 'Acme', role: 'SWE', status: 'Applied', appliedDate: '2025-01-01', notes: '', followUp: false,
    jobId: '', salary: '', jobUrl: '  https://x.com/job  ', openingType: 'ON_CAMPUS', referral: true, tags: ['a'],
  };

  it('only sends a referral for off-campus openings', () => {
    expect(toApplicationPayload(base).referral).toBe(false);
    expect(toApplicationPayload({ ...base, openingType: 'OFF_CAMPUS' }).referral).toBe(true);
    expect(toApplicationPayload({ ...base, openingType: '' })).toMatchObject({ openingType: null, referral: false });
  });

  it('trims the job link and passes tags', () => {
    expect(toApplicationPayload(base)).toMatchObject({ jobUrl: 'https://x.com/job', tags: ['a'] });
    expect(toApplicationPayload({ ...base, jobUrl: '  ' }).jobUrl).toBeNull();
  });
});

describe('validateApplication', () => {
  const valid = { company: 'Acme', role: 'SWE', appliedDate: '2025-01-01', salary: '', jobUrl: '', jobId: '' };

  it('accepts a minimal valid form', () => {
    expect(validateApplication(valid)).toEqual({});
  });

  it('mirrors the server rules', () => {
    const errors = validateApplication({ ...valid, company: ' ', role: '', salary: '10000', jobUrl: 'javascript:alert(1)' });
    expect(Object.keys(errors).sort()).toEqual(['company', 'jobUrl', 'role', 'salary']);
    expect(validateApplication({ ...valid, salary: '12.345' }).salary).toMatch(/2 decimal/);
    expect(validateApplication({ ...valid, salary: '0' })).toEqual({});
  });
});
