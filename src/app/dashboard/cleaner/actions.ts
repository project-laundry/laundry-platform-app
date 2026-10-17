'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import {
  getOrderById,
  declineOrder,
  updateOrderLaundryDetails,
  updateOrderStatusGuarded,
  getOrderByIdAndCleanerId,
  type OrderWithCustomer,
} from '@/lib/database/orders';
import {
  calculateOrderPrice,
  IRONING_OFFERED,
  applyPromoDiscount,
  type LaundryDetails,
  type PriceBreakdown,
} from '@/lib/config/pricing';
import { completeDeliveredOrder } from '@/lib/services/complete-order';
import { markOrderReadyAndCharge } from '@/lib/services/ready-order';

export type { OrderWithCustomer };

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
 * Mark an order as cleaned and ready to deliver — and CHARGE the customer.
 * Cleaners run their own logistics: markOrderPickedUpAction before this,
 * markOrderDeliveredAction after it. The transition, its guards and the
 * charge live in lib/services/ready-order.ts (shared with the admin
 * fallback adminMarkReadyAction).
 */
export async function markOrderReadyForDelivery(
  orderId: string
): Promise<{ success: boolean; error?: string; chargeFailed?: boolean }> {
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

  const order = await getOrderByIdAndCleanerId(orderId, cleaner.id);
  if (!order) {
    return { success: false, error: 'Ordre ikke funnet eller ikke tildelt deg' };
  }

  const result = await markOrderReadyAndCharge(order);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/dashboard/cleaner');
  revalidatePath(`/dashboard/cleaner/${orderId}`);
  return result.chargeFailed ? { success: true, chargeFailed: true } : { success: true };
}

/**
 * The cleaner has collected the bags at the customer's door. Cleaners do
 * their own pickup (no drivers in this version) and the bags go straight
 * into their machine, so this jumps pickup_scheduled → in_cleaning in ONE
 * guarded write, stamping picked_up_at next to in_cleaning_at.
 * No date check: the UI warns before the pickup date, but an early pickup
 * agreed with the customer is allowed.
 */
export async function markOrderPickedUpAction(
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

  const order = await getOrderByIdAndCleanerId(orderId, cleaner.id);
  if (!order) {
    return { success: false, error: 'Ordre ikke funnet eller ikke tildelt deg' };
  }

  if (order.status !== 'pickup_scheduled') {
    return { success: false, error: 'Ordren er allerede hentet' };
  }

  const updated = await updateOrderStatusGuarded(orderId, 'pickup_scheduled', 'in_cleaning', {
    picked_up_at: new Date().toISOString(),
  });
  if (!updated) {
    return { success: false, error: 'Kunne ikke oppdatere status — last siden på nytt' };
  }

  revalidatePath('/dashboard/cleaner');
  revalidatePath(`/dashboard/cleaner/${orderId}`);
  return { success: true };
}

/**
 * The cleaner has handed the clean laundry back to the customer. The charge
 * already happened at "ready"; completion stamps the actual delivery date,
 * fires the rolling window and the cancelled-subscription agreement stop
 * (all inside completeDeliveredOrder).
 */
export async function markOrderDeliveredAction(
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

  const order = await getOrderByIdAndCleanerId(orderId, cleaner.id);
  if (!order) {
    return { success: false, error: 'Ordre ikke funnet eller ikke tildelt deg' };
  }

  if (order.status !== 'ready_for_delivery') {
    return { success: false, error: 'Ordren kan bare leveres når den er markert som klar' };
  }

  const result = await completeDeliveredOrder(orderId, 'ready_for_delivery');
  if (!result.success) {
    return { success: false, error: result.error };
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
  if (details.wash_loads < 0) {
    return { success: false, error: 'Antall vask kan ikke være negativt' };
  }

  if (details.wash_loads === 0) {
    return { success: false, error: 'Du må registrere minst ett vask' };
  }

  // Ironing isn't offered yet: never price or store it, whatever the client sent.
  if (!IRONING_OFFERED) details = { ...details, ironing_details: null };

  // Calculate service price (full price; the cleaner's payout is based on this)
  const priceBreakdown = calculateOrderPrice(details);

  // Apply promo discount (if any) to the amount charged to the customer.
  // The discount is platform-absorbed: it reduces total_cost_ore but NOT
  // cleaner_payout_ore, which is stamped from the full-price breakdown below.
  const order = await getOrderByIdAndCleanerId(orderId, cleaner.id);
  if (!order) {
    return { success: false, error: 'Ordre ikke funnet eller ikke tildelt deg' };
  }

  // Details (and therefore the price) can only change while the order is
  // in_cleaning: marking it ready CHARGES the customer at the then-current
  // total, so any later edit would silently diverge from the actual charge.
  if (order.status !== 'in_cleaning') {
    return { success: false, error: 'Vaskdetaljer kan ikke endres etter at ordren er gjort klar og kunden belastet' };
  }

  const { total_cost_ore: totalCostOre, promo: promoUpdate } = applyPromoDiscount(
    priceBreakdown.total_ore,
    order.promo
  );

  // Save to database
  const result = await updateOrderLaundryDetails(orderId, cleaner.id, {
    wash_loads: details.wash_loads,
    ironing_details: details.ironing_details,
    total_cost_ore: totalCostOre,
    cleaner_payout_ore: priceBreakdown.cleaner_payout_ore,
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
