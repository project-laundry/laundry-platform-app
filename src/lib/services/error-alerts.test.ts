import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database/users', () => ({ getUsersByRole: vi.fn() }));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/analytics/server-errors', () => ({ captureServerException: vi.fn() }));

import { getUsersByRole } from '@/lib/database/users';
import { sendEmail } from '@/lib/email/send';
import { captureServerException } from '@/lib/analytics/server-errors';
import { buildErrorAlert, reportError } from './error-alerts';

vi.spyOn(console, 'error').mockImplementation(() => {});

const NOW = new Date('2026-11-22T14:05:09Z');
const admin = (email: string, deleted_at: string | null = null) => ({ id: `id-${email}`, email, deleted_at }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUsersByRole).mockResolvedValue([admin('a@nooracare.no'), admin('gone@nooracare.no', '2026-01-01')]);
  vi.mocked(sendEmail).mockResolvedValue({ ok: true });
});

describe('buildErrorAlert', () => {
  it('names the source, the message, the details and a trimmed stack', () => {
    const error = new Error('Vipps said no');
    error.stack = ['Error: Vipps said no', ...Array.from({ length: 30 }, (_, i) => `    at frame${i}`)].join('\n');

    const alert = buildErrorAlert('Vipps charge creation', error, { order: 'ABC123', empty: null }, NOW);

    expect(alert.subject).toBe('NooraCare feil: Vipps charge creation');
    expect(alert.text).toContain('Kilde: Vipps charge creation');
    expect(alert.text).toContain('Feil: Vipps said no');
    expect(alert.text).toContain('order: ABC123');
    expect(alert.text).not.toContain('empty');
    expect(alert.text).toContain('at frame10');
    expect(alert.text).not.toContain('at frame11');
  });

  it('keys on source + message + hour, so the same error is one e-mail per hour', () => {
    const key = (source: string, message: string, at: string) =>
      buildErrorAlert(source, new Error(message), {}, new Date(at)).idempotencyKey;

    const base = key('webhook', 'boom', '2026-11-22T14:05:09Z');
    expect(base).toMatch(/^error-alert\/[0-9a-f]{16}\/2026-11-22T14$/);
    expect(key('webhook', 'boom', '2026-11-22T14:59:59Z')).toBe(base);
    expect(key('webhook', 'boom', '2026-11-22T15:00:00Z')).not.toBe(base);
    expect(key('webhook', 'other', '2026-11-22T14:05:09Z')).not.toBe(base);
    expect(key('cron', 'boom', '2026-11-22T14:05:09Z')).not.toBe(base);
  });

  it('accepts values that are not Error objects', () => {
    expect(buildErrorAlert('x', 'plain text', {}, NOW).text).toContain('Feil: plain text');
    expect(buildErrorAlert('x', { code: 42 }, {}, NOW).text).toContain('Feil: {"code":42}');
  });
});

describe('reportError', () => {
  it('e-mails every active admin with the idempotency key', async () => {
    await reportError('webhook', new Error('boom'), { agreement: 'agr_1' });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const message = vi.mocked(sendEmail).mock.calls[0][0];
    expect(captureServerException).toHaveBeenCalledWith('webhook', expect.any(Error), { agreement: 'agr_1' });
    expect(message.to).toEqual(['a@nooracare.no']);
    expect(message.subject).toBe('NooraCare feil: webhook');
    expect(message.text).toContain('agreement: agr_1');
    expect(message.idempotencyKey).toMatch(/^error-alert\/[0-9a-f]{16}\/.+\/id-a@nooracare\.no$/);
  });

  it('sends nothing when there is no admin', async () => {
    vi.mocked(getUsersByRole).mockResolvedValue([]);
    await reportError('webhook', new Error('boom'));
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws, even when the lookup or the send blows up', async () => {
    vi.mocked(getUsersByRole).mockRejectedValue(new Error('db down'));
    await expect(reportError('webhook', new Error('boom'))).resolves.toBeUndefined();

    vi.mocked(getUsersByRole).mockResolvedValue([admin('a@nooracare.no')]);
    vi.mocked(sendEmail).mockRejectedValue(new Error('network'));
    await expect(reportError('webhook', new Error('boom'))).resolves.toBeUndefined();
  });
});
