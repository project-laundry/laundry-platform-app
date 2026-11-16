import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { activateSubscriptionOnAgreementActivation } from './subscriptions';

const m = (fn: unknown) => fn as Mock;

describe('activateSubscriptionOnAgreementActivation', () => {
  // from('subscriptions').update({...}).eq('id', id).eq('status', 'pending_payment').select().maybeSingle()
  const maybeSingle = vi.fn();
  const select = vi.fn(() => ({ maybeSingle }));
  const eqStatus = vi.fn(() => ({ select }));
  const eqId = vi.fn(() => ({ eq: eqStatus }));
  const update = vi.fn(() => ({ eq: eqId }));

  beforeEach(() => {
    vi.clearAllMocks();
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ update })) });
  });

  it('only activates a subscription that is still pending_payment', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'sub-1', status: 'active' }, error: null });

    const result = await activateSubscriptionOnAgreementActivation('sub-1');

    expect(result).toEqual({ id: 'sub-1', status: 'active' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active', started_at: expect.any(String) }));
    expect(eqId).toHaveBeenCalledWith('id', 'sub-1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'pending_payment');
  });

  it('returns null when no pending_payment row matched (duplicate delivery — started_at is not moved)', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(activateSubscriptionOnAgreementActivation('sub-1')).resolves.toBeNull();
  });

  it('returns null on a query error', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(activateSubscriptionOnAgreementActivation('sub-1')).resolves.toBeNull();
  });
});
