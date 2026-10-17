import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  validateVippsConfig,
  isVippsConfigured,
  getVippsApiUrl,
  getVippsEnvironment,
  isVippsForceAcceptAllowed,
  pickVippsTestPhone,
} from './config';

const REQUIRED_CREDENTIALS = [
  'VIPPS_CLIENT_ID',
  'VIPPS_CLIENT_SECRET',
  'VIPPS_SUBSCRIPTION_KEY',
  'VIPPS_MERCHANT_SERIAL_NUMBER',
];

function stubAllRequired() {
  for (const key of REQUIRED_CREDENTIALS) vi.stubEnv(key, 'test-value');
  vi.stubEnv('VIPPS_API_URL', 'https://apitest.vipps.no');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('validateVippsConfig', () => {
  it('passes when all required vars are set', () => {
    stubAllRequired();
    expect(() => validateVippsConfig()).not.toThrow();
    expect(isVippsConfigured()).toBe(true);
  });

  it('throws listing the missing variables', () => {
    stubAllRequired();
    vi.stubEnv('VIPPS_CLIENT_SECRET', '');
    expect(() => validateVippsConfig()).toThrow(/VIPPS_CLIENT_SECRET/);
    expect(isVippsConfigured()).toBe(false);
  });

  it('treats VIPPS_API_URL as required', () => {
    stubAllRequired();
    vi.stubEnv('VIPPS_API_URL', '');
    expect(() => validateVippsConfig()).toThrow(/Missing required Vipps environment variables: VIPPS_API_URL/);
    expect(isVippsConfigured()).toBe(false);
  });

  it('rejects a VIPPS_API_URL that is not a Vipps host', () => {
    stubAllRequired();
    vi.stubEnv('VIPPS_API_URL', 'https://api.vipps.com');
    expect(() => validateVippsConfig()).toThrow(/must be exactly/);
    expect(isVippsConfigured()).toBe(false);
  });
});

describe('getVippsApiUrl', () => {
  it('throws when VIPPS_API_URL is unset — no test-API fallback', () => {
    // stubbing to `undefined` deletes the var (vs '' which sets an empty string)
    vi.stubEnv('VIPPS_API_URL', undefined);
    expect(() => getVippsApiUrl()).toThrow(/VIPPS_API_URL is not set/);
  });

  it('throws when VIPPS_API_URL is empty', () => {
    vi.stubEnv('VIPPS_API_URL', '');
    expect(() => getVippsApiUrl()).toThrow(/VIPPS_API_URL is not set/);
  });

  it('rejects anything but the two Vipps hosts', () => {
    vi.stubEnv('VIPPS_API_URL', 'https://apitest.vipps.no.evil.example');
    expect(() => getVippsApiUrl()).toThrow(/must be exactly/);
    vi.stubEnv('VIPPS_API_URL', 'http://api.vipps.no');
    expect(() => getVippsApiUrl()).toThrow(/must be exactly/);
    vi.stubEnv('VIPPS_API_URL', 'https://api.vipps.no/recurring');
    expect(() => getVippsApiUrl()).toThrow(/must be exactly/);
  });

  it('returns the known hosts, tolerating whitespace and a trailing slash', () => {
    vi.stubEnv('VIPPS_API_URL', 'https://api.vipps.no');
    expect(getVippsApiUrl()).toBe('https://api.vipps.no');
    vi.stubEnv('VIPPS_API_URL', 'https://apitest.vipps.no/');
    expect(getVippsApiUrl()).toBe('https://apitest.vipps.no');
    vi.stubEnv('VIPPS_API_URL', ' https://api.vipps.no ');
    expect(getVippsApiUrl()).toBe('https://api.vipps.no');
  });
});

describe('getVippsEnvironment', () => {
  it('throws instead of defaulting to test when no API URL is set', () => {
    vi.stubEnv('VIPPS_API_URL', '');
    expect(() => getVippsEnvironment()).toThrow(/VIPPS_API_URL/);
  });

  it('detects the test API URL', () => {
    vi.stubEnv('VIPPS_API_URL', 'https://apitest.vipps.no');
    expect(getVippsEnvironment()).toBe('test');
  });

  it('detects the production API URL', () => {
    vi.stubEnv('VIPPS_API_URL', 'https://api.vipps.no');
    expect(getVippsEnvironment()).toBe('production');
  });
});

describe('isVippsForceAcceptAllowed', () => {
  it('is false when the flag is unset, even against the test API', () => {
    vi.stubEnv('NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT', undefined);
    vi.stubEnv('VIPPS_API_URL', 'https://apitest.vipps.no');
    expect(isVippsForceAcceptAllowed()).toBe(false);
  });

  it('requires the literal string "true"', () => {
    vi.stubEnv('VIPPS_API_URL', 'https://apitest.vipps.no');
    vi.stubEnv('NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT', '1');
    expect(isVippsForceAcceptAllowed()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT', 'TRUE');
    expect(isVippsForceAcceptAllowed()).toBe(false);
  });

  it('is false against the production API even when the flag is set', () => {
    vi.stubEnv('NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT', 'true');
    vi.stubEnv('VIPPS_API_URL', 'https://api.vipps.no');
    expect(isVippsForceAcceptAllowed()).toBe(false);
  });

  it('is false (not an exception) when VIPPS_API_URL is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT', 'true');
    vi.stubEnv('VIPPS_API_URL', '');
    expect(isVippsForceAcceptAllowed()).toBe(false);
  });

  it('is true only with the flag set and the test API', () => {
    vi.stubEnv('NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT', 'true');
    vi.stubEnv('VIPPS_API_URL', 'https://apitest.vipps.no');
    expect(isVippsForceAcceptAllowed()).toBe(true);
  });
});

describe('pickVippsTestPhone', () => {
  it('returns a whitelisted Vipps test number', () => {
    expect(pickVippsTestPhone('a1b2c3')).toMatch(/^47\d{8}$/);
  });

  it('is deterministic for the same customer', () => {
    expect(pickVippsTestPhone('customer-1')).toBe(pickVippsTestPhone('customer-1'));
  });

  it('spreads different customers across the pool', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `customer-${i}`);
    const distinct = new Set(ids.map(pickVippsTestPhone));
    expect(distinct.size).toBeGreaterThan(1);
  });
});
