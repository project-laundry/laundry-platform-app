// Marking an order ready — the single place an order becomes `ready_for_delivery`
// and the customer is CHARGED (the service is rendered and the price locked at
// this moment). Called by the cleaner's markOrderReadyForDelivery and the admin
// fallback adminMarkReadyAction. NOT a server action: keeping it a plain module
// means it can only run behind a role-guarded caller (same rule as complete-order.ts).

import { reportError } from '@/lib/services/error-alerts';
import { updateOrderStatusGuarded } from '@/lib/database/orders';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';
import { sendPriceReceiptEmail } from '@/lib/services/customer-emails';
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
 * locked price, then the "price is set" e-mail to the customer. Wash details
 * and price must exist first, because the charge fires here. The guarded
 * transition runs before the charge, so a double-tap can never charge (or
 * e-mail) twice (the second call fails the from-status guard).
 *
 * A Vipps failure is NOT fatal: the laundry is clean and the transition
 * already happened, so the result is `{ success: true, chargeFailed: true }`
 * (createChargeForCompletedOrder has marked the payment row `failed`). No
 * e-mail is sent then — the customer has not been told a price yet; the
 * admin re-charges with «Belast på nytt» (retryChargeAction), which sends it.
 * A 0-total order (100 % promo) skips the charge — Vipps cannot charge 0 —
 * but still gets the e-mail. The e-mail never throws and is never a reason
 * to fail this call.
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

  let paymentId: string | null = null;
  if (order.total_cost_ore > 0) {
    try {
      paymentId = await createChargeForCompletedOrder(
        order.id,
        order.total_cost_ore,
        `NooraCare vask #${order.order_number}`
      );
    } catch (error) {
      await reportError('Vipps-belastning kunne ikke opprettes', error, { ordre: order.order_number });
      return { success: true, chargeFailed: true };
    }
  } else {
    console.log(`Order ${order.order_number} total is 0 after discount — skipping Vipps charge`);
  }

  await sendPriceReceiptEmail(order.id, paymentId);

  return { success: true };
}
