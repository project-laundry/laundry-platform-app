import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { getOrderByPaymentAgreementId } from './orders';

const m = (fn: unknown) => fn as Mock;

describe('getOrderByPaymentAgreementId', () => {
  // from('orders').select('*').eq('payment_agreement_id', id).order('created_at', {...}).limit(1).maybeSingle()
  const maybeSingle = vi.fn();
  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));

  beforeEach(() => {
    vi.clearAllMocks();
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ select })) });
  });

  it('returns the earliest order carrying the payment agreement id', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'ord-1', order_number: 'ABC123' }, error: null });

    const result = await getOrderByPaymentAgreementId('pa-1');

    expect(result).toEqual({ id: 'ord-1', order_number: 'ABC123' });
    expect(eq).toHaveBeenCalledWith('payment_agreement_id', 'pa-1');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(limit).toHaveBeenCalledWith(1);
  });

  it('returns null when the agreement has no order yet', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(getOrderByPaymentAgreementId('pa-1')).resolves.toBeNull();
  });

  it('throws on a query error so callers never act blind', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(getOrderByPaymentAgreementId('pa-1')).rejects.toThrow('Failed to look up orders for payment agreement pa-1');
  });
});
