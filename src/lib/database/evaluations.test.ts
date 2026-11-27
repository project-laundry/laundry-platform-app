import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { getCleanerRating } from './evaluations';

const m = (fn: unknown) => fn as Mock;

describe('getCleanerRating', () => {
  const eq = vi.fn();
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  beforeEach(() => {
    vi.clearAllMocks();
    m(createAdminClient).mockReturnValue({ from });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reads only the evaluations of that cleaner\'s orders', async () => {
    eq.mockResolvedValue({
      data: [{ answers: { satisfaction: 5 } }, { answers: { satisfaction: 4 } }, { answers: { satisfaction: 3 } }],
      error: null,
    });

    const rating = await getCleanerRating('cleaner-1');

    expect(from).toHaveBeenCalledWith('order_evaluations');
    expect(select).toHaveBeenCalledWith('answers, orders!inner(cleaner_id)');
    expect(eq).toHaveBeenCalledWith('orders.cleaner_id', 'cleaner-1');
    expect(rating).toEqual({ average: 4, count: 3 });
  });

  it('answers an empty rating when the cleaner has no evaluations', async () => {
    eq.mockResolvedValue({ data: [], error: null });

    expect(await getCleanerRating('cleaner-1')).toEqual({ average: null, count: 0 });
  });

  it('answers null when the read fails', async () => {
    eq.mockResolvedValue({ data: null, error: { message: 'boom' } });

    expect(await getCleanerRating('cleaner-1')).toBeNull();
  });
});
