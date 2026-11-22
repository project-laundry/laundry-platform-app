import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/database/cleaners', () => ({ getCleanerByUserId: vi.fn(), findAvailableCleaner: vi.fn() }));
vi.mock('@/lib/database/orders', () => ({
  getOrderById: vi.fn(),
  declineOrder: vi.fn(),
  assignCleanerToPendingOrder: vi.fn(),
  updateOrderLaundryDetails: vi.fn(),
  updateOrderStatusGuarded: vi.fn(),
  getOrderByIdAndCleanerId: vi.fn(),
}));
vi.mock('@/lib/services/staff-emails', () => ({
  sendCleanerNewOrderEmail: vi.fn(),
  sendAdminOrderUnassignedEmail: vi.fn(),
}));
vi.mock('@/lib/payments/vipps/service', () => ({ createChargeForCompletedOrder: vi.fn() }));
vi.mock('@/lib/services/complete-order', () => ({ completeDeliveredOrder: vi.fn() }));
vi.mock('@/lib/email/admin-mail', () => ({ sendToAdmins: vi.fn() }));
vi.mock('@/lib/services/customer-emails', () => ({
  sendPriceReceiptEmail: vi.fn(),
  sendOrderPickedUpEmail: vi.fn(),
}));

import { findAvailableCleaner, getCleanerByUserId } from '@/lib/database/cleaners';
import {
  assignCleanerToPendingOrder,
  declineOrder,
  getOrderById,
  getOrderByIdAndCleanerId,
  updateOrderLaundryDetails,
  updateOrderStatusGuarded,
} from '@/lib/database/orders';
import { sendAdminOrderUnassignedEmail, sendCleanerNewOrderEmail } from '@/lib/services/staff-emails';
import { completeDeliveredOrder } from '@/lib/services/complete-order';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';
import { sendOrderPickedUpEmail, sendPriceReceiptEmail } from '@/lib/services/customer-emails';
import { sendToAdmins } from '@/lib/email/admin-mail';
import { MAX_WASH_LOADS_PER_ORDER } from '@/lib/config/pricing';
import {
  declineCleanerOrder,
  markOrderPickedUpAction,
  markOrderDeliveredAction,
  markOrderReadyForDelivery,
  saveLaundryDetails,
} from './actions';

const m = (fn: unknown) => fn as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  m(getCleanerByUserId).mockResolvedValue({ id: 'cl-1' });
  m(updateOrderStatusGuarded).mockResolvedValue({ id: 'ord-1' });
  m(completeDeliveredOrder).mockResolvedValue({ success: true });
  m(sendToAdmins).mockResolvedValue({ recipients: 1, sent: 1 });
});

describe('markOrderPickedUpAction', () => {
  it('moves a pickup straight to in_cleaning, stamping picked_up_at', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({
      id: 'ord-1',
      status: 'pickup_scheduled',
      scheduled_date: '2026-10-16',
    });

    const result = await markOrderPickedUpAction('ord-1');

    expect(result).toEqual({ success: true });
    expect(getOrderByIdAndCleanerId).toHaveBeenCalledWith('ord-1', 'cl-1');
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith(
      'ord-1',
      'pickup_scheduled',
      'in_cleaning',
      { picked_up_at: expect.any(String) }
    );
    expect(sendOrderPickedUpEmail).toHaveBeenCalledWith('ord-1', { showPickupTime: true });
  });

  it('allows an early pickup (agreed with the customer)', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({
      id: 'ord-1',
      status: 'pickup_scheduled',
      scheduled_date: '2099-01-01',
    });

    const result = await markOrderPickedUpAction('ord-1');

    expect(result).toEqual({ success: true });
  });

  it('rejects an order that is not pickup_scheduled', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({
      id: 'ord-1',
      status: 'in_cleaning',
      scheduled_date: '2026-10-16',
    });

    const result = await markOrderPickedUpAction('ord-1');

    expect(result).toEqual({ success: false, error: 'Ordren er allerede hentet' });
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
    expect(sendOrderPickedUpEmail).not.toHaveBeenCalled();
  });

  it("rejects another cleaner's order", async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue(null);

    const result = await markOrderPickedUpAction('ord-1');

    expect(result.success).toBe(false);
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
    expect(sendOrderPickedUpEmail).not.toHaveBeenCalled();
  });

  it('reports a lost race (guard returned null)', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({
      id: 'ord-1',
      status: 'pickup_scheduled',
      scheduled_date: '2026-10-16',
    });
    m(updateOrderStatusGuarded).mockResolvedValue(null);

    const result = await markOrderPickedUpAction('ord-1');

    expect(result.success).toBe(false);
    expect(sendOrderPickedUpEmail).not.toHaveBeenCalled();
  });

  it('rejects when not logged in', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const result = await markOrderPickedUpAction('ord-1');

    expect(result).toEqual({ success: false, error: 'Ikke autentisert' });
  });
});

