import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { rejectCleaner, selectCleanerWithLeastWorkload, setCleanerVerificationStatus } from './cleaners';
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

describe('setCleanerVerificationStatus / rejectCleaner', () => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));

  beforeEach(() => {
    vi.clearAllMocks();
    single.mockResolvedValue({ data: { id: 'cl-1' }, error: null });
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ update })) });
  });

  it('approving clears suspension and rejection together', async () => {
    const result = await setCleanerVerificationStatus('cl-1', 'approved');

    expect(update).toHaveBeenCalledWith({
      verification_status: 'approved',
      approved_at: expect.any(String),
      suspended_at: null,
      rejected_at: null,
      rejection_reason: null,
    });
    expect(eq).toHaveBeenCalledWith('id', 'cl-1');
    expect(result).toEqual({ id: 'cl-1' });
  });

  it('suspending only stamps suspended_at', async () => {
    await setCleanerVerificationStatus('cl-1', 'suspended');

    expect(update).toHaveBeenCalledWith({
      verification_status: 'suspended',
      suspended_at: expect.any(String),
    });
  });

  it('rejecting stores the reason and rejected_at', async () => {
    const result = await rejectCleaner('cl-1', 'Dekker ikke området');

    expect(update).toHaveBeenCalledWith({
      verification_status: 'rejected',
      rejected_at: expect.any(String),
      rejection_reason: 'Dekker ikke området',
    });
    expect(eq).toHaveBeenCalledWith('id', 'cl-1');
    expect(result).toEqual({ id: 'cl-1' });
  });

  it('returns null when the update errors', async () => {
    single.mockResolvedValue({ data: null, error: { message: 'boom' } });

    expect(await rejectCleaner('cl-1', 'x')).toBeNull();
    expect(await setCleanerVerificationStatus('cl-1', 'approved')).toBeNull();
  });
});
