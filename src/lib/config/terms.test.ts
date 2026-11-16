import { describe, it, expect } from 'vitest';
import { TERMS_VERSION, formatTermsVersion } from './terms';

describe('TERMS_VERSION', () => {
  it('is an ISO date (YYYY-MM-DD) so stored consents sort and compare as strings', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(TERMS_VERSION).toISOString().slice(0, 10)).toBe(TERMS_VERSION);
  });
});

describe('formatTermsVersion', () => {
  it('renders an ISO date the Norwegian way', () => {
    expect(formatTermsVersion('2026-10-17')).toBe('17.10.2026');
  });

  it('defaults to the current TERMS_VERSION', () => {
    expect(formatTermsVersion()).toBe(formatTermsVersion(TERMS_VERSION));
  });
});