describe('markOrderDeliveredAction', () => {
  it('completes a ready order from ready_for_delivery', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({ id: 'ord-1', status: 'ready_for_delivery' });

    const result = await markOrderDeliveredAction('ord-1');

    expect(result).toEqual({ success: true });
    expect(completeDeliveredOrder).toHaveBeenCalledWith('ord-1', 'ready_for_delivery');
  });

  it('rejects an order that is not ready yet', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({ id: 'ord-1', status: 'in_cleaning' });

    const result = await markOrderDeliveredAction('ord-1');

    expect(result.success).toBe(false);
    expect(completeDeliveredOrder).not.toHaveBeenCalled();
  });

  it("rejects another cleaner's order", async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue(null);

    const result = await markOrderDeliveredAction('ord-1');

    expect(result.success).toBe(false);
    expect(completeDeliveredOrder).not.toHaveBeenCalled();
  });

  it('passes through a completion failure', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({ id: 'ord-1', status: 'ready_for_delivery' });
    m(completeDeliveredOrder).mockResolvedValue({
      success: false,
      error: 'Ordren kan ikke fullføres nå — last siden på nytt',
    });

    const result = await markOrderDeliveredAction('ord-1');

    expect(result).toEqual({
      success: false,
      error: 'Ordren kan ikke fullføres nå — last siden på nytt',
    });
  });
});

