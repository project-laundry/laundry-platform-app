import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

const cookieGet = vi.fn();
vi.mock('next/headers', () => ({ cookies: async () => ({ get: cookieGet }) }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ getAuthenticatedDbUser: vi.fn() }));
vi.mock('@/lib/database/users', () => ({ getUserByIdAsAdmin: vi.fn() }));
vi.mock('@/lib/database/customers', () => ({
  getCustomerByUserId: vi.fn(),
  getCustomerByUserIdAsAdmin: vi.fn(),
}));

import { getAuthenticatedDbUser } from '@/lib/auth/require-role';
import { getUserByIdAsAdmin } from '@/lib/database/users';
import { getCustomerByUserId, getCustomerByUserIdAsAdmin } from '@/lib/database/customers';
import { getViewer, getViewerCustomer } from './view-as';

const m = (fn: unknown) => fn as Mock;

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '22222222-2222-4222-8222-222222222222';
const admin = { id: ADMIN_ID, role: 'admin', deleted_at: null };

beforeEach(() => {
  vi.clearAllMocks();
  cookieGet.mockReturnValue(undefined);
  m(getAuthenticatedDbUser).mockResolvedValue({ authUserId: ADMIN_ID, dbUser: admin });
});

describe('getViewer', () => {
  it('is null when signed out', async () => {
    m(getAuthenticatedDbUser).mockResolvedValue(null);
    expect(await getViewer()).toBeNull();
  });

  it('ignores the cookie for a non-admin', async () => {
    const customer = { id: 'u-1', role: 'customer' };
    m(getAuthenticatedDbUser).mockResolvedValue({ authUserId: 'u-1', dbUser: customer });
    cookieGet.mockReturnValue({ value: TARGET_ID });

    expect(await getViewer()).toEqual({ userId: 'u-1', dbUser: customer, viewAs: false });
    expect(getUserByIdAsAdmin).not.toHaveBeenCalled();
  });

  it('returns the admin when there is no cookie', async () => {
    expect(await getViewer()).toEqual({ userId: ADMIN_ID, dbUser: admin, viewAs: false });
  });

  it('returns the viewed customer for an admin with the cookie', async () => {
    const target = { id: TARGET_ID, role: 'customer' };
    cookieGet.mockReturnValue({ value: TARGET_ID });
    m(getUserByIdAsAdmin).mockResolvedValue(target);

    expect(await getViewer()).toEqual({ userId: TARGET_ID, dbUser: target, viewAs: true });
  });

  it('returns the viewed cleaner for an admin with the cookie', async () => {
    const target = { id: TARGET_ID, role: 'cleaner' };
    cookieGet.mockReturnValue({ value: TARGET_ID });
    m(getUserByIdAsAdmin).mockResolvedValue(target);

    expect((await getViewer())?.viewAs).toBe(true);
  });

  it.each(['admin', 'driver'])('never views a %s', async (role) => {
    cookieGet.mockReturnValue({ value: TARGET_ID });
    m(getUserByIdAsAdmin).mockResolvedValue({ id: TARGET_ID, role });

    expect(await getViewer()).toEqual({ userId: ADMIN_ID, dbUser: admin, viewAs: false });
  });

  it('ignores a cookie that is not a uuid', async () => {
    cookieGet.mockReturnValue({ value: 'not-a-uuid' });

    expect((await getViewer())?.viewAs).toBe(false);
    expect(getUserByIdAsAdmin).not.toHaveBeenCalled();
  });

  it('ignores a cookie naming an unknown user', async () => {
    cookieGet.mockReturnValue({ value: TARGET_ID });
    m(getUserByIdAsAdmin).mockResolvedValue(null);

    expect((await getViewer())?.viewAs).toBe(false);
  });
});

describe('getViewerCustomer', () => {
  it('uses the session client for the signed-in customer', async () => {
    await getViewerCustomer({ userId: 'u-1', dbUser: { role: 'customer' } as never, viewAs: false });
    expect(getCustomerByUserId).toHaveBeenCalledWith('u-1');
    expect(getCustomerByUserIdAsAdmin).not.toHaveBeenCalled();
  });

  it('uses the admin client in view mode', async () => {
    await getViewerCustomer({ userId: TARGET_ID, dbUser: { role: 'customer' } as never, viewAs: true });
    expect(getCustomerByUserIdAsAdmin).toHaveBeenCalledWith(TARGET_ID);
    expect(getCustomerByUserId).not.toHaveBeenCalled();
  });
});
