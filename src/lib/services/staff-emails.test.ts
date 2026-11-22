import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/orders', () => ({ getOrderForStaffEmail: vi.fn() }));
vi.mock('@/lib/database/cleaners', () => ({ getCleanerWithUserById: vi.fn() }));
vi.mock('@/lib/database/users', () => ({ getUsersByRole: vi.fn() }));
vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
  CUSTOMER_EMAIL_FROM: 'NooraCare <no-reply@nooracare.no>',
}));
vi.mock('@/lib/email/staff-emails', () => ({
  buildCleanerNewOrderEmail: vi.fn(() => ({ subject: 'Nytt oppdrag', text: 'tekst', html: '<p>html</p>' })),
  buildAdminNewOrderEmail: vi.fn(() => ({ subject: 'Ny ordre', text: 'tekst' })),
  buildAdminOrderUnassignedEmail: vi.fn(() => ({ subject: 'Venter', text: 'tekst' })),
  buildCleanerPickupRescheduledEmail: vi.fn(() => ({ subject: 'Ny hentedato', text: 'tekst', html: '<p>html</p>' })),
  buildCleanerOrderMovedEmail: vi.fn(() => ({ subject: 'Flyttet', text: 'tekst', html: '<p>html</p>' })),
}));

import { getOrderForStaffEmail } from '@/lib/database/orders';
import { getCleanerWithUserById } from '@/lib/database/cleaners';
import { getUsersByRole } from '@/lib/database/users';
import { sendEmail } from '@/lib/email/send';
import {
  buildAdminNewOrderEmail,
  buildAdminOrderUnassignedEmail,
  buildCleanerNewOrderEmail,
  buildCleanerOrderMovedEmail,
  buildCleanerPickupRescheduledEmail,
} from '@/lib/email/staff-emails';
import {
  sendAdminNewOrderEmail,
  sendAdminOrderUnassignedEmail,
  sendCleanerNewOrderEmail,
  sendCleanerPickupRescheduledEmails,
} from './staff-emails';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

const ORDER = {
  id: 'ord-1',
  status: 'pickup_scheduled',
  cleaner_id: 'cl-1',
  assigned_at: '2026-10-20T10:00:00.000Z',
  declined_by_cleaner_ids: null,
  cleaner: { display_name: 'Ola Rens', user: { email: 'ola@example.com', full_name: 'Ola Hansen' } },
};

const PENDING_ORDER = {
  ...ORDER,
  status: 'pending_assignment',
  cleaner_id: null,
  assigned_at: null,
  declined_by_cleaner_ids: ['cl-1', 'cl-2'],
  cleaner: null,
};

const ADMINS = [
  { id: 'adm-1', email: 'admin1@example.com', deleted_at: null },
  { id: 'adm-0', email: 'gone@example.com', deleted_at: '2026-01-01T00:00:00.000Z' },
  { id: 'adm-2', email: 'admin2@example.com', deleted_at: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://nooracare.no');
  vi.stubEnv('ADMIN_DIGEST_FROM', '');
  m(getOrderForStaffEmail).mockResolvedValue(ORDER);
  m(getUsersByRole).mockResolvedValue(ADMINS);
  m(sendEmail).mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sendCleanerNewOrderEmail', () => {
  it('sends «Nytt oppdrag» to the cleaner, keyed on order, cleaner and assignment time', async () => {
    await sendCleanerNewOrderEmail('ord-1');

    expect(getOrderForStaffEmail).toHaveBeenCalledWith('ord-1');
    expect(buildCleanerNewOrderEmail).toHaveBeenCalledWith(ORDER, { appUrl: 'https://nooracare.no' });
    expect(sendEmail).toHaveBeenCalledWith({
      from: 'NooraCare <no-reply@nooracare.no>',
      to: ['ola@example.com'],
      replyTo: ['post@nooracare.no'],
      subject: 'Nytt oppdrag',
      text: 'tekst',
      html: '<p>html</p>',
      idempotencyKey: 'cleaner-new-order/ord-1/cl-1/2026-10-20T10:00:00.000Z',
    });
  });

  it('uses a new key for a later assignment of the same cleaner', async () => {
    m(getOrderForStaffEmail).mockResolvedValue({ ...ORDER, assigned_at: '2026-10-20T15:30:00.000Z' });

    await sendCleanerNewOrderEmail('ord-1');

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'cleaner-new-order/ord-1/cl-1/2026-10-20T15:30:00.000Z' })
    );
  });

  it('sends nothing when the order has no cleaner', async () => {
    m(getOrderForStaffEmail).mockResolvedValue(PENDING_ORDER);

    await sendCleanerNewOrderEmail('ord-1');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the order is no longer pickup_scheduled', async () => {
    m(getOrderForStaffEmail).mockResolvedValue({ ...ORDER, status: 'cancelled' });

    await sendCleanerNewOrderEmail('ord-1');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the order is not found', async () => {
    m(getOrderForStaffEmail).mockResolvedValue(null);

    await sendCleanerNewOrderEmail('ord-x');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when NEXT_PUBLIC_APP_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    await sendCleanerNewOrderEmail('ord-1');

    expect(getOrderForStaffEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the database helper rejects', async () => {
    m(getOrderForStaffEmail).mockRejectedValue(new Error('db down'));

    await expect(sendCleanerNewOrderEmail('ord-1')).resolves.toBeUndefined();
  });

  it('never throws when the send is rejected', async () => {
    m(sendEmail).mockResolvedValue({ ok: false, error: 'Resend responded 500' });

    await expect(sendCleanerNewOrderEmail('ord-1')).resolves.toBeUndefined();
  });
});

