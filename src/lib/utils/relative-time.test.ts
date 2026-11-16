import { describe, it, expect } from 'vitest';
import { formatAgeLabel } from './relative-time';

const NOW = new Date('2026-10-17T12:00:00.000Z');

describe('formatAgeLabel', () => {
  it('says "under 1 t" within the first hour', () => {
    expect(formatAgeLabel('2026-10-17T11:30:00.000Z', NOW)).toBe('under 1 t');
  });

  it('counts whole hours below a day', () => {
    expect(formatAgeLabel('2026-10-17T08:10:00.000Z', NOW)).toBe('3 t');
  });

  it('switches to days at 24 hours', () => {
    expect(formatAgeLabel('2026-10-16T12:00:00.000Z', NOW)).toBe('1 d');
    expect(formatAgeLabel('2026-10-14T13:00:00.000Z', NOW)).toBe('2 d');
  });
});
