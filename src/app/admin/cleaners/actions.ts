'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import {
  rejectCleaner,
  setCleanerVerificationStatus,
  updateCleanerProfile,
} from '@/lib/database/cleaners';
import { CLEANER_REJECTION_REASON_MAX } from '@/lib/validation/cleaner';

export interface CleanerActivationResult {
  success: boolean;
  error?: string;
}

function revalidateCleaner(cleanerId: string) {
  revalidatePath('/admin/cleaners');
  revalidatePath(`/admin/cleaners/${cleanerId}`);
}

/**
 * Activate (approve) or deactivate (suspend) a cleaner. Approving covers new
 * 'pending' applications, re-activating a suspended cleaner and overriding an
 * earlier rejection.
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

  revalidateCleaner(cleanerId);
  return { success: true };
}

/**
 * Reject a cleaner application. The reason is required (the cleaner sees it
 * on their dashboard) and capped at CLEANER_REJECTION_REASON_MAX characters.
 */
export async function rejectCleanerAction(
  cleanerId: string,
  reason: string
): Promise<CleanerActivationResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const trimmed = typeof reason === 'string' ? reason.trim() : '';
  if (trimmed.length === 0) {
    return { success: false, error: 'Skriv en begrunnelse — renseren får se den' };
  }
  if (trimmed.length > CLEANER_REJECTION_REASON_MAX) {
    return {
      success: false,
      error: `Begrunnelsen kan være maks ${CLEANER_REJECTION_REASON_MAX} tegn`,
    };
  }

  const updated = await rejectCleaner(cleanerId, trimmed);

  if (!updated) {
    return { success: false, error: 'Kunne ikke avvise renseren' };
  }

  revalidateCleaner(cleanerId);
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

  revalidateCleaner(cleanerId);
  return { success: true };
}
