// Marking an order ready — the single place an order becomes `ready_for_delivery`
// and the customer is CHARGED (the service is rendered and the price locked at
// this moment). Called by the cleaner's markOrderReadyForDelivery and the admin
// fallback adminMarkReadyAction. NOT a server action: keeping it a plain module
// means it can only run behind a role-guarded caller (same rule as complete-order.ts).

import { updateOrderStatusGuarded } from '@/lib/database/orders';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';
import type { Order } from '@/types/database';

export type ReadyOrderInput = Pick<
  Order,
  'id' | 'order_number' | 'status' | 'wash_loads' | 'total_cost_ore'
>;

export interface ReadyOrderResult {
  success: boolean;
  error?: string;
  chargeFailed?: boolean;
}

/**
 * Guarded `in_cleaning → ready_for_delivery`, then the Vipps charge for the
 * locked price. Wash details and price must exist first, because the charge
 * fires here. The guarded transition runs before the charge, so a double-tap
 * can never charge twice (the second call fails the from-status guard).
 *
 * A Vipps failure is NOT fatal: the laundry is clean and the transition
 * already happened, so the result is `{ success: true, chargeFailed: true }`
 * (createChargeForCompletedOrder has marked the payment row `failed`). An
 * admin re-charges with «Belast på nytt» (retryChargeAction).
 * A 0-total order (100 % promo) skips the charge — Vipps cannot charge 0.
 */
export async function markOrderReadyAndCharge(order: ReadyOrderInput): Promise<ReadyOrderResult> {
  if (order.status !== 'in_cleaning') {
    return { success: false, error: 'Ordren kan bare gjøres klar mens den vaskes' };
  }
  if (order.wash_loads === 0) {
    return { success: false, error: 'Vaskdetaljer må registreres før ordren kan gjøres klar' };
  }
  if (order.total_cost_ore === null) {
    return { success: false, error: 'Pris må beregnes før ordren kan gjøres klar' };
  }

  const updated = await updateOrderStatusGuarded(order.id, 'in_cleaning', 'ready_for_delivery');
  if (!updated) {
    return { success: false, error: 'Kunne ikke oppdatere status' };
  }

  if (order.total_cost_ore > 0) {
    try {
      await createChargeForCompletedOrder(
        order.id,
        order.total_cost_ore,
        `NooraCare vask #${order.order_number}`
      );
    } catch (error) {
      console.error('Failed to create Vipps charge:', error);
      return { success: true, chargeFailed: true };
    }
  } else {
    console.log(`Order ${order.order_number} total is 0 after discount — skipping Vipps charge`);
  }

  return { success: true };
}
