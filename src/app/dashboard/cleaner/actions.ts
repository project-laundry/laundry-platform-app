'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import {
  getOrdersByCleanerId,
  getOrderById,
  updateOrderStatus,
  updateOrderPricing,
  declineOrder,
  type OrderWithCustomer,
} from '@/lib/database/orders';
import { completeOrderAction } from '@/app/admin/orders/completion-actions';
import { calculateOrderPrice } from '@/lib/config/pricing';
import type { OrderStatus } from '@/types/database';

export type { OrderWithCustomer };

/**
 * Get current cleaner's assigned orders
 */
export async function getCleanerOrders(): Promise<OrderWithCustomer[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const cleaner = await getCleanerByUserId(user.id);
  if (!cleaner) return [];

  return getOrdersByCleanerId(cleaner.id);
}

/**
 * Update order status (for simple status transitions)
 */
export async function updateCleanerOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Ikke autentisert' };
  }

  const cleaner = await getCleanerByUserId(user.id);
  if (!cleaner) {
    return { success: false, error: 'Renserprofil ikke funnet' };
  }

  // Use completion action for 'completed' status (handles next order generation)
  if (status === 'completed') {
    const result = await completeOrderAction(orderId);
    if (result.success) {
      revalidatePath('/dashboard/cleaner');
    }
    return result;
  }

  const order = await updateOrderStatus(orderId, status);

  if (!order) {
    return { success: false, error: 'Kunne ikke oppdatere status' };
  }

  revalidatePath('/dashboard/cleaner');
  return { success: true };
}

/**
 * Set order weight and calculate price (after pickup)
 */
export async function setOrderWeight(
  orderId: string,
  weightKg: number,
  pricingNotes?: string
): Promise<{ success: boolean; error?: string; totalCostOre?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Ikke autentisert' };
  }

  const cleaner = await getCleanerByUserId(user.id);
  if (!cleaner) {
    return { success: false, error: 'Renserprofil ikke funnet' };
  }

  // Get order to check needs_ironing and ownership (using admin client via getOrderById)
  const order = await getOrderById(orderId);

  if (!order) {
    return { success: false, error: 'Ordre ikke funnet' };
  }

  if (order.cleaner_id !== cleaner.id) {
    return { success: false, error: 'Denne ordren er ikke tildelt deg' };
  }

  const totalCostOre = calculateOrderPrice(weightKg, order.needs_ironing);

  const result = await updateOrderPricing(orderId, cleaner.id, weightKg, totalCostOre, pricingNotes);

  if (result.error || !result.data) {
    return { success: false, error: result.error || 'Kunne ikke lagre prising' };
  }

  revalidatePath('/dashboard/cleaner');
  return { success: true, totalCostOre };
}

/**
 * Decline an assigned order
 */
export async function declineCleanerOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Ikke autentisert' };
  }

  const cleaner = await getCleanerByUserId(user.id);
  if (!cleaner) {
    return { success: false, error: 'Renserprofil ikke funnet' };
  }

  const result = await declineOrder(orderId, cleaner.id);

  if (!result) {
    return { success: false, error: 'Kunne ikke avslå oppdraget' };
  }

  revalidatePath('/dashboard/cleaner');
  return { success: true };
}