describe('markOrderReadyForDelivery', () => {
  const PRICED_ORDER = {
    id: 'ord-1',
    order_number: 'NC-1001',
    status: 'in_cleaning',
    wash_loads: 2,
    total_cost_ore: 50000,
  };

  beforeEach(() => {
    m(getOrderByIdAndCleanerId).mockResolvedValue(PRICED_ORDER);
    m(createChargeForCompletedOrder).mockResolvedValue('pay-1');
  });

  it('moves the order to ready_for_delivery and charges the locked price', async () => {
    const result = await markOrderReadyForDelivery('ord-1');

    expect(result).toEqual({ success: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith('ord-1', 'in_cleaning', 'ready_for_delivery');
    expect(createChargeForCompletedOrder).toHaveBeenCalledWith('ord-1', 50000, 'NooraCare vask #NC-1001');
    expect(sendPriceReceiptEmail).toHaveBeenCalledWith('ord-1', 'pay-1');
  });

  it('reports chargeFailed when the Vipps charge throws, keeping the transition', async () => {
    m(createChargeForCompletedOrder).mockRejectedValue(new Error('Vipps create charge failed (500): boom'));

    const result = await markOrderReadyForDelivery('ord-1');

    expect(result).toEqual({ success: true, chargeFailed: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith('ord-1', 'in_cleaning', 'ready_for_delivery');
  });

  it('skips the charge for a 0-total order', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({ ...PRICED_ORDER, total_cost_ore: 0 });

    const result = await markOrderReadyForDelivery('ord-1');

    expect(result).toEqual({ success: true });
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });

  it('holds the charge and alerts the admins when the price is far above the estimate', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({
      ...PRICED_ORDER,
      wash_loads: 15,
      total_cost_ore: 460730,
      promo: null,
      pricing_notes: null,
      customer_estimate: {
        bags: 1,
        bedding_sets: 0,
        iron_everyday_items: 0,
        iron_formal_items: 0,
        iron_bedding: false,
        estimated_total_ore: 50000,
      },
    });

    const result = await markOrderReadyForDelivery('ord-1');

    expect(result).toEqual({ success: true, chargeHeld: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith('ord-1', 'in_cleaning', 'ready_for_delivery');
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
    expect(sendPriceReceiptEmail).not.toHaveBeenCalled();
    expect(sendToAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'price-review/ord-1' })
    );
  });

  it('rejects an order that is not in_cleaning without charging', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({ ...PRICED_ORDER, status: 'ready_for_delivery' });

    const result = await markOrderReadyForDelivery('ord-1');

    expect(result.success).toBe(false);
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });
});

describe('saveLaundryDetails', () => {
  beforeEach(() => {
    m(updateOrderLaundryDetails).mockResolvedValue({ data: { id: 'ord-1' }, error: null });
  });

  it('stamps the cleaner payout next to the price', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({ id: 'ord-1', status: 'in_cleaning', promo: null });

    const result = await saveLaundryDetails('ord-1', { wash_loads: 3, ironing_details: null });

    expect(result.success).toBe(true);
    // 3 × 29900 + 10400 + 1830 = 101930; 70 % = 71351
    expect(updateOrderLaundryDetails).toHaveBeenCalledWith(
      'ord-1',
      'cl-1',
      expect.objectContaining({
        wash_loads: 3,
        total_cost_ore: 101930,
        cleaner_payout_ore: 71351,
        promo: null,
      })
    );
  });

  it('keeps the payout on the full price when a promo reduces the charge', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({
      id: 'ord-1',
      status: 'in_cleaning',
      promo: {
        promo_code_id: 'pc-1',
        code: 'HALV',
        discount_type: 'percentage',
        discount_value: 50,
        max_discount_ore: null,
      },
    });

    const result = await saveLaundryDetails('ord-1', { wash_loads: 3, ironing_details: null });

    expect(result.success).toBe(true);
    expect(updateOrderLaundryDetails).toHaveBeenCalledWith(
      'ord-1',
      'cl-1',
      expect.objectContaining({
        total_cost_ore: 50965,
        cleaner_payout_ore: 71351,
        promo: expect.objectContaining({ code: 'HALV', discount_ore: 50965 }),
      })
    );
  });

  it('refuses once the order is no longer in_cleaning', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({ id: 'ord-1', status: 'ready_for_delivery', promo: null });

    const result = await saveLaundryDetails('ord-1', { wash_loads: 3, ironing_details: null });

    expect(result.success).toBe(false);
    expect(updateOrderLaundryDetails).not.toHaveBeenCalled();
  });

  it.each([
    ['more loads than the per-order maximum', MAX_WASH_LOADS_PER_ORDER + 1],
    ['a fractional load count', 2.5],
    ['NaN', Number.NaN],
  ])('rejects %s without saving a price', async (_label, washLoads) => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({ id: 'ord-1', status: 'in_cleaning', promo: null });

    const result = await saveLaundryDetails('ord-1', { wash_loads: washLoads, ironing_details: null });

    expect(result.success).toBe(false);
    expect(updateOrderLaundryDetails).not.toHaveBeenCalled();
  });

  it('accepts exactly the per-order maximum', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({ id: 'ord-1', status: 'in_cleaning', promo: null });

    const result = await saveLaundryDetails('ord-1', {
      wash_loads: MAX_WASH_LOADS_PER_ORDER,
      ironing_details: null,
    });

    expect(result.success).toBe(true);
  });
});

