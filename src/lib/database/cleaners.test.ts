import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { selectCleanerWithLeastWorkload } from './cleaners';
import type { Cleaner } from '@/types/database';

const m = (fn: unknown) => fn as Mock;

const cleaner = (id: string) => ({ id, display_name: id }) as unknown as Cleaner;

describe('selectCleanerWithLeastWorkload', () => {
  const statusIn = vi.fn();
  const cleanerIn = vi.fn(() => ({ in: statusIn }));
  const select = vi.fn(() => ({ in: cleanerIn }));

  beforeEach(() => {
    vi.clearAllMocks();
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ select })) });
  });

  it('returns the only candidate without querying', async () => {
    const result = await selectCleanerWithLeastWorkload([cleaner('a')]);

    expect(result.id).toBe('a');
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('counts non-terminal orders on the real cleaner_id column', async () => {
    statusIn.mockResolvedValue({
      data: [{ cleaner_id: 'a' }, { cleaner_id: 'a' }, { cleaner_id: 'b' }],
      error: null,
    });

    const result = await selectCleanerWithLeastWorkload([cleaner('a'), cleaner('b')]);

    expect(select).toHaveBeenCalledWith('cleaner_id');
    expect(cleanerIn).toHaveBeenCalledWith('cleaner_id', ['a', 'b']);
    expect(statusIn).toHaveBeenCalledWith('status', [
      'pickup_scheduled',
      'picked_up',
      'in_cleaning',
      'ready_for_delivery',
      'out_for_delivery',
    ]);
    expect(result.id).toBe('b');
  });

  it('falls back to one of the candidates when the query errors', async () => {
    statusIn.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const result = await selectCleanerWithLeastWorkload([cleaner('a'), cleaner('b')]);

    expect(['a', 'b']).toContain(result.id);
  });
});