describe('sendAdminNewOrderEmail', () => {
  it('sends one plain-text e-mail to every non-deleted admin, keyed on the order', async () => {
    await sendAdminNewOrderEmail('ord-1');

    expect(getUsersByRole).toHaveBeenCalledWith('admin');
    expect(buildAdminNewOrderEmail).toHaveBeenCalledWith(ORDER, { appUrl: 'https://nooracare.no' });
    // One message per admin, each with its own idempotency key.
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith({
      from: 'NooraCare <varsel@nooracare.no>',
      to: ['admin1@example.com'],
      subject: 'Ny ordre',
      text: 'tekst',
      idempotencyKey: 'admin-new-order/ord-1/adm-1',
    });
    expect(sendEmail).toHaveBeenCalledWith({
      from: 'NooraCare <varsel@nooracare.no>',
      to: ['admin2@example.com'],
      subject: 'Ny ordre',
      text: 'tekst',
      idempotencyKey: 'admin-new-order/ord-1/adm-2',
    });
  });

  it('uses ADMIN_DIGEST_FROM as the sender when it is set', async () => {
    vi.stubEnv('ADMIN_DIGEST_FROM', 'Drift <drift@nooracare.no>');

    await sendAdminNewOrderEmail('ord-1');

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ from: 'Drift <drift@nooracare.no>' }));
  });

  it('sends nothing when there are no admins', async () => {
    m(getUsersByRole).mockResolvedValue([]);

    await sendAdminNewOrderEmail('ord-1');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the order is not found', async () => {
    m(getOrderForStaffEmail).mockResolvedValue(null);

    await sendAdminNewOrderEmail('ord-x');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when loading the admins rejects', async () => {
    m(getUsersByRole).mockRejectedValue(new Error('db down'));

    await expect(sendAdminNewOrderEmail('ord-1')).resolves.toBeUndefined();
  });
});

describe('sendAdminOrderUnassignedEmail', () => {
  beforeEach(() => {
    m(getOrderForStaffEmail).mockResolvedValue(PENDING_ORDER);
  });

  it('alerts every admin, keyed on the order and the number of declines', async () => {
    await sendAdminOrderUnassignedEmail('ord-1', 'Ola Rens');

    expect(buildAdminOrderUnassignedEmail).toHaveBeenCalledWith(
      PENDING_ORDER,
      { declinedByName: 'Ola Rens' },
      { appUrl: 'https://nooracare.no' }
    );
    expect(sendEmail).toHaveBeenCalledWith({
      from: 'NooraCare <varsel@nooracare.no>',
      to: ['admin2@example.com'],
      subject: 'Venter',
      text: 'tekst',
      idempotencyKey: 'admin-order-unassigned/ord-1/2/adm-2',
    });
  });

  it('sends nothing when the order is no longer pending_assignment', async () => {
    m(getOrderForStaffEmail).mockResolvedValue(ORDER);

    await sendAdminOrderUnassignedEmail('ord-1', 'Ola Rens');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the database helper rejects', async () => {
    m(getOrderForStaffEmail).mockRejectedValue(new Error('db down'));

    await expect(sendAdminOrderUnassignedEmail('ord-1', 'Ola Rens')).resolves.toBeUndefined();
  });
});

