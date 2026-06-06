import { describe, it, expect, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { validateVippsWebhook, getVippsWebhookSecret } from './webhook-auth';

const URL_STR = 'https://hooks.example.com/api/webhooks/vipps/recurring';
const DATE = 'Mon, 01 Jan 2026 00:00:00 GMT';
const HOST = 'hooks.example.com';

/**
 * Build a request whose headers carry a valid HMAC-SHA256 signature for `body`,
 * mirroring exactly what Vipps sends. The verifier only reads `method`, `url`,
 * and `headers.get(...)`, so a minimal stand-in is enough (and avoids the
 * "host is a forbidden header" restriction on real fetch Request objects).
 */
function signedRequest(
  body: string,
  signingSecret: string,
  overrides: Partial<Record<'authorization' | 'x-ms-content-sha256' | 'x-ms-date' | 'host', string | null>> = {}
): NextRequest {
  const method = 'POST';
  const contentHash = crypto.createHash('sha256').update(body).digest('base64');
  const { pathname, search } = new URL(URL_STR);
  const signedString = `${method}\n${pathname + search}\n${DATE};${HOST};${contentHash}`;
  const signature = crypto.createHmac('sha256', signingSecret).update(signedString).digest('base64');
  const authorization = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`;

  const headerValues: Record<string, string | null> = {
    authorization,
    'x-ms-content-sha256': contentHash,
    'x-ms-date': DATE,
    host: HOST,
    ...overrides,
  };

  return {
    method,
    url: URL_STR,
    headers: {
      get: (name: string) => headerValues[name.toLowerCase()] ?? null,
    },
  } as unknown as NextRequest;
}

const SECRET = 'super-secret-webhook-key';
const BODY = JSON.stringify({ agreementId: 'agr_123', eventType: 'recurring.agreement-activated.v1' });

describe('validateVippsWebhook', () => {
  it('accepts a correctly signed request', () => {
    expect(validateVippsWebhook(signedRequest(BODY, SECRET), BODY, SECRET)).toBe(true);
  });

  it('rejects when the body no longer matches the content hash', () => {
    const request = signedRequest(BODY, SECRET);
    expect(validateVippsWebhook(request, BODY + 'tampered', SECRET)).toBe(false);
  });

  it('rejects a signature made with a different secret', () => {
    const request = signedRequest(BODY, 'attacker-secret');
    expect(validateVippsWebhook(request, BODY, SECRET)).toBe(false);
  });

  it('rejects when a required header is missing', () => {
    const request = signedRequest(BODY, SECRET, { 'x-ms-date': null });
    expect(validateVippsWebhook(request, BODY, SECRET)).toBe(false);
  });

  it('rejects when no webhook secret is configured', () => {
    expect(validateVippsWebhook(signedRequest(BODY, SECRET), BODY, undefined)).toBe(false);
  });
});

describe('getVippsWebhookSecret', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers the endpoint-specific secret', () => {
    vi.stubEnv('VIPPS_WEBHOOK_SECRET', 'shared');
    vi.stubEnv('VIPPS_WEBHOOK_SECRET_RECURRING', 'recurring-specific');
    expect(getVippsWebhookSecret('recurring')).toBe('recurring-specific');
  });

  it('falls back to the shared secret', () => {
    vi.stubEnv('VIPPS_WEBHOOK_SECRET', 'shared');
    vi.stubEnv('VIPPS_WEBHOOK_SECRET_RECURRING', '');
    expect(getVippsWebhookSecret('recurring')).toBe('shared');
    expect(getVippsWebhookSecret()).toBe('shared');
  });

  it('returns undefined when nothing is configured', () => {
    // stubbing to `undefined` deletes the var (vs '' which sets an empty string)
    vi.stubEnv('VIPPS_WEBHOOK_SECRET', undefined);
    vi.stubEnv('VIPPS_WEBHOOK_SECRET_RECURRING', undefined);
    expect(getVippsWebhookSecret('recurring')).toBeUndefined();
  });
});
