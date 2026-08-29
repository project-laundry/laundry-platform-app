// Order completion — the single place an order becomes `completed`.
// Pure logistics: the customer was already charged when the cleaner marked the
// order ready (see markOrderReadyForDelivery). Called by the driver's
// customer_delivery stop action. NOT a server action: keeping it a plain
// module means it can only run behind a role-guarded caller.

import { updateOrderStatusGuarded } from '@/lib/database/orders';
import { checkAndGenerateNextOrders } from '@/lib/services/order-generation';
import { stopVippsAgreementForCancelledSubscription } from '@/lib/payments/vipps/service';
import { toISODateString } from '@/lib/utils/date';

/**
 * Complete an out-for-delivery order.
 * - Guarded transition (out_for_delivery → completed) — a double-tap or
 *   concurrent completion can never run the side effects twice.
 * - Stamps `delivery_date` to the ACTUAL delivery date in the same write
 *   (decision 13: the estimate becomes the real date on completion).
 * - Rolling window: completion triggers next-order generation (recurring).
 * - Runs the cancelled-subscription agreement-stop check unconditionally.
 *   Necessary here: when the ready-step charge captures BEFORE delivery, its
 *   webhook fires while this order is still active and the stop no-ops there —
 *   completion is when "no active orders remain" can become true. Safe here:
 *   the function itself refuses while any Vipps charge for the subscription is
 *   still pending (same-day delivery), and the charge-captured webhook
 *   re-triggers it once that charge settles. No-op in every other case.
 */
export async function completeDeliveredOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const updated = await updateOrderStatusGuarded(orderId, 'out_for_delivery', 'completed', {
    delivery_date: toISODateString(new Date()),
  });
  if (!updated) {
    return { success: false, error: 'Ordren er ikke ute for levering — last siden på nytt' };
  }

  // Rolling window: fire-and-forget, same as the previous completeOrderAction.
  if (updated.subscription_id) {
    checkAndGenerateNextOrders(updated.subscription_id).catch((error) => {
      console.error('[Order Completion] Failed to generate next order:', error);
    });

    await stopVippsAgreementForCancelledSubscription(updated.subscription_id);
  }

  return { success: true };
}
