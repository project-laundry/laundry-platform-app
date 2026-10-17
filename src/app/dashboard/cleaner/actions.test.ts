import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/database/cleaners', () => ({ getCleanerByUserId: vi.fn() }));
vi.mock('@/lib/database/orders', () => ({
  getOrderById: vi.fn(),
  declineOrder: vi.fn(),
  updateOrderLaundryDetails: vi.fn(),
  updateOrderStatusGuarded: vi.fn(),
  getOrderByIdAndCleanerId: vi.fn(),
}));
vi.mock('@/lib/payments/vipps/service', () => ({ createChargeForCompletedOrder: vi.fn() }));
vi.mock('@/lib/services/complete-order', () => ({ completeDeliveredOrder: vi.fn() }));

import { getCleanerByUserId } from '@/lib/database/cleaners';
import { getOrderByIdAndCleanerId, updateOrderStatusGuarded } from '@/lib/database/orders';
import { completeDeliveredOrder } from '@/lib/services/complete-order';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';
import {
  markOrderPickedUpAction,
  markOrderDeliveredAction,
  markOrderReadyForDelivery,
} from './actions';

const m = (fn: unknown) => fn as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  m(getCleanerByUserId).mockResolvedValue({ id: 'cl-1' });
  m(updateOrderStatusGuarded).mockResolvedValue({ id: 'ord-1' });
  m(completeDeliveredOrder).mockResolvedValue({ success: true });
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
  });

  it("rejects another cleaner's order", async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue(null);

    const result = await markOrderPickedUpAction('ord-1');

    expect(result.success).toBe(false);
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
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

  it('rejects an order that is not in_cleaning without charging', async () => {
    m(getOrderByIdAndCleanerId).mockResolvedValue({ ...PRICED_ORDER, status: 'ready_for_delivery' });

    const result = await markOrderReadyForDelivery('ord-1');

    expect(result.success).toBe(false);
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });
});
