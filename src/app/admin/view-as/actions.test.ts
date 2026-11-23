import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({
  assertRole: vi.fn(),
  getAuthenticatedDbUser: vi.fn(),
}));
vi.mock('@/lib/database/users', () => ({ getUserByIdAsAdmin: vi.fn() }));
vi.mock('@/lib/database/customers', () => ({
  getCustomerByUserId: vi.fn(),
  getCustomerByUserIdAsAdmin: vi.fn(),
}));
vi.mock('@/lib/database/cleaners', () => ({ getCleanerByUserId: vi.fn() }));

import { redirect } from 'next/navigation';
import { assertRole } from '@/lib/auth/require-role';
import { getUserByIdAsAdmin } from '@/lib/database/users';
import { getCustomerByUserIdAsAdmin } from '@/lib/database/customers';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { startViewAsAction, stopViewAsAction } from './actions';

const m = (fn: unknown) => fn as Mock;
const TARGET_ID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.get.mockReturnValue(undefined);
  m(assertRole).mockResolvedValue({ auth: { authUserId: 'admin-1' }, error: null });
});

describe('startViewAsAction', () => {
  it('rejects a caller who is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    expect(await startViewAsAction(TARGET_ID)).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each(['admin', 'driver'])('refuses to view a %s', async (role) => {
    m(getUserByIdAsAdmin).mockResolvedValue({ id: TARGET_ID, role });

    expect(await startViewAsAction(TARGET_ID)).toEqual({
      success: false,
      error: 'Brukeren kan ikke vises',
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('refuses an id that is not a uuid without a lookup', async () => {
    expect((await startViewAsAction('abc')).success).toBe(false);
    expect(getUserByIdAsAdmin).not.toHaveBeenCalled();
  });

  it('sets the cookie and opens the customer dashboard', async () => {
    m(getUserByIdAsAdmin).mockResolvedValue({ id: TARGET_ID, role: 'customer' });

    await startViewAsAction(TARGET_ID);

    expect(cookieStore.set).toHaveBeenCalledWith(
      'nc_view_as',
      TARGET_ID,
      expect.objectContaining({ httpOnly: true, path: '/', maxAge: 3600 })
    );
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('opens the cleaner dashboard for a cleaner', async () => {
    m(getUserByIdAsAdmin).mockResolvedValue({ id: TARGET_ID, role: 'cleaner' });

    await startViewAsAction(TARGET_ID);

    expect(redirect).toHaveBeenCalledWith('/dashboard/cleaner');
  });
});

describe('stopViewAsAction', () => {
  it('clears the cookie and returns to the customer admin page', async () => {
    cookieStore.get.mockReturnValue({ value: TARGET_ID });
    m(getUserByIdAsAdmin).mockResolvedValue({ id: TARGET_ID, role: 'customer' });
    m(getCustomerByUserIdAsAdmin).mockResolvedValue({ id: 'cust-1' });

    await stopViewAsAction();

    expect(cookieStore.delete).toHaveBeenCalledWith('nc_view_as');
    expect(redirect).toHaveBeenCalledWith('/admin/customers/cust-1');
  });

  it('returns to the cleaner admin page', async () => {
    cookieStore.get.mockReturnValue({ value: TARGET_ID });
    m(getUserByIdAsAdmin).mockResolvedValue({ id: TARGET_ID, role: 'cleaner' });
    m(getCleanerByUserId).mockResolvedValue({ id: 'cl-1' });

    await stopViewAsAction();

    expect(redirect).toHaveBeenCalledWith('/admin/cleaners/cl-1');
  });

  it('falls back to /admin without a cookie', async () => {
    await stopViewAsAction();

    expect(cookieStore.delete).toHaveBeenCalledWith('nc_view_as');
    expect(redirect).toHaveBeenCalledWith('/admin');
  });
});
