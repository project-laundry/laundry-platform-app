'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import {
  getOrdersByCleanerId,
  getOrderById,
  updateOrderStatus,
  declineOrder,
  updateOrderLaundryDetails,
  getCompletedOrdersByCleanerId,
  getOrderByIdAndCleanerId,
  type OrderWithCustomer,
} from '@/lib/database/orders';
import { completeOrderAction } from '@/app/admin/orders/completion-actions';
import {
  calculateOrderPrice,
  computeDiscountOre,
  type LaundryDetails,
  type PriceBreakdown,
} from '@/lib/config/pricing';
import { createChargeForCompletedOrder, stopVippsAgreementForCancelledSubscription } from '@/lib/payments/vipps/service';
import type { OrderStatus } from '@/types/database';

export type { OrderWithCustomer };

/**
 * Get current cleaner's assigned orders (active only)
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
 * Get current cleaner's completed/cancelled orders (history)
 */
export async function getCleanerOrderHistory(): Promise<OrderWithCustomer[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const cleaner = await getCleanerByUserId(user.id);
  if (!cleaner) return [];

  return getCompletedOrdersByCleanerId(cleaner.id);
}

/**
 * Get a specific order's details for the cleaner
 */
export async function getCleanerOrderDetails(
  orderId: string
): Promise<OrderWithCustomer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const cleaner = await getCleanerByUserId(user.id);
  if (!cleaner) return null;

  return getOrderByIdAndCleanerId(orderId, cleaner.id);
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

  // Don't allow direct completion via this action - use finishOrderAction instead
  if (status === 'completed') {
    return { success: false, error: 'Bruk "Fullfør ordre" for å fullføre ordren' };
  }

  // Check if cleaner is trying to pick up before the scheduled date
  if (status === 'picked_up') {
    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) {
      return { success: false, error: 'Ordre ikke funnet' };
    }

    const today = new Date();    
    const scheduledDate = new Date(existingOrder.scheduled_date);
    scheduledDate.setHours(0, 0, 0, 0);

    if (today < scheduledDate) {
      return {
        success: false,
        error: 'Du kan ikke hente før planlagt hentedato',
      };
    }
  }

  const order = await updateOrderStatus(orderId, status);

  if (!order) {
    return { success: false, error: 'Kunne ikke oppdatere status' };
  }

  revalidatePath('/dashboard/cleaner');
  revalidatePath(`/dashboard/cleaner/${orderId}`);
  return { success: true };
}

/**
 * Save laundry details (loads, ironing) and calculate price
 */
export async function saveLaundryDetails(
  orderId: string,
  details: LaundryDetails,
  notes?: string
): Promise<{ success: boolean; error?: string; priceBreakdown?: PriceBreakdown }> {
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

  // Validate loads
  if (details.dark_loads < 0 || details.white_loads < 0) {
    return { success: false, error: 'Antall vask kan ikke være negativt' };
  }

  if (details.dark_loads === 0 && details.white_loads === 0) {
    return { success: false, error: 'Du må registrere minst ett vask' };
  }

  // Calculate service price (full price; the cleaner's payout is based on this)
  const priceBreakdown = calculateOrderPrice(details);

  // Apply promo discount (if any) to the amount charged to the customer.
  // The discount is platform-absorbed: it reduces total_cost_ore but NOT the cleaner payout.
  const order = await getOrderByIdAndCleanerId(orderId, cleaner.id);
  if (!order) {
    return { success: false, error: 'Ordre ikke funnet eller ikke tildelt deg' };
  }

  let totalCostOre = priceBreakdown.total_ore;
  let promoUpdate = order.promo;
  if (order.promo) {
    const discountOre = computeDiscountOre(priceBreakdown.total_ore, order.promo);
    totalCostOre = priceBreakdown.total_ore - discountOre;
    promoUpdate = { ...order.promo, discount_ore: discountOre };
  }

  // Save to database
  const result = await updateOrderLaundryDetails(orderId, cleaner.id, {
    dark_loads: details.dark_loads,
    white_loads: details.white_loads,
    ironing_details: details.ironing_details,
    total_cost_ore: totalCostOre,
    pricing_notes: notes,
    promo: promoUpdate,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error || 'Kunne ikke lagre vaskdetaljer' };
  }

  revalidatePath('/dashboard/cleaner');
  revalidatePath(`/dashboard/cleaner/${orderId}`);
  return { success: true, priceBreakdown };
}

/**
 * Finish order - complete and charge customer
 * Only allowed when order is in 'out_for_delivery' status
 */
export async function finishOrderAction(
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

  // Get order details
  const order = await getOrderByIdAndCleanerId(orderId, cleaner.id);
  if (!order) {
    return { success: false, error: 'Ordre ikke funnet eller ikke tildelt deg' };
  }

  // Verify order is ready to be finished
  if (order.status !== 'out_for_delivery') {
    return { success: false, error: 'Ordren må være merket som "Ut for levering" før den kan fullføres' };
  }

  // Verify laundry details are set
  if (order.dark_loads === 0 && order.white_loads === 0) {
    return { success: false, error: 'Vaskdetaljer må registreres før ordren kan fullføres' };
  }

  // Verify price is calculated (0 is valid — a promo can discount the order to free)
  if (order.total_cost_ore === null) {
    return { success: false, error: 'Pris må beregnes før ordren kan fullføres' };
  }

  // Complete the order (updates status and triggers next order generation)
  const result = await completeOrderAction(orderId, order.subscription_id);
  if (!result.success) {
    return { success: false, error: result.error || 'Kunne ikke fullføre ordren' };
  }

  // Create Vipps charge for the order.
  // Works for both recurring orders (resolved via subscription's agreement) and
  // one-time orders (resolved via the order's own payment_agreement_id).
  // Skip entirely if a promo discounted the order to 0 — Vipps cannot charge 0.
  if (order.total_cost_ore > 0) {
    try {
      const description = `NooraCare vask #${order.order_number}`;
      await createChargeForCompletedOrder(orderId, order.total_cost_ore, description);
    } catch (error) {
      // Log the error but don't fail the completion
      // The charge can be retried manually or via webhook
      console.error('Failed to create Vipps charge:', error);
    }
  } else {
    console.log(`Order ${order.order_number} total is 0 after discount — skipping Vipps charge`);
    if (order.subscription_id) {
      await stopVippsAgreementForCancelledSubscription(order.subscription_id);
    }
  }

  revalidatePath('/dashboard/cleaner');
  revalidatePath(`/dashboard/cleaner/${orderId}`);
  return { success: true };
}

/**
 * Decline an assigned order
 * Only allowed before the order is started (status: pickup_scheduled)
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

  // Check if order is in a state where decline is allowed
  const order = await getOrderById(orderId);
  if (!order) {
    return { success: false, error: 'Ordre ikke funnet' };
  }

  if (order.status !== 'pickup_scheduled') {
    return { success: false, error: 'Du kan bare avslå oppdraget før det er startet' };
  }

  const result = await declineOrder(orderId, cleaner.id);

  if (!result) {
    return { success: false, error: 'Kunne ikke avslå oppdraget' };
  }

  revalidatePath('/dashboard/cleaner');
  return { success: true };
}
