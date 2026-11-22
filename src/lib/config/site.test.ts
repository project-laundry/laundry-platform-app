import { describe, it, expect } from 'vitest';
import { ROBOTS_DISALLOW, SITEMAP_PATHS, SITE_URL, isIndexableHost } from './site';

describe('isIndexableHost', () => {
  it('accepts only the production hosts', () => {
    expect(isIndexableHost('nooracare.no')).toBe(true);
    expect(isIndexableHost('www.nooracare.no')).toBe(true);
    expect(isIndexableHost('NooraCare.no')).toBe(true);
    expect(isIndexableHost('nooracare.no:443')).toBe(true);
    expect(isIndexableHost('nooracare.no, internal.vercel.app')).toBe(true);
  });

  it('rejects staging, previews, localhost and a missing host', () => {
    expect(isIndexableHost('test.nooracare.no')).toBe(false);
    expect(isIndexableHost('laundry-platform-app-abc123.vercel.app')).toBe(false);
    expect(isIndexableHost('localhost:3000')).toBe(false);
    expect(isIndexableHost('evilnooracare.no')).toBe(false);
    expect(isIndexableHost('')).toBe(false);
    expect(isIndexableHost(null)).toBe(false);
    expect(isIndexableHost(undefined)).toBe(false);
  });
});

describe('site paths', () => {
  it('uses the apex host as the canonical URL', () => {
    expect(SITE_URL).toBe('https://nooracare.no');
  });

  it('never lists a sitemap page that robots.txt disallows', () => {
    for (const path of SITEMAP_PATHS) {
      expect(ROBOTS_DISALLOW.some((prefix) => path.startsWith(prefix))).toBe(false);
    }
  });
});
