import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { sendEmail } from './send';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});

const MESSAGE = {
  from: 'NooraCare <no-reply@nooracare.no>',
  to: ['kari@example.com'],
  subject: 'Emne',
  text: 'Innhold',
};

beforeEach(() => {
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('sendEmail', () => {
  it('posts to Resend with the bearer key and exactly the fields given', async () => {
    const result = await sendEmail(MESSAGE);

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = m(fetch).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer re_test', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual(MESSAGE);
  });

  it('adds html, reply_to and the Idempotency-Key header when given', async () => {
    await sendEmail({
      ...MESSAGE,
      html: '<p>Innhold</p>',
      replyTo: ['post@nooracare.no'],
      idempotencyKey: 'order-confirmation/ord-1',
    });

    const [, init] = m(fetch).mock.calls[0];
    expect(init.headers['Idempotency-Key']).toBe('order-confirmation/ord-1');
    expect(JSON.parse(init.body)).toEqual({
      ...MESSAGE,
      html: '<p>Innhold</p>',
      reply_to: ['post@nooracare.no'],
    });
  });

  it('reports a rejected send without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => '{"message":"bad from"}' })
    );

    await expect(sendEmail(MESSAGE)).resolves.toEqual({ ok: false, error: 'Resend responded 422' });
  });

  it('reports a network failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    await expect(sendEmail(MESSAGE)).resolves.toEqual({ ok: false, error: 'ECONNRESET' });
  });

  it('sends nothing when RESEND_API_KEY is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    const result = await sendEmail(MESSAGE);

    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
