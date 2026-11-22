import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => ({ rpc })) }));
const headerValues = new Map<string, string>();
vi.mock('next/headers', () => ({ headers: vi.fn(async () => ({ get: (name: string) => headerValues.get(name) ?? null })) }));

import { clientIp, isRateLimited, rateLimitKey } from './rate-limit';

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

beforeEach(() => {
  vi.clearAllMocks();
  headerValues.clear();
});

describe('rateLimitKey', () => {
  it('hashes the subject so no IP address or user id is stored', () => {
    const key = rateLimitKey('signup-check', '203.0.113.7');
    expect(key).toMatch(/^signup-check:[0-9a-f]{32}$/);
    expect(key).not.toContain('203.0.113.7');
    expect(rateLimitKey('signup-check', '203.0.113.7')).toBe(key);
    expect(rateLimitKey('signup-check', '203.0.113.8')).not.toBe(key);
    expect(rateLimitKey('promo-check', '203.0.113.7')).not.toBe(key);
  });
});

describe('clientIp', () => {
  it('takes the first x-forwarded-for entry, then x-real-ip, then unknown', async () => {
    expect(await clientIp()).toBe('unknown');
    headerValues.set('x-real-ip', '198.51.100.2');
    expect(await clientIp()).toBe('198.51.100.2');
    headerValues.set('x-forwarded-for', '203.0.113.7, 10.0.0.1');
    expect(await clientIp()).toBe('203.0.113.7');
  });
});

describe('isRateLimited', () => {
  it('allows calls up to the limit and blocks the one after', async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    expect(await isRateLimited('promo-check', 'user-1', { limit: 3, windowSeconds: 60 })).toBe(false);
    expect(rpc).toHaveBeenCalledWith('rate_limit_hit', { p_key: rateLimitKey('promo-check', 'user-1'), p_window_seconds: 60 });

    rpc.mockResolvedValue({ data: 4, error: null });
    expect(await isRateLimited('promo-check', 'user-1', { limit: 3, windowSeconds: 60 })).toBe(true);
  });

  it('fails open when the counter cannot be read', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'db down' } });
    expect(await isRateLimited('promo-check', 'user-1')).toBe(false);

    rpc.mockRejectedValue(new Error('network'));
    expect(await isRateLimited('promo-check', 'user-1')).toBe(false);
  });
});
