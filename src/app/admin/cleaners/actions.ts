'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import { setCleanerVerificationStatus, updateCleanerProfile } from '@/lib/database/cleaners';

export interface CleanerActivationResult {
  success: boolean;
  error?: string;
}

/**
 * Activate (approve) or deactivate (suspend) a cleaner. Approving covers
 * both new 'pending' applications and re-activating a suspended cleaner.
 */
export async function setCleanerActivationAction(
  cleanerId: string,
  activate: boolean
): Promise<CleanerActivationResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const updated = await setCleanerVerificationStatus(
    cleanerId,
    activate ? 'approved' : 'suspended'
  );

  if (!updated) {
    return { success: false, error: 'Kunne ikke oppdatere renseren' };
  }

  revalidatePath('/admin/cleaners');
  return { success: true };
}

/**
 * Admin fallback for a cleaner who cannot reach their settings page: pause
 * (is_accepting_orders = false) or resume (true) new assignments. Only
 * matching reads this flag, so already-assigned orders are unaffected.
 */
export async function setCleanerAcceptingOrdersAction(
  cleanerId: string,
  accepting: boolean
): Promise<CleanerActivationResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const updated = await updateCleanerProfile(cleanerId, {
    is_accepting_orders: accepting === true,
  });

  if (!updated) {
    return { success: false, error: 'Kunne ikke oppdatere renseren' };
  }

  revalidatePath('/admin/cleaners');
  return { success: true };
}
