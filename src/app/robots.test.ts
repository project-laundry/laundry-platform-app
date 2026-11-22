import { beforeEach, describe, expect, it, vi } from 'vitest';

const headerValues = new Map<string, string>();
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: (name: string) => headerValues.get(name) ?? null })),
}));

import robots from './robots';
import sitemap from './sitemap';

beforeEach(() => {
  headerValues.clear();
});

describe('robots', () => {
  it('allows the public site on nooracare.no and points to the sitemap', async () => {
    headerValues.set('host', 'nooracare.no');

    const result = await robots();

    expect(result.sitemap).toBe('https://nooracare.no/sitemap.xml');
    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/dashboard',
        '/orders',
        '/auth',
        '/evaluering',
        '/api',
        '/ingest',
        '/bli-renser/business',
        '/bli-renser/services',
        '/bli-renser/equipment',
        '/bli-renser/profile',
        '/bli-renser/confirm',
        '/bli-renser/success',
      ],
    });
  });

  it('disallows everything on staging', async () => {
    headerValues.set('host', 'test.nooracare.no');

    await expect(robots()).resolves.toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });

  it('prefers x-forwarded-host over host', async () => {
    headerValues.set('host', 'nooracare.no');
    headerValues.set('x-forwarded-host', 'test.nooracare.no');

    await expect(robots()).resolves.toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });

  it('disallows everything when there is no host header', async () => {
    await expect(robots()).resolves.toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });
});

describe('sitemap', () => {
  it('lists the public pages on the canonical host', () => {
    expect(sitemap()).toEqual([
      { url: 'https://nooracare.no' },
      { url: 'https://nooracare.no/bli-renser' },
      { url: 'https://nooracare.no/pris-kalkulator' },
      { url: 'https://nooracare.no/kontakt' },
      { url: 'https://nooracare.no/salgsvilkar' },
      { url: 'https://nooracare.no/personvern' },
      { url: 'https://nooracare.no/personvern-renser' },
    ]);
  });
});
