'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import { updateOrderStatusGuarded } from '@/lib/database/orders';
import { completeDeliveredOrder } from '@/lib/services/complete-order';
import {
  STOP_TRANSITIONS,
  STOP_UNDO_TRANSITIONS,
  type DriverStopType,
} from '@/lib/services/driver-route';

export interface DriverStopActionResult {
  success: boolean;
  error?: string;
  transitioned: number;
  skipped: number;
}

/**
 * Complete a route stop: advance every order at the stop one step.
 * customer_delivery completes via completeDeliveredOrder (no charge — that
 * happened when the cleaner marked it ready); the other stop types perform
 * their guarded status transition. Orders not in the expected from-status are
 * counted as skipped, not failed — a cleaner drop-off can legitimately
 * contain a bag whose pickup was skipped.
 */
export async function completeDriverStopAction(
  stopType: DriverStopType,
  orderIds: string[]
): Promise<DriverStopActionResult> {
  const { error: authError } = await assertRole(['driver', 'admin']);
  if (authError) {
    return { success: false, error: authError, transitioned: 0, skipped: 0 };
  }
  if (orderIds.length === 0) {
    return { success: false, error: 'Ingen ordrer å oppdatere', transitioned: 0, skipped: 0 };
  }

  let transitioned = 0;
  let skipped = 0;
  let firstError: string | null = null;

  if (stopType === 'customer_delivery') {
    for (const orderId of orderIds) {
      const result = await completeDeliveredOrder(orderId);
      if (result.success) {
        transitioned++;
      } else {
        skipped++;
        if (!firstError && result.error) firstError = result.error;
      }
    }
  } else {
    const transition = STOP_TRANSITIONS[stopType];
    for (const orderId of orderIds) {
      const updated = await updateOrderStatusGuarded(orderId, transition.from, transition.to);
      if (updated) transitioned++;
      else skipped++;
    }
  }

  revalidatePath('/dashboard/driver');

  if (transitioned === 0) {
    return {
      success: false,
      error: firstError ?? 'Ingen ordrer ble oppdatert — last siden på nytt',
      transitioned,
      skipped,
    };
  }
  return { success: true, transitioned, skipped };
}

/**
 * Undo the driver's previous stop completion (wrong tap). Deliveries cannot
 * be undone — completion stamps the actual delivery_date and fires the
 * rolling window.
 */
export async function undoDriverStopAction(
  stopType: DriverStopType,
  orderIds: string[]
): Promise<DriverStopActionResult> {
  const { error: authError } = await assertRole(['driver', 'admin']);
  if (authError) {
    return { success: false, error: authError, transitioned: 0, skipped: 0 };
  }
  if (stopType === 'customer_delivery') {
    return {
      success: false,
      error: 'Levering kan ikke angres',
      transitioned: 0,
      skipped: 0,
    };
  }

  const transition = STOP_UNDO_TRANSITIONS[stopType];
  let transitioned = 0;
  let skipped = 0;
  for (const orderId of orderIds) {
    const updated = await updateOrderStatusGuarded(orderId, transition.from, transition.to);
    if (updated) transitioned++;
    else skipped++;
  }

  revalidatePath('/dashboard/driver');

  if (transitioned === 0) {
    return { success: false, error: 'Ingen ordrer ble tilbakestilt', transitioned, skipped };
  }
  return { success: true, transitioned, skipped };
}
