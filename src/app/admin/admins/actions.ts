'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import { createStaffAccount, setStaffAccountActive } from '@/lib/services/staff-accounts';
import { updateUserContact, getUserByIdAsAdmin } from '@/lib/database/users';
import { validateNorwegianPhone } from '@/lib/validation/cleaner';

export interface AdminUserFormInput {
  full_name: string;
  email: string; // ignored on update
  phone: string;
  password: string; // ignored on update
}

export interface StaffActionResult {
  success: boolean;
  error?: string;
}

function validateContact(input: { full_name: string; phone: string }): string | null {
  if (input.full_name.trim().length < 2) return 'Navn må ha minst 2 tegn';
  if (!validateNorwegianPhone(input.phone)) return 'Ugyldig telefonnummer (8 sifre, evt. +47)';
  return null;
}

/**
 * Create a new admin user (users.role = 'admin'; no admins-table row —
 * nothing in the app reads that table).
 */
export async function createAdminAction(input: AdminUserFormInput): Promise<StaffActionResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const validationError = validateContact(input);
  if (validationError) return { success: false, error: validationError };
  if (!input.email.trim()) return { success: false, error: 'E-post er påkrevd' };
  if (input.password.length < 8) return { success: false, error: 'Passordet må ha minst 8 tegn' };

  const { error } = await createStaffAccount({
    full_name: input.full_name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    password: input.password,
    role: 'admin',
  });
  if (error) return { success: false, error };

  revalidatePath('/admin/admins');
  return { success: true };
}

/**
 * Update an admin user's contact info. Refuses to touch non-admin users —
 * this action must not become a generic rename-any-user endpoint.
 */
export async function updateAdminAction(
  userId: string,
  input: AdminUserFormInput
): Promise<StaffActionResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const target = await getUserByIdAsAdmin(userId);
  if (!target || target.role !== 'admin') {
    return { success: false, error: 'Brukeren ble ikke funnet' };
  }

  const validationError = validateContact(input);
  if (validationError) return { success: false, error: validationError };

  const { error } = await updateUserContact(userId, {
    full_name: input.full_name.trim(),
    phone: input.phone.trim(),
  });
  if (error) return { success: false, error };

  revalidatePath('/admin/admins');
  return { success: true };
}

/**
 * Deactivate or reactivate another administrator. A deactivated admin gets no
 * admin e-mails, is refused by the role guards and cannot sign in. Your own
 * account cannot be deactivated, so one active admin always remains.
 */
export async function setAdminActiveAction(userId: string, active: boolean): Promise<StaffActionResult> {
  const { auth, error: authError } = await assertRole(['admin']);
  if (authError || !auth) return { success: false, error: authError ?? 'Ikke autentisert' };

  if (!active && auth.authUserId === userId) {
    return { success: false, error: 'Du kan ikke deaktivere din egen konto' };
  }

  const target = await getUserByIdAsAdmin(userId);
  if (!target || target.role !== 'admin') {
    return { success: false, error: 'Brukeren ble ikke funnet' };
  }

  const { error } = await setStaffAccountActive(userId, active);
  if (error) return { success: false, error };

  revalidatePath('/admin/admins');
  revalidatePath(`/admin/admins/${userId}`);
  return { success: true };
}
