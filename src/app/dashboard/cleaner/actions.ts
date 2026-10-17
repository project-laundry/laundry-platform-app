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
  computeDiscountOre,
  type LaundryDetails,
  type PriceBreakdown,
} from '@/lib/config/pricing';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';
import { completeDeliveredOrder } from '@/lib/services/complete-order';

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
 * Mark an order as cleaned and ready to deliver — and CHARGE the customer
 * (the service is rendered and the price locked at this moment).
 *
 * Cleaners run their own logistics: markOrderPickedUpAction before this,
 * markOrderDeliveredAction after it. Wash details and price must exist first,
 * because the charge fires here. The guarded transition runs before the
 * charge, so a double-tap can never charge twice (the second call fails the
 * from-status guard).
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

  if (order.status !== 'in_cleaning') {
    return { success: false, error: 'Ordren kan bare gjøres klar mens den vaskes' };
  }
  if (order.wash_loads === 0) {
    return { success: false, error: 'Vaskdetaljer må registreres før ordren kan gjøres klar' };
  }
  if (order.total_cost_ore === null) {
    return { success: false, error: 'Pris må beregnes før ordren kan gjøres klar' };
  }

  const updated = await updateOrderStatusGuarded(orderId, 'in_cleaning', 'ready_for_delivery');
  if (!updated) {
    return { success: false, error: 'Kunne ikke oppdatere status' };
  }

  // Charge the customer for the locked-in price. (createChargeForCompletedOrder
  // predates the driver flow — despite the name it simply creates the Vipps
  // charge against the order's agreement; it has no status requirement.)
  // A 0-total order (100% promo) skips the charge — Vipps cannot charge 0; the
  // cancelled-subscription agreement stop is handled at delivery completion.
  let chargeFailed = false;
  if (order.total_cost_ore > 0) {
    try {
      const description = `NooraCare vask #${order.order_number}`;
      await createChargeForCompletedOrder(orderId, order.total_cost_ore, description);
    } catch (error) {
      // The transition already happened and the laundry is clean, so the
      // action still succeeds. The service has marked the payment row
      // `failed`; report it so the UI never claims the customer paid. An
      // admin re-charges from the order page («Belast på nytt»,
      // retryChargeAction in app/admin/orders/actions.ts).
      console.error('Failed to create Vipps charge:', error);
      chargeFailed = true;
    }
  } else {
    console.log(`Order ${order.order_number} total is 0 after discount — skipping Vipps charge`);
  }

  revalidatePath('/dashboard/cleaner');
  revalidatePath(`/dashboard/cleaner/${orderId}`);
  return chargeFailed ? { success: true, chargeFailed: true } : { success: true };
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

  let totalCostOre = priceBreakdown.total_ore;
  let promoUpdate = order.promo;
  if (order.promo) {
    const discountOre = computeDiscountOre(priceBreakdown.total_ore, order.promo);
    totalCostOre = priceBreakdown.total_ore - discountOre;
    promoUpdate = { ...order.promo, discount_ore: discountOre };
  }

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
