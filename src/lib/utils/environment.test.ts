import { describe, it, expect, afterEach, vi } from 'vitest';
import { getAppEnvironment, isNonProduction } from './environment';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getAppEnvironment', () => {
  it('treats a missing URL as development', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(getAppEnvironment()).toBe('development');
  });

  it('detects localhost / 127.0.0.1 as development', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    expect(getAppEnvironment()).toBe('development');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://127.0.0.1:3000');
    expect(getAppEnvironment()).toBe('development');
  });

  it('detects the production domains', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://nooracare.no');
    expect(getAppEnvironment()).toBe('production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.nooracare.no');
    expect(getAppEnvironment()).toBe('production');
  });

  it('treats other hosts (previews, test subdomain) as staging', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://test.nooracare.no');
    expect(getAppEnvironment()).toBe('staging');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://my-app-git-branch.vercel.app');
    expect(getAppEnvironment()).toBe('staging');
  });

  it('falls back to development on a malformed URL', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'not-a-url');
    expect(getAppEnvironment()).toBe('development');
  });
});

describe('isNonProduction', () => {
  it('is false only in production', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://nooracare.no');
    expect(isNonProduction()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://test.nooracare.no');
    expect(isNonProduction()).toBe(true);
  });
});
