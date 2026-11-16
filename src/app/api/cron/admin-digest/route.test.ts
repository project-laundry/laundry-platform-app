import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/admin-attention', () => ({ getAdminAttention: vi.fn() }));
vi.mock('@/lib/database/users', () => ({ getUsersByRole: vi.fn() }));
vi.mock('@/lib/services/admin-digest', () => ({
  buildAdminDigest: vi.fn(() => ({ subject: 'Emne', text: 'Innhold' })),
}));

import { getAdminAttention } from '@/lib/database/admin-attention';
import { getUsersByRole } from '@/lib/database/users';
import { buildAdminDigest } from '@/lib/services/admin-digest';
import { GET } from './route';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

const URL_ = 'https://nooracare.no/api/cron/admin-digest';
const call = (authorization?: string) =>
  GET(new Request(URL_, { headers: authorization ? { authorization } : {} }));

const attention = { today: '2026-10-17' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', 'secret');
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://nooracare.no');
  vi.stubEnv('ADMIN_DIGEST_FROM', '');
  m(getAdminAttention).mockResolvedValue(attention);
  m(getUsersByRole).mockResolvedValue([
    { id: 'u1', email: 'a@nooracare.no', role: 'admin', deleted_at: null },
    { id: 'u2', email: 'gone@nooracare.no', role: 'admin', deleted_at: '2026-01-01T00:00:00.000Z' },
    { id: 'u3', email: 'b@nooracare.no', role: 'admin', deleted_at: null },
  ]);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('GET /api/cron/admin-digest', () => {
  it('answers 401 without the cron secret and sends nothing', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
    expect(getAdminAttention).not.toHaveBeenCalled();
  });

  it('answers 401 when CRON_SECRET is not configured at all', async () => {
    vi.stubEnv('CRON_SECRET', '');

    expect((await call('Bearer ')).status).toBe(401);
  });

  it('answers 500 when the Resend key is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    expect((await call('Bearer secret')).status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('e-mails the digest to every non-deleted admin via Resend', async () => {
    const res = await call('Bearer secret');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ sent: 2 });
    expect(buildAdminDigest).toHaveBeenCalledWith(attention, {
      appUrl: 'https://nooracare.no',
      now: expect.any(Date),
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = m(fetch).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init.body)).toEqual({
      from: 'NooraCare <varsel@nooracare.no>',
      to: ['a@nooracare.no', 'b@nooracare.no'],
      subject: 'Emne',
      text: 'Innhold',
    });
  });

  it('answers 500 when there is no admin to send to', async () => {
    m(getUsersByRole).mockResolvedValue([]);

    expect((await call('Bearer secret')).status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('answers 502 when Resend rejects the e-mail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => '{"message":"bad from"}' })
    );

    expect((await call('Bearer secret')).status).toBe(502);
  });
});
