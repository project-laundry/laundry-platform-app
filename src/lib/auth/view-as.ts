// The admin «Se som» view: an admin looks at the customer or cleaner pages as
// that person. A cookie names the person; it is honoured ONLY when the real
// signed-in user is an active admin. Pages resolve the *viewer* through this
// file; server actions never do — they keep using the real session
// (require-role.ts), which is what makes the view read-only.

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthenticatedDbUser } from '@/lib/auth/require-role';
import { getUserByIdAsAdmin } from '@/lib/database/users';
import { getCustomerByUserId, getCustomerByUserIdAsAdmin } from '@/lib/database/customers';
import type { Customer, User, UserRole } from '@/types/database';

export const VIEW_AS_COOKIE = 'nc_view_as';
export const VIEW_AS_MAX_AGE_SECONDS = 60 * 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only these roles can be viewed — never an admin or a driver. */
export function isViewableRole(role: UserRole): boolean {
  return role === 'customer' || role === 'cleaner';
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export interface Viewer {
  /** The user whose pages are rendered. */
  userId: string;
  dbUser: User;
  /** True when an admin is looking at someone else's pages. */
  viewAs: boolean;
}

/**
 * Who the customer/cleaner pages render for: the signed-in user, or — for an
 * admin with a valid «Se som» cookie — the person named in it. Null when
 * signed out. Cached per request (the banner and the page both call it).
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const auth = await getAuthenticatedDbUser();
  if (!auth) return null;

  const own: Viewer = { userId: auth.authUserId, dbUser: auth.dbUser, viewAs: false };
  if (auth.dbUser.role !== 'admin') return own;

  const targetId = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!targetId || !isUuid(targetId)) return own;

  const target = await getUserByIdAsAdmin(targetId);
  if (!target || !isViewableRole(target.role)) return own;

  return { userId: target.id, dbUser: target, viewAs: true };
});

/**
 * Page guard, the view-aware twin of requireRole: login when signed out,
 * /dashboard when the viewer's role doesn't match.
 */
export async function requireViewer(roles: UserRole[]): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect('/auth/login');
  }
  if (!roles.includes(viewer.dbUser.role)) {
    redirect('/dashboard');
  }
  return viewer;
}

/** The viewer's customer row (admin client in view mode, session client otherwise). */
export async function getViewerCustomer(viewer: Viewer): Promise<Customer | null> {
  return viewer.viewAs
    ? getCustomerByUserIdAsAdmin(viewer.userId)
    : getCustomerByUserId(viewer.userId);
}
