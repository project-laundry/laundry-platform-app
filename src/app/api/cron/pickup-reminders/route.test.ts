import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/orders', () => ({ getOrdersForPickupReminder: vi.fn() }));
vi.mock('@/lib/services/customer-emails', () => ({ sendPickupReminderEmail: vi.fn() }));

import { getOrdersForPickupReminder } from '@/lib/database/orders';
import { sendPickupReminderEmail } from '@/lib/services/customer-emails';
import { GET } from './route';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

const URL_ = 'https://nooracare.no/api/cron/pickup-reminders';
const call = (authorization?: string) =>
  GET(new Request(URL_, { headers: authorization ? { authorization } : {} }));

const ORDERS = [{ id: 'ord-1' }, { id: 'ord-2' }, { id: 'ord-3' }];

beforeEach(() => {
  vi.clearAllMocks();
  // Monday 23 November 2026, 17:00 in Oslo — the moment the cron fires.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-23T16:00:00Z'));
  vi.stubEnv('CRON_SECRET', 'secret');
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://nooracare.no');
  m(getOrdersForPickupReminder).mockResolvedValue(ORDERS);
  m(sendPickupReminderEmail).mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('GET /api/cron/pickup-reminders', () => {
  it('answers 401 without the cron secret and sends nothing', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
    expect(getOrdersForPickupReminder).not.toHaveBeenCalled();
    expect(sendPickupReminderEmail).not.toHaveBeenCalled();
  });

  it('answers 401 when CRON_SECRET is not configured at all', async () => {
    vi.stubEnv('CRON_SECRET', '');

    expect((await call('Bearer ')).status).toBe(401);
  });

  it('answers 500 when the Resend key or the app URL is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect((await call('Bearer secret')).status).toBe(500);

    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect((await call('Bearer secret')).status).toBe(500);

    expect(getOrdersForPickupReminder).not.toHaveBeenCalled();
  });

  it("reminds every order scheduled for tomorrow's Oslo date", async () => {
    const res = await call('Bearer secret');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ date: '2026-11-24', sent: 3, failed: 0 });
    expect(getOrdersForPickupReminder).toHaveBeenCalledWith('2026-11-24');
    expect(m(sendPickupReminderEmail).mock.calls.map(([order]) => order)).toEqual(ORDERS);
  });

  it('answers 200 with zero counts when nobody has a pickup tomorrow', async () => {
    m(getOrdersForPickupReminder).mockResolvedValue([]);

    const res = await call('Bearer secret');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ date: '2026-11-24', sent: 0, failed: 0 });
    expect(sendPickupReminderEmail).not.toHaveBeenCalled();
  });

  it('keeps going after a failed send and answers 502 with the counts', async () => {
    m(sendPickupReminderEmail)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const res = await call('Bearer secret');

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ date: '2026-11-24', sent: 2, failed: 1 });
    expect(sendPickupReminderEmail).toHaveBeenCalledTimes(3);
  });

  it('answers 500 when the orders could not be loaded', async () => {
    m(getOrdersForPickupReminder).mockResolvedValue(null);

    expect((await call('Bearer secret')).status).toBe(500);
    expect(sendPickupReminderEmail).not.toHaveBeenCalled();
  });
});
