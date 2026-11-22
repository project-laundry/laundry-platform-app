import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u-1' } } }) },
  }),
}));
vi.mock('@/lib/database/users', () => ({ getUsersById: vi.fn() }));

import { getUsersById } from '@/lib/database/users';
import { assertRole } from './require-role';

const m = (fn: unknown) => fn as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('assertRole and deactivated users', () => {
  it('returns an active admin', async () => {
    const dbUser = { id: 'u-1', role: 'admin', deleted_at: null };
    m(getUsersById).mockResolvedValue(dbUser);

    const result = await assertRole(['admin']);

    expect(result.error).toBeNull();
    expect(result.auth?.dbUser).toEqual(dbUser);
  });

  it('treats a deactivated admin as signed out', async () => {
    m(getUsersById).mockResolvedValue({
      id: 'u-1',
      role: 'admin',
      deleted_at: '2026-11-22T10:00:00Z',
    });

    const result = await assertRole(['admin']);

    expect(result).toEqual({ auth: null, error: 'Ikke autentisert' });
  });

  it('does not apply the deactivation check to other roles', async () => {
    m(getUsersById).mockResolvedValue({
      id: 'u-1',
      role: 'customer',
      deleted_at: '2026-11-22T10:00:00Z',
    });

    const result = await assertRole(['customer']);

    expect(result.error).toBeNull();
    expect(result.auth).not.toBeNull();
  });
});
