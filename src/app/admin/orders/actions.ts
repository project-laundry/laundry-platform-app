'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import {
  getOrderById,
  assignCleanerToOrder,
  updateOrderAdminFields,
  type AdminOrderUpdate,
} from '@/lib/database/orders';
import { getAvailableCleanersForCity } from '@/lib/database/cleaners';
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
