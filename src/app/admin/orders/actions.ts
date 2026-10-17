'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import {
  getOrderById,
  assignCleanerToOrder,
  updateOrderAdminFields,
  updateOrderStatusGuarded,
  type AdminOrderUpdate,
} from '@/lib/database/orders';
import { completeDeliveredOrder } from '@/lib/services/complete-order';
import { getAvailableCleanersForCity } from '@/lib/database/cleaners';
import { getPaymentsByOrderId } from '@/lib/database/payments';
import { getPaymentAgreementById } from '@/lib/database/payment-agreements';
import { getSubscriptionById } from '@/lib/database/subscriptions';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';
import { hasLivePayment } from '@/lib/utils/payment-status';
import { geocodeAddress } from '@/lib/maps/geocoding';
import { validatePostalCode } from '@/lib/validation/cleaner';

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
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

export interface UpdateOrderDetailsInput {
  scheduled_date: string; // YYYY-MM-DD
  delivery_date: string; // YYYY-MM-DD
  street: string;
  postal_code: string;
}

export interface UpdateOrderDetailsResult {
  success: boolean;
  error?: string;
}

/** Statuses where the laundry is not yet picked up — every field is editable. */
const FULLY_EDITABLE_STATUSES = ['pending_assignment', 'pickup_scheduled'] as const;

/**
 * Statuses where the laundry is in progress: the pickup already happened, so
 * scheduled_date is locked, but the delivery estimate and address can still
 * be corrected.
 */
const IN_PROGRESS_STATUSES = [
  'picked_up',
  'in_cleaning',
  'ready_for_delivery',
  'out_for_delivery',
] as const;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Admin edit of an order's schedule and address. The customer-owned fields
 * (special_instructions_address, special_instructions, needs_ironing) are
 * deliberately not accepted here — admins may not change them.
 *
 * Server-side re-validation of everything the form already enforces (server
 * actions are public endpoints). Admins are deliberately NOT bound by the
 * customer-facing rescheduling rules (minimum notice days, cleaner weekday
 * availability) — this is the manual-override path. Only hard invariants are
 * enforced, each mirroring a DB CHECK constraint so the admin gets a readable
 * error instead of a failed write.
 */
