// Order completion — the single place an order becomes `completed`.
// Pure logistics: the customer was already charged when the cleaner marked the
// order ready (see markOrderReadyForDelivery). Called by the cleaner's delivered action and the admin fallback (from ready_for_delivery), and by the dormant driver's customer_delivery stop action (from out_for_delivery). NOT a server action: keeping it a plain
// module means it can only run behind a role-guarded caller.

import { updateOrderStatusGuarded } from '@/lib/database/orders';
import { checkAndGenerateNextOrders } from '@/lib/services/order-generation';
import { sendOrderDeliveredEmail } from '@/lib/services/customer-emails';
import {
  stopVippsAgreementForCancelledSubscription,
  stopVippsAgreementForOneTimeOrder,
} from '@/lib/payments/vipps/service';
import { todayInOslo } from '@/lib/utils/date';
import type { OrderStatus } from '@/types/database';

/**
 * Complete an out-for-delivery order.
 * - Guarded transition (fromStatus → completed; ready_for_delivery when the cleaner or an admin delivers, out_for_delivery for the dormant driver flow) — a double-tap or
 *   concurrent completion can never run the side effects twice.
 * - Stamps `delivery_date` to the ACTUAL delivery date (Norwegian calendar day) in the same write
 *   (decision 13: the estimate becomes the real date on completion).
 * - Rolling window: completion triggers next-order generation (recurring).
 * - Runs the cancelled-subscription agreement-stop check unconditionally.
 *   Necessary here: when the ready-step charge captures BEFORE delivery, its
 *   webhook fires while this order is still active and the stop no-ops there —
 *   completion is when "no active orders remain" can become true. Safe here:
 *   the function itself refuses while any Vipps charge for the subscription is
 *   still pending (same-day delivery), and the charge-captured webhook
 *   re-triggers it once that charge settles. No-op in every other case.
 * - One-time orders (no subscription) run stopVippsAgreementForOneTimeOrder
 *   instead: it stops the order's own agreement when nothing is left to charge
 *   (0 kr total after a 100 % promo — no charge, so no charge-captured webhook —
 *   or a charge that is already captured). It refuses while a charge is still
 *   pending and while a failed charge is waiting for the admin's retry.
 * - Sends the customer the "laundry delivered" e-mail last (sendOrderDeliveredEmail,
 *   never throws) — for every completed order, subscription or one-time.
 */
export async function completeDeliveredOrder(
  orderId: string,
  fromStatus: Extract<OrderStatus, 'ready_for_delivery' | 'out_for_delivery'> = 'out_for_delivery'
): Promise<{ success: boolean; error?: string }> {
  const updated = await updateOrderStatusGuarded(orderId, fromStatus, 'completed', {
    delivery_date: todayInOslo(),
  });
  if (!updated) {
    return { success: false, error: 'Ordren kan ikke fullføres nå — last siden på nytt' };
  }

  // Rolling window: fire-and-forget, same as the previous completeOrderAction.
  if (updated.subscription_id) {
    checkAndGenerateNextOrders(updated.subscription_id).catch((error) => {
      console.error('[Order Completion] Failed to generate next order:', error);
    });

    await stopVippsAgreementForCancelledSubscription(updated.subscription_id);
  } else {
    // One-time order: stop its own Vipps agreement when nothing is left to
    // charge (#145). Never throws.
    await stopVippsAgreementForOneTimeOrder(updated.id);
  }

  // Delivered e-mail to the customer (#27). Deliberately LAST: the transition
  // is committed, the rolling window is already running and the agreement-stop
  // check has finished, so the e-mail can neither delay nor fail any of them.
  // Awaited (not fire-and-forget) so the serverless function is not frozen
  // before Resend answers. Never throws (lib/services/customer-emails.ts).
  await sendOrderDeliveredEmail(updated.id);

  return { success: true };
}
