import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  validateVippsConfig,
  isVippsConfigured,
  getVippsEnvironment,
  isVippsTestEnvironment,
} from './config';

const REQUIRED = [
  'VIPPS_CLIENT_ID',
  'VIPPS_CLIENT_SECRET',
  'VIPPS_SUBSCRIPTION_KEY',
  'VIPPS_MERCHANT_SERIAL_NUMBER',
];

function stubAllRequired() {
  for (const key of REQUIRED) vi.stubEnv(key, 'test-value');
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
});

describe('getVippsEnvironment', () => {
  it('defaults to test when no API URL is set', () => {
    vi.stubEnv('VIPPS_API_URL', '');
    expect(getVippsEnvironment()).toBe('test');
    expect(isVippsTestEnvironment()).toBe(true);
  });

  it('detects the test API URL', () => {
    vi.stubEnv('VIPPS_API_URL', 'https://apitest.vipps.no');
    expect(getVippsEnvironment()).toBe('test');
  });

  it('detects the production API URL', () => {
    vi.stubEnv('VIPPS_API_URL', 'https://api.vipps.no');
    expect(getVippsEnvironment()).toBe('production');
    expect(isVippsTestEnvironment()).toBe(false);
  });
});
