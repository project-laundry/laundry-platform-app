'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import { setCleanerVerificationStatus } from '@/lib/database/cleaners';

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
