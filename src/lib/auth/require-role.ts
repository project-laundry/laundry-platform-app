// Role guards used by pages (redirect) and server actions (error result).
// users.role is read with the SESSION client — the RLS policy
// "users can read own record" allows exactly this.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUsersById } from '@/lib/database/users';
import type { User, UserRole } from '@/types/database';

export interface AuthenticatedUser {
  authUserId: string;
  dbUser: User;
}

/** The signed-in user's DB record, or null when signed out / record missing. */
export async function getAuthenticatedDbUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await getUsersById(user.id);
  if (!dbUser) return null;

  return { authUserId: user.id, dbUser };
}

/**
 * Page guard: redirects to login when signed out, to /dashboard when the role
 * doesn't match. Use in server components/layouts only (redirect() throws).
 */
export async function requireRole(roles: UserRole[]): Promise<AuthenticatedUser> {
  const auth = await getAuthenticatedDbUser();
  if (!auth) {
    redirect('/auth/login');
  }
  if (!roles.includes(auth.dbUser.role)) {
    redirect('/dashboard');
  }
  return auth;
}

/**
 * Server-action guard: never redirects — returns a Norwegian error string the
 * action can pass straight back to the UI.
 */
export async function assertRole(
  roles: UserRole[]
): Promise<{ auth: AuthenticatedUser | null; error: string | null }> {
  const auth = await getAuthenticatedDbUser();
  if (!auth) {
    return { auth: null, error: 'Ikke autentisert' };
  }
  if (!roles.includes(auth.dbUser.role)) {
    return { auth: null, error: 'Ingen tilgang' };
  }
  return { auth, error: null };
}
