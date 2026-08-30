'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import { getOrderById, assignCleanerToOrder } from '@/lib/database/orders';
import { getAvailableCleanersForCity } from '@/lib/database/cleaners';

export interface AssignCleanerResult {
  success: boolean;
  error?: string;
}

/** Statuses an admin may (re)assign — only before the laundry is picked up. */
const ASSIGNABLE_STATUSES = ['pending_assignment', 'pickup_scheduled'] as const;

/**
 * Assign or reassign a cleaner to an order.
 *
 * Server-side re-validation of everything the dropdown already enforces
 * (server actions are public endpoints): the order must not be picked up
 * yet, and the cleaner must be an available (approved + accepting) cleaner
 * in the order's own city.
 */
export async function assignCleanerAction(
  orderId: string,
  cleanerId: string
): Promise<AssignCleanerResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const order = await getOrderById(orderId);
  if (!order) {
    return { success: false, error: 'Ordren ble ikke funnet' };
  }

  if (!(ASSIGNABLE_STATUSES as readonly string[]).includes(order.status)) {
    return { success: false, error: 'Ordren kan ikke tildeles etter at den er hentet' };
  }

  if (order.cleaner_id === cleanerId) {
    return { success: false, error: 'Ordren er allerede tildelt denne renseren' };
  }

  const availableCleaners = await getAvailableCleanersForCity(order.city);
  if (!availableCleaners.some((cleaner) => cleaner.id === cleanerId)) {
    return { success: false, error: 'Renseren er ikke tilgjengelig i denne byen' };
  }

  const updated = await assignCleanerToOrder(orderId, cleanerId);
  if (!updated) {
    return { success: false, error: 'Kunne ikke tildele renser' };
  }

  revalidatePath('/admin/orders');
  return { success: true };
}
