import '@testing-library/jest-dom/vitest';

// Run tests in a timezone west of UTC so date-shift bugs (e.g. treating "2025-02-01"
// as UTC midnight) would show up as off-by-one-day failures.
process.env.TZ = 'America/Los_Angeles';