describe('declineCleanerOrder', () => {
  // Far-future pickup so the "past pickup date" rule never depends on today's date.
  const DECLINED = {
    id: 'ord-1',
    city: 'Bergen',
    scheduled_date: '2099-01-05',
    declined_by_cleaner_ids: ['cl-0', 'cl-1'],
  };

  beforeEach(() => {
    m(getCleanerByUserId).mockResolvedValue({ id: 'cl-1', display_name: 'Ola Rens' });
    m(getOrderById).mockResolvedValue({ id: 'ord-1', status: 'pickup_scheduled' });
    m(declineOrder).mockResolvedValue(DECLINED);
    m(findAvailableCleaner).mockResolvedValue({ id: 'cl-2', display_name: 'Per Rens' });
    m(assignCleanerToPendingOrder).mockResolvedValue({ id: 'ord-1', cleaner_id: 'cl-2' });
  });

  it('hands the order to the next cleaner, excluding everyone who declined, and e-mails that cleaner', async () => {
    const result = await declineCleanerOrder('ord-1');

    expect(result).toEqual({ success: true });
    expect(declineOrder).toHaveBeenCalledWith('ord-1', 'cl-1');
    expect(findAvailableCleaner).toHaveBeenCalledWith('Bergen', new Date('2099-01-05'), ['cl-0', 'cl-1']);
    expect(assignCleanerToPendingOrder).toHaveBeenCalledWith('ord-1', 'cl-2');
    expect(sendCleanerNewOrderEmail).toHaveBeenCalledWith('ord-1');
    expect(sendAdminOrderUnassignedEmail).not.toHaveBeenCalled();
  });

  it('leaves the order pending and alerts the admins when no other cleaner is available', async () => {
    m(findAvailableCleaner).mockResolvedValue(null);

    const result = await declineCleanerOrder('ord-1');

    expect(result).toEqual({ success: true });
    expect(assignCleanerToPendingOrder).not.toHaveBeenCalled();
    expect(sendCleanerNewOrderEmail).not.toHaveBeenCalled();
    expect(sendAdminOrderUnassignedEmail).toHaveBeenCalledWith('ord-1', 'Ola Rens');
  });

  it('does not look for a cleaner when the pickup date is already past', async () => {
    m(declineOrder).mockResolvedValue({ ...DECLINED, scheduled_date: '2000-01-01' });

    const result = await declineCleanerOrder('ord-1');

    expect(result).toEqual({ success: true });
    expect(findAvailableCleaner).not.toHaveBeenCalled();
    expect(sendAdminOrderUnassignedEmail).toHaveBeenCalledWith('ord-1', 'Ola Rens');
  });

  it('sends no «Nytt oppdrag» when the guarded re-assignment matched no row', async () => {
    m(assignCleanerToPendingOrder).mockResolvedValue(null);

    const result = await declineCleanerOrder('ord-1');

    expect(result).toEqual({ success: true });
    expect(sendCleanerNewOrderEmail).not.toHaveBeenCalled();
    expect(sendAdminOrderUnassignedEmail).toHaveBeenCalledWith('ord-1', 'Ola Rens');
  });

  it('still succeeds and alerts the admins when the matching throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    m(findAvailableCleaner).mockRejectedValue(new Error('db down'));

    const result = await declineCleanerOrder('ord-1');

    expect(result).toEqual({ success: true });
    expect(sendAdminOrderUnassignedEmail).toHaveBeenCalledWith('ord-1', 'Ola Rens');
    consoleError.mockRestore();
  });

  it('rejects an order that is no longer pickup_scheduled', async () => {
    m(getOrderById).mockResolvedValue({ id: 'ord-1', status: 'in_cleaning' });

    const result = await declineCleanerOrder('ord-1');

    expect(result).toEqual({ success: false, error: 'Du kan bare avslå oppdraget før det er startet' });
    expect(declineOrder).not.toHaveBeenCalled();
  });

  it('reports a failed decline and sends nothing', async () => {
    m(declineOrder).mockResolvedValue(null);

    const result = await declineCleanerOrder('ord-1');

    expect(result).toEqual({ success: false, error: 'Kunne ikke avslå oppdraget' });
    expect(findAvailableCleaner).not.toHaveBeenCalled();
    expect(sendCleanerNewOrderEmail).not.toHaveBeenCalled();
    expect(sendAdminOrderUnassignedEmail).not.toHaveBeenCalled();
  });
});