export async function updateOrderDetailsAction(
  orderId: string,
  input: UpdateOrderDetailsInput
): Promise<UpdateOrderDetailsResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const order = await getOrderById(orderId);
  if (!order) {
    return { success: false, error: 'Ordren ble ikke funnet' };
  }

  const fullyEditable = (FULLY_EDITABLE_STATUSES as readonly string[]).includes(order.status);
  const inProgress = (IN_PROGRESS_STATUSES as readonly string[]).includes(order.status);
  if (!fullyEditable && !inProgress) {
    return { success: false, error: 'Fullførte og kansellerte ordre kan ikke endres' };
  }

  const street = input.street.trim();
  const postalCode = input.postal_code.trim();
  const scheduledDate = input.scheduled_date.trim();
  const deliveryDate = input.delivery_date.trim();

  if (!fullyEditable && scheduledDate !== order.scheduled_date) {
    return { success: false, error: 'Hentedato kan ikke endres etter at ordren er hentet' };
  }

  if (!ISO_DATE_PATTERN.test(scheduledDate) || Number.isNaN(Date.parse(scheduledDate))) {
    return { success: false, error: 'Ugyldig hentedato' };
  }
  if (!ISO_DATE_PATTERN.test(deliveryDate) || Number.isNaN(Date.parse(deliveryDate))) {
    return { success: false, error: 'Ugyldig leveringsdato' };
  }
  // ISO YYYY-MM-DD strings compare correctly as strings. Mirrors the
  // orders_delivery_after_scheduled CHECK constraint.
  if (deliveryDate < scheduledDate) {
    return { success: false, error: 'Leveringsdato kan ikke være før hentedato' };
  }

  if (street.length < 3) {
    return { success: false, error: 'Gateadresse må ha minst 3 tegn' };
  }
  if (!validatePostalCode(postalCode)) {
    return { success: false, error: 'Ugyldig postnummer (4 sifre)' };
  }

  const updates: AdminOrderUpdate = {
    scheduled_date: scheduledDate,
    delivery_date: deliveryDate,
    street,
    postal_code: postalCode,
  };

  // Re-geocode only when the address actually changed ("geocode at the
  // source" rule). A geocoding failure is not an error: the address saves
  // with NULL coordinates and saveOrderCoords backfills lazily later.
  if (street !== order.street || postalCode !== order.postal_code) {
    const coords = await geocodeAddress({
      street,
      postal_code: postalCode,
      city: order.city,
      country: order.country,
    });
    updates.latitude = coords?.latitude ?? null;
    updates.longitude = coords?.longitude ?? null;
  }

  const updated = await updateOrderAdminFields(orderId, updates);
  if (!updated) {
    return { success: false, error: 'Kunne ikke lagre endringene' };
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

export interface AdminLogisticsResult {
  success: boolean;
  error?: string;
}

/**
 * Admin fallback when the cleaner forgot to tap «Jeg har hentet tøyet».
 * Same transition as the cleaner's markOrderPickedUpAction. The guarded
 * write is the status check, so a stale page can't move the wrong order.
 */
export async function adminMarkPickedUpAction(orderId: string): Promise<AdminLogisticsResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const updated = await updateOrderStatusGuarded(orderId, 'pickup_scheduled', 'in_cleaning', {
    picked_up_at: new Date().toISOString(),
  });
  if (!updated) {
    return { success: false, error: 'Ordren venter ikke på henting — last siden på nytt' };
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

/**
 * Admin fallback when the cleaner forgot to tap «Levert til kunden».
 * Without it the next subscription order is never generated.
 */
export async function adminMarkDeliveredAction(orderId: string): Promise<AdminLogisticsResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const result = await completeDeliveredOrder(orderId, 'ready_for_delivery');
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

export interface RetryChargeResult {
  success: boolean;
  error?: string;
}

/**
 * Statuses from which the customer has been — or should have been — charged:
 * the charge fires when the cleaner marks the order ready.
 */
const CHARGED_STATUSES = ['ready_for_delivery', 'out_for_delivery', 'completed'] as const;

/**
 * «Belast på nytt»: create a fresh Vipps charge for an order whose charge
 * failed (at creation, or later at Vipps) and was never replaced.
 *
 * Server-side re-validation of everything the page already checks (server
 * actions are public endpoints): status, a positive price, no live payment
 * (hasLivePayment — the same rule the page uses to show the button), and an
 * agreement that is still active in our DB. createChargeForCompletedOrder
 * inserts the payment row and, on a Vipps error, marks it failed before
 * rethrowing, so a failed retry is visible on the page as one more row.
 */
export async function retryChargeAction(orderId: string): Promise<RetryChargeResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const order = await getOrderById(orderId);
  if (!order) {
    return { success: false, error: 'Ordren ble ikke funnet' };
  }

  if (!(CHARGED_STATUSES as readonly string[]).includes(order.status)) {
    return { success: false, error: 'Ordren kan bare belastes etter at den er gjort klar for levering' };
  }
  if (order.total_cost_ore === null || order.total_cost_ore <= 0) {
    return { success: false, error: 'Ordren har ingen pris å belaste' };
  }

  const payments = await getPaymentsByOrderId(orderId);
  if (hasLivePayment(payments)) {
    return { success: false, error: 'Ordren har allerede en betaling som er gjennomført eller under behandling' };
  }

  // Resolve the agreement the way createChargeForCompletedOrder does: the
  // order's own agreement (one-time + first orders), else the subscription's
  // (rolling-window orders carry no payment_agreement_id). Checking status
  // here avoids a doomed Vipps call when the customer stopped the agreement.
  let agreementId = order.payment_agreement_id;
  if (!agreementId && order.subscription_id) {
    const subscription = await getSubscriptionById(order.subscription_id);
    agreementId = subscription?.payment_agreement_id ?? null;
  }
  const agreement = agreementId ? await getPaymentAgreementById(agreementId) : null;
  if (!agreement || agreement.status !== 'active') {
    return { success: false, error: 'Vipps-avtalen er ikke aktiv lenger — kunden kan ikke belastes via Vipps' };
  }

  try {
    await createChargeForCompletedOrder(
      orderId,
      order.total_cost_ore,
      `NooraCare vask #${order.order_number}`
    );
  } catch (error) {
    console.error('[retryChargeAction] Vipps charge failed:', error);
    // The service already marked the new payment row failed — show it.
    revalidatePath(`/admin/orders/${orderId}`);
    const reason = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Belastningen feilet: ${reason}` };
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}
