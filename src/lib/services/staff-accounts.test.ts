import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock the admin Supabase client (auth admin API + users/customers tables) ---
const createUser = vi.fn();
const deleteUser = vi.fn();
const usersUpdate = vi.fn();
const usersUpdateEq = vi.fn();
const usersDelete = vi.fn();
const usersDeleteEq = vi.fn();
const customersDeleteEq = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser, deleteUser } },
    from: (table: string) => {
      if (table === 'users') {
        return { update: usersUpdate, delete: usersDelete };
      }
      if (table === 'customers') {
        return { delete: () => ({ eq: customersDeleteEq }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { createStaffAccount, deleteStaffAccount } from './staff-accounts';

const INPUT = {
  full_name: 'Test Sjåfør',
  email: 'driver@test.no',
  phone: '99887766',
  password: 'hemmelig123',
  role: 'driver' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  createUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  deleteUser.mockResolvedValue({ data: null, error: null });
  usersUpdate.mockImplementation(() => ({ eq: usersUpdateEq }));
  usersUpdateEq.mockResolvedValue({ error: null });
  usersDelete.mockImplementation(() => ({ eq: usersDeleteEq }));
  usersDeleteEq.mockResolvedValue({ error: null });
  customersDeleteEq.mockResolvedValue({ error: null });
});

describe('createStaffAccount', () => {
  it('creates the auth user, flips the role, and removes the stray customer row', async () => {
    const result = await createStaffAccount(INPUT);

    expect(result).toEqual({ userId: 'user-1', error: null });
    expect(createUser).toHaveBeenCalledWith({
      email: 'driver@test.no',
      password: 'hemmelig123',
      email_confirm: true,
      user_metadata: { phone: '99887766', full_name: 'Test Sjåfør' },
    });
    expect(usersUpdate).toHaveBeenCalledWith({ role: 'driver' });
    expect(usersUpdateEq).toHaveBeenCalledWith('id', 'user-1');
    expect(customersDeleteEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('maps a duplicate-email auth error to a Norwegian message', async () => {
    createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'A user with this email address has already been registered' },
    });

    const result = await createStaffAccount(INPUT);

    expect(result).toEqual({ userId: null, error: 'E-postadressen er allerede registrert' });
    expect(usersUpdate).not.toHaveBeenCalled();
  });

  it('maps the trigger-level database error (duplicate phone) to a phone hint', async () => {
    createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Database error creating new user' },
    });

    const result = await createStaffAccount(INPUT);

    expect(result.userId).toBeNull();
    expect(result.error).toContain('telefonnummeret');
  });

  it('rolls back both the public.users row and the auth user when the role flip fails', async () => {
    usersUpdateEq.mockResolvedValue({ error: { message: 'boom' } });

    const result = await createStaffAccount(INPUT);

    expect(result.userId).toBeNull();
    expect(usersDeleteEq).toHaveBeenCalledWith('id', 'user-1');
    expect(deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('still succeeds when removing the stray customer row fails (non-fatal)', async () => {
    customersDeleteEq.mockResolvedValue({ error: { message: 'boom' } });

    const result = await createStaffAccount(INPUT);

    expect(result).toEqual({ userId: 'user-1', error: null });
  });
});

describe('deleteStaffAccount', () => {
  it('deletes the public.users row and the auth user', async () => {
    await deleteStaffAccount('user-9');

    expect(usersDeleteEq).toHaveBeenCalledWith('id', 'user-9');
    expect(deleteUser).toHaveBeenCalledWith('user-9');
  });
});
