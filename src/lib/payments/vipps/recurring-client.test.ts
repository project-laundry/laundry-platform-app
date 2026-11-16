import { describe, it, expect, afterEach, vi } from 'vitest';
import { createVippsRecurringClient, VippsRecurringClient } from './recurring-client';

afterEach(() => {
  vi.unstubAllEnvs();
});

function stubCredentials() {
  vi.stubEnv('VIPPS_CLIENT_ID', 'id');
  vi.stubEnv('VIPPS_CLIENT_SECRET', 'secret');
  vi.stubEnv('VIPPS_SUBSCRIPTION_KEY', 'sub-key');
  vi.stubEnv('VIPPS_MERCHANT_SERIAL_NUMBER', '123456');
}

describe('createVippsRecurringClient', () => {
  it('throws when VIPPS_API_URL is unset instead of falling back to the test API', () => {
    stubCredentials();
    vi.stubEnv('VIPPS_API_URL', undefined);
    expect(() => createVippsRecurringClient()).toThrow(/VIPPS_API_URL/);
  });

  it('throws when VIPPS_API_URL is not a Vipps host', () => {
    stubCredentials();
    vi.stubEnv('VIPPS_API_URL', 'https://example.com');
    expect(() => createVippsRecurringClient()).toThrow(/VIPPS_API_URL/);
  });

  it('throws when a credential is missing', () => {
    stubCredentials();
    vi.stubEnv('VIPPS_CLIENT_SECRET', '');
    vi.stubEnv('VIPPS_API_URL', 'https://api.vipps.no');
    expect(() => createVippsRecurringClient()).toThrow(/VIPPS_CLIENT_SECRET/);
  });

  it('builds a client when everything is set', () => {
    stubCredentials();
    vi.stubEnv('VIPPS_API_URL', 'https://api.vipps.no');
    expect(createVippsRecurringClient()).toBeInstanceOf(VippsRecurringClient);
  });
});
