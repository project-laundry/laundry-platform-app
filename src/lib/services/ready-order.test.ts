import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/orders', () => ({ updateOrderStatusGuarded: vi.fn() }));
vi.mock('@/lib/payments/vipps/service', () => ({ createChargeForCompletedOrder: vi.fn() }));

import { updateOrderStatusGuarded } from '@/lib/database/orders';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';
import { markOrderReadyAndCharge, type ReadyOrderInput } from './ready-order';

const m = (fn: unknown) => fn as Mock;

const PRICED_ORDER: ReadyOrderInput = {
  id: 'ord-1',
  order_number: 'NC-1001',
  status: 'in_cleaning',
  wash_loads: 2,
  total_cost_ore: 50000,
};

beforeEach(() => {
  vi.clearAllMocks();
  m(updateOrderStatusGuarded).mockResolvedValue({ id: 'ord-1' });
  m(createChargeForCompletedOrder).mockResolvedValue('pay-1');
});

describe('markOrderReadyAndCharge', () => {
  it('moves the order to ready_for_delivery and charges the locked price', async () => {
    const result = await markOrderReadyAndCharge(PRICED_ORDER);

    expect(result).toEqual({ success: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith('ord-1', 'in_cleaning', 'ready_for_delivery');
    expect(createChargeForCompletedOrder).toHaveBeenCalledWith('ord-1', 50000, 'NooraCare vask #NC-1001');
  });

  it('reports chargeFailed when the Vipps charge throws, keeping the transition', async () => {
    m(createChargeForCompletedOrder).mockRejectedValue(new Error('Vipps create charge failed (500): boom'));

    const result = await markOrderReadyAndCharge(PRICED_ORDER);

    expect(result).toEqual({ success: true, chargeFailed: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledTimes(1);
  });

  it('skips the charge for a 0-total order', async () => {
    const result = await markOrderReadyAndCharge({ ...PRICED_ORDER, total_cost_ore: 0 });

    expect(result).toEqual({ success: true });
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });

  it('rejects an order that is not in_cleaning without writing or charging', async () => {
    const result = await markOrderReadyAndCharge({ ...PRICED_ORDER, status: 'ready_for_delivery' });

    expect(result.success).toBe(false);
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });

  it('rejects an order without wash details', async () => {
    const result = await markOrderReadyAndCharge({ ...PRICED_ORDER, wash_loads: 0 });

    expect(result).toEqual({
      success: false,
      error: 'Vaskdetaljer må registreres før ordren kan gjøres klar',
    });
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
  });

  it('rejects an unpriced order', async () => {
    const result = await markOrderReadyAndCharge({ ...PRICED_ORDER, total_cost_ore: null });

    expect(result).toEqual({ success: false, error: 'Pris må beregnes før ordren kan gjøres klar' });
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
  });

  it('fails when the guarded transition does not apply (concurrent change)', async () => {
    m(updateOrderStatusGuarded).mockResolvedValue(null);

    const result = await markOrderReadyAndCharge(PRICED_ORDER);

    expect(result).toEqual({ success: false, error: 'Kunne ikke oppdatere status' });
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });
});
