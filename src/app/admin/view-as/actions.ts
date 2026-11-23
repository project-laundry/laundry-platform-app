'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { assertRole } from '@/lib/auth/require-role';
import {
  VIEW_AS_COOKIE,
  VIEW_AS_MAX_AGE_SECONDS,
  isUuid,
  isViewableRole,
} from '@/lib/auth/view-as';
import { getUserByIdAsAdmin } from '@/lib/database/users';
import { getCustomerByUserIdAsAdmin } from '@/lib/database/customers';
import { getCleanerByUserId } from '@/lib/database/cleaners';

/**
 * Start the «Se som» view of a customer or cleaner. Redirects to that
 * person's dashboard on success; returns an error otherwise.
 */
export async function startViewAsAction(
  userId: string
): Promise<{ success: false; error: string }> {
  const { auth, error: authError } = await assertRole(['admin']);
  if (authError || !auth) {
    return { success: false, error: authError || 'Ikke autentisert' };
  }

  const target = isUuid(userId) ? await getUserByIdAsAdmin(userId) : null;
  if (!target || !isViewableRole(target.role)) {
    return { success: false, error: 'Brukeren kan ikke vises' };
  }

  (await cookies()).set(VIEW_AS_COOKIE, target.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VIEW_AS_MAX_AGE_SECONDS,
  });
  console.info(`[view-as] admin ${auth.authUserId} views ${target.role} ${target.id}`);

  redirect(target.role === 'cleaner' ? '/dashboard/cleaner' : '/dashboard');
}

/** End the view and go back to the person's admin page (or /admin). */
export async function stopViewAsAction(): Promise<void> {
  const cookieStore = await cookies();
  const targetId = cookieStore.get(VIEW_AS_COOKIE)?.value;
  cookieStore.delete(VIEW_AS_COOKIE);

  let returnPath = '/admin';
  const { error: authError } = await assertRole(['admin']);
  if (!authError && targetId && isUuid(targetId)) {
    const target = await getUserByIdAsAdmin(targetId);
    if (target?.role === 'customer') {
      const customer = await getCustomerByUserIdAsAdmin(target.id);
      if (customer) returnPath = `/admin/customers/${customer.id}`;
    } else if (target?.role === 'cleaner') {
      const cleaner = await getCleanerByUserId(target.id);
      if (cleaner) returnPath = `/admin/cleaners/${cleaner.id}`;
    }
  }

  redirect(returnPath);
}