describe('sendCleanerPickupRescheduledEmails', () => {
  /** The order row as the action read it BEFORE the write (held by cl-1). */
  const BEFORE = {
    scheduled_date: '2026-10-22',
    cleaner_id: 'cl-1',
    updated_at: '2026-10-20T10:00:00+00:00',
  };
  /** The order as re-read AFTER the write: new date, still held by cl-1. */
  const MOVED_ORDER = { ...ORDER, order_number: 'ABC123', scheduled_date: '2026-10-24' };
  /** The order as re-read AFTER the write: new date, now held by cl-2. */
  const REASSIGNED_ORDER = {
    ...MOVED_ORDER,
    cleaner_id: 'cl-2',
    assigned_at: '2026-10-21T08:00:00.000Z',
    cleaner: { display_name: 'Per Rens', user: { email: 'per@example.com', full_name: 'Per Olsen' } },
  };

  beforeEach(() => {
    m(getOrderForStaffEmail).mockResolvedValue(MOVED_ORDER);
    m(getCleanerWithUserById).mockResolvedValue({
      id: 'cl-1',
      user: { email: 'ola@example.com', full_name: 'Ola Hansen' },
    });
  });

  it('sends «Ny hentedato» to the cleaner who keeps the order, keyed on the changed row version', async () => {
    await sendCleanerPickupRescheduledEmails('ord-1', BEFORE);

    expect(getOrderForStaffEmail).toHaveBeenCalledWith('ord-1');
    expect(buildCleanerPickupRescheduledEmail).toHaveBeenCalledWith(
      MOVED_ORDER,
      { previousPickupDate: '2026-10-22' },
      { appUrl: 'https://nooracare.no' }
    );
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith({
      from: 'NooraCare <no-reply@nooracare.no>',
      to: ['ola@example.com'],
      replyTo: ['post@nooracare.no'],
      subject: 'Ny hentedato',
      text: 'tekst',
      html: '<p>html</p>',
      idempotencyKey: 'cleaner-pickup-rescheduled/ord-1/cl-1/2026-10-20T10:00:00+00:00',
    });
    expect(getCleanerWithUserById).not.toHaveBeenCalled();
    expect(buildCleanerNewOrderEmail).not.toHaveBeenCalled();
  });

  it('uses a new key for every change, so A → B → A is never swallowed', async () => {
    await sendCleanerPickupRescheduledEmails('ord-1', BEFORE);
    await sendCleanerPickupRescheduledEmails('ord-1', { ...BEFORE, updated_at: '2026-10-20T11:00:00+00:00' });

    const keys = m(sendEmail).mock.calls.map(([message]) => message.idempotencyKey);
    expect(keys).toEqual([
      'cleaner-pickup-rescheduled/ord-1/cl-1/2026-10-20T10:00:00+00:00',
      'cleaner-pickup-rescheduled/ord-1/cl-1/2026-10-20T11:00:00+00:00',
    ]);
  });

  it('tells the previous cleaner the order is gone and sends «Nytt oppdrag» to the new one', async () => {
    m(getOrderForStaffEmail).mockResolvedValue(REASSIGNED_ORDER);

    await sendCleanerPickupRescheduledEmails('ord-1', BEFORE);

    expect(getCleanerWithUserById).toHaveBeenCalledWith('cl-1');
    expect(buildCleanerOrderMovedEmail).toHaveBeenCalledWith(
      { orderNumber: 'ABC123', previousPickupDate: '2026-10-22', cleanerFullName: 'Ola Hansen' },
      { appUrl: 'https://nooracare.no' }
    );
    expect(buildCleanerPickupRescheduledEmail).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenNthCalledWith(1, {
      from: 'NooraCare <no-reply@nooracare.no>',
      to: ['ola@example.com'],
      replyTo: ['post@nooracare.no'],
      subject: 'Flyttet',
      text: 'tekst',
      html: '<p>html</p>',
      idempotencyKey: 'cleaner-order-moved/ord-1/cl-1/2026-10-20T10:00:00+00:00',
    });
    expect(sendEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: ['per@example.com'],
        subject: 'Nytt oppdrag',
        idempotencyKey: 'cleaner-new-order/ord-1/cl-2/2026-10-21T08:00:00.000Z',
      })
    );
  });

  it('still sends «Nytt oppdrag» to the new cleaner when the previous cleaner cannot be loaded', async () => {
    m(getOrderForStaffEmail).mockResolvedValue(REASSIGNED_ORDER);
    m(getCleanerWithUserById).mockResolvedValue(null);

    await sendCleanerPickupRescheduledEmails('ord-1', BEFORE);

    expect(buildCleanerOrderMovedEmail).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: ['per@example.com'] }));
  });

  it('sends nothing when no cleaner held the order before the change', async () => {
    await sendCleanerPickupRescheduledEmails('ord-1', { ...BEFORE, cleaner_id: null });

    expect(getOrderForStaffEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the date did not change', async () => {
    await sendCleanerPickupRescheduledEmails('ord-1', { ...BEFORE, scheduled_date: '2026-10-24' });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the order is no longer pickup_scheduled', async () => {
    m(getOrderForStaffEmail).mockResolvedValue({ ...MOVED_ORDER, status: 'cancelled' });

    await sendCleanerPickupRescheduledEmails('ord-1', BEFORE);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the order is not found', async () => {
    m(getOrderForStaffEmail).mockResolvedValue(null);

    await sendCleanerPickupRescheduledEmails('ord-x', BEFORE);

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when NEXT_PUBLIC_APP_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    await sendCleanerPickupRescheduledEmails('ord-1', BEFORE);

    expect(getOrderForStaffEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the database helper rejects', async () => {
    m(getOrderForStaffEmail).mockRejectedValue(new Error('db down'));

    await expect(sendCleanerPickupRescheduledEmails('ord-1', BEFORE)).resolves.toBeUndefined();
  });

  it('never throws when the send is rejected', async () => {
    m(sendEmail).mockResolvedValue({ ok: false, error: 'Resend responded 500' });

    await expect(sendCleanerPickupRescheduledEmails('ord-1', BEFORE)).resolves.toBeUndefined();
  });
});
