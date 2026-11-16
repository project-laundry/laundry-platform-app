import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/orders', () => ({ updateOrderStatusGuarded: vi.fn() }));
vi.mock('@/lib/services/order-generation', () => ({ checkAndGenerateNextOrders: vi.fn() }));
vi.mock('@/lib/payments/vipps/service', () => ({
  stopVippsAgreementForCancelledSubscription: vi.fn(),
}));

import { updateOrderStatusGuarded } from '@/lib/database/orders';
import { checkAndGenerateNextOrders } from '@/lib/services/order-generation';
import { stopVippsAgreementForCancelledSubscription } from '@/lib/payments/vipps/service';
import { completeDeliveredOrder } from './complete-order';

const m = (fn: unknown) => fn as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  m(updateOrderStatusGuarded).mockResolvedValue({ id: 'ord-1', subscription_id: 'sub-1' });
  m(checkAndGenerateNextOrders).mockResolvedValue(undefined);
  m(stopVippsAgreementForCancelledSubscription).mockResolvedValue(undefined);
});

describe('completeDeliveredOrder', () => {
  it('guards on out_for_delivery by default (driver flow)', async () => {
    const result = await completeDeliveredOrder('ord-1');

    expect(result).toEqual({ success: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith(
      'ord-1',
      'out_for_delivery',
      'completed',
      { delivery_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }
    );
  });

  it('guards on ready_for_delivery when the cleaner delivers', async () => {
    await completeDeliveredOrder('ord-1', 'ready_for_delivery');

    expect(updateOrderStatusGuarded).toHaveBeenCalledWith(
      'ord-1',
      'ready_for_delivery',
      'completed',
      { delivery_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }
    );
  });

  it('runs the rolling window and the agreement stop for subscription orders', async () => {
    await completeDeliveredOrder('ord-1', 'ready_for_delivery');

    expect(checkAndGenerateNextOrders).toHaveBeenCalledWith('sub-1');
    expect(stopVippsAgreementForCancelledSubscription).toHaveBeenCalledWith('sub-1');
  });

  it('skips subscription side effects for one-time orders', async () => {
    m(updateOrderStatusGuarded).mockResolvedValue({ id: 'ord-1', subscription_id: null });

    await completeDeliveredOrder('ord-1', 'ready_for_delivery');

    expect(checkAndGenerateNextOrders).not.toHaveBeenCalled();
    expect(stopVippsAgreementForCancelledSubscription).not.toHaveBeenCalled();
  });

  it('fails without side effects when the guard does not match', async () => {
    m(updateOrderStatusGuarded).mockResolvedValue(null);

    const result = await completeDeliveredOrder('ord-1', 'ready_for_delivery');

    expect(result.success).toBe(false);
    expect(checkAndGenerateNextOrders).not.toHaveBeenCalled();
  });
});
