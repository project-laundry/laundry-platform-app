import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ assertRole: vi.fn() }));
vi.mock('@/lib/database/cleaners', () => ({ setCleanerVerificationStatus: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import { setCleanerVerificationStatus } from '@/lib/database/cleaners';
import { setCleanerActivationAction } from './actions';

const m = (fn: unknown) => fn as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  m(assertRole).mockResolvedValue({ auth: { authUserId: 'admin-1' }, error: null });
  m(setCleanerVerificationStatus).mockResolvedValue({ id: 'cl-1' });
});

describe('setCleanerActivationAction', () => {
  it('rejects when the caller is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await setCleanerActivationAction('cl-1', true);

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(setCleanerVerificationStatus).not.toHaveBeenCalled();
  });

  it('approves on activate', async () => {
    const result = await setCleanerActivationAction('cl-1', true);

    expect(result).toEqual({ success: true });
    expect(setCleanerVerificationStatus).toHaveBeenCalledWith('cl-1', 'approved');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/cleaners');
  });

  it('suspends on deactivate', async () => {
    const result = await setCleanerActivationAction('cl-1', false);

    expect(result).toEqual({ success: true });
    expect(setCleanerVerificationStatus).toHaveBeenCalledWith('cl-1', 'suspended');
  });

  it('errors when the update fails', async () => {
    m(setCleanerVerificationStatus).mockResolvedValue(null);

    const result = await setCleanerActivationAction('cl-1', true);

    expect(result).toEqual({ success: false, error: 'Kunne ikke oppdatere renseren' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
