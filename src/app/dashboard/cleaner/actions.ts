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
  computeDiscountOre,
  type LaundryDetails,
  type PriceBreakdown,
} from '@/lib/config/pricing';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';

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
 * Mark an order as cleaned and ready for the driver to collect — and CHARGE
 * the customer (decision 5: the service is rendered and the price locked at
 * this moment; the driver never touches money).
 *
 * This is the ONLY status transition a cleaner performs
 * (in_cleaning → ready_for_delivery); the driver handles every other leg.
 * Wash details and price must exist first, because the charge fires here.
 * The guarded transition runs before the charge, so a double-tap can never
 * charge twice (the second call fails the from-status guard).
 */
export async function markOrderReadyForDelivery(
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
  if (order.total_cost_ore > 0) {
    try {
      const description = `NooraCare vask #${order.order_number}`;
      await createChargeForCompletedOrder(orderId, order.total_cost_ore, description);
    } catch (error) {
      // Log but don't fail the transition — the charge can be retried manually.
      console.error('Failed to create Vipps charge:', error);
    }
  } else {
    console.log(`Order ${order.order_number} total is 0 after discount — skipping Vipps charge`);
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

  // Calculate service price (full price; the cleaner's payout is based on this)
  const priceBreakdown = calculateOrderPrice(details);

  // Apply promo discount (if any) to the amount charged to the customer.
  // The discount is platform-absorbed: it reduces total_cost_ore but NOT the cleaner payout.
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
