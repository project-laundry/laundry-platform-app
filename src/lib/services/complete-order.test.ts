import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/orders', () => ({ updateOrderStatusGuarded: vi.fn() }));
vi.mock('@/lib/services/order-generation', () => ({ checkAndGenerateNextOrders: vi.fn() }));
vi.mock('@/lib/payments/vipps/service', () => ({
  stopVippsAgreementForCancelledSubscription: vi.fn(),
  stopVippsAgreementForOneTimeOrder: vi.fn(),
}));
vi.mock('@/lib/services/customer-emails', () => ({ sendOrderDeliveredEmail: vi.fn() }));

import { updateOrderStatusGuarded } from '@/lib/database/orders';
import { checkAndGenerateNextOrders } from '@/lib/services/order-generation';
import {
  stopVippsAgreementForCancelledSubscription,
  stopVippsAgreementForOneTimeOrder,
} from '@/lib/payments/vipps/service';
import { sendOrderDeliveredEmail } from '@/lib/services/customer-emails';
import { completeDeliveredOrder } from './complete-order';

const m = (fn: unknown) => fn as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  m(updateOrderStatusGuarded).mockResolvedValue({ id: 'ord-1', subscription_id: 'sub-1' });
  m(checkAndGenerateNextOrders).mockResolvedValue(undefined);
  m(stopVippsAgreementForCancelledSubscription).mockResolvedValue(undefined);
  m(stopVippsAgreementForOneTimeOrder).mockResolvedValue(undefined);
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
    expect(stopVippsAgreementForOneTimeOrder).not.toHaveBeenCalled();
  });

  it('skips subscription side effects for one-time orders and runs the one-time agreement stop instead', async () => {
    m(updateOrderStatusGuarded).mockResolvedValue({ id: 'ord-1', subscription_id: null });

    await completeDeliveredOrder('ord-1', 'ready_for_delivery');

    expect(checkAndGenerateNextOrders).not.toHaveBeenCalled();
    expect(stopVippsAgreementForCancelledSubscription).not.toHaveBeenCalled();
    expect(stopVippsAgreementForOneTimeOrder).toHaveBeenCalledTimes(1);
    expect(stopVippsAgreementForOneTimeOrder).toHaveBeenCalledWith('ord-1');
    expect(sendOrderDeliveredEmail).toHaveBeenCalledWith('ord-1');
    expect(m(sendOrderDeliveredEmail).mock.invocationCallOrder[0]).toBeGreaterThan(
      m(stopVippsAgreementForOneTimeOrder).mock.invocationCallOrder[0]
    );
  });

  it('fails without side effects when the guard does not match', async () => {
    m(updateOrderStatusGuarded).mockResolvedValue(null);

    const result = await completeDeliveredOrder('ord-1', 'ready_for_delivery');

    expect(result.success).toBe(false);
    expect(checkAndGenerateNextOrders).not.toHaveBeenCalled();
    expect(stopVippsAgreementForOneTimeOrder).not.toHaveBeenCalled();
    expect(sendOrderDeliveredEmail).not.toHaveBeenCalled();
  });

  it('sends the delivered e-mail last, after the agreement-stop check', async () => {
    const result = await completeDeliveredOrder('ord-1', 'ready_for_delivery');

    expect(result).toEqual({ success: true });
    expect(sendOrderDeliveredEmail).toHaveBeenCalledTimes(1);
    expect(sendOrderDeliveredEmail).toHaveBeenCalledWith('ord-1');
    expect(m(sendOrderDeliveredEmail).mock.invocationCallOrder[0]).toBeGreaterThan(
      m(stopVippsAgreementForCancelledSubscription).mock.invocationCallOrder[0]
    );
    expect(m(sendOrderDeliveredEmail).mock.invocationCallOrder[0]).toBeGreaterThan(
      m(checkAndGenerateNextOrders).mock.invocationCallOrder[0]
    );
  });

  it('sends the delivered e-mail for the dormant driver flow too', async () => {
    await completeDeliveredOrder('ord-1');

    expect(sendOrderDeliveredEmail).toHaveBeenCalledWith('ord-1');
  });
});
