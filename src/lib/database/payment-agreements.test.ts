import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { activatePaymentAgreement } from './payment-agreements';

const m = (fn: unknown) => fn as Mock;

describe('activatePaymentAgreement', () => {
  // from('payment_agreements').update({...}).eq('id', id).eq('status', 'pending').select().maybeSingle()
  const maybeSingle = vi.fn();
  const select = vi.fn(() => ({ maybeSingle }));
  const eqStatus = vi.fn(() => ({ select }));
  const eqId = vi.fn(() => ({ eq: eqStatus }));
  const update = vi.fn(() => ({ eq: eqId }));

  beforeEach(() => {
    vi.clearAllMocks();
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ update })) });
  });

  it('only activates an agreement that is still pending', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'pa-1', status: 'active' }, error: null });

    const result = await activatePaymentAgreement('pa-1');

    expect(result).toEqual({ id: 'pa-1', status: 'active' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active', activated_at: expect.any(String) }));
    expect(eqId).toHaveBeenCalledWith('id', 'pa-1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'pending');
  });

  it('returns null when no pending row matched (already activated by another delivery)', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(activatePaymentAgreement('pa-1')).resolves.toBeNull();
  });

  it('returns null on a query error', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(activatePaymentAgreement('pa-1')).resolves.toBeNull();
  });
});
