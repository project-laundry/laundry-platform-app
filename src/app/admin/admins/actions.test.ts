import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ assertRole: vi.fn() }));
vi.mock('@/lib/services/staff-accounts', () => ({
  createStaffAccount: vi.fn(),
  setStaffAccountActive: vi.fn(),
}));
vi.mock('@/lib/database/users', () => ({
  updateUserContact: vi.fn(),
  getUserByIdAsAdmin: vi.fn(),
}));

import { assertRole } from '@/lib/auth/require-role';
import { setStaffAccountActive } from '@/lib/services/staff-accounts';
import { getUserByIdAsAdmin } from '@/lib/database/users';
import { setAdminActiveAction } from './actions';

const m = (fn: unknown) => fn as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  m(assertRole).mockResolvedValue({ auth: { authUserId: 'u-1' }, error: null });
  m(getUserByIdAsAdmin).mockResolvedValue({ id: 'u-2', role: 'admin' });
  m(setStaffAccountActive).mockResolvedValue({ error: null });
});

describe('setAdminActiveAction', () => {
  it('rejects when the caller is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await setAdminActiveAction('u-2', false);

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(getUserByIdAsAdmin).not.toHaveBeenCalled();
    expect(setStaffAccountActive).not.toHaveBeenCalled();
  });

  it('refuses to deactivate your own account', async () => {
    const result = await setAdminActiveAction('u-1', false);

    expect(result).toEqual({ success: false, error: 'Du kan ikke deaktivere din egen konto' });
    expect(setStaffAccountActive).not.toHaveBeenCalled();
  });

  it('fails for an unknown user', async () => {
    m(getUserByIdAsAdmin).mockResolvedValue(null);

    const result = await setAdminActiveAction('u-9', false);

    expect(result).toEqual({ success: false, error: 'Brukeren ble ikke funnet' });
    expect(setStaffAccountActive).not.toHaveBeenCalled();
  });

  it('fails for a target that is not an admin', async () => {
    m(getUserByIdAsAdmin).mockResolvedValue({ id: 'u-2', role: 'customer' });

    const result = await setAdminActiveAction('u-2', false);

    expect(result).toEqual({ success: false, error: 'Brukeren ble ikke funnet' });
    expect(setStaffAccountActive).not.toHaveBeenCalled();
  });

  it('deactivates another admin', async () => {
    const result = await setAdminActiveAction('u-2', false);

    expect(result).toEqual({ success: true });
    expect(setStaffAccountActive).toHaveBeenCalledWith('u-2', false);
  });

  it('returns the service error', async () => {
    m(setStaffAccountActive).mockResolvedValue({ error: 'Kunne ikke deaktivere kontoen' });

    const result = await setAdminActiveAction('u-2', false);

    expect(result).toEqual({ success: false, error: 'Kunne ikke deaktivere kontoen' });
  });

  it('lets you reactivate your own id through to the service', async () => {
    m(getUserByIdAsAdmin).mockResolvedValue({ id: 'u-1', role: 'admin' });

    const result = await setAdminActiveAction('u-1', true);

    expect(result).toEqual({ success: true });
    expect(setStaffAccountActive).toHaveBeenCalledWith('u-1', true);
  });
});
