// Marking an order ready — the single place an order becomes `ready_for_delivery`
// and the customer is CHARGED (the service is rendered and the price locked at
// this moment). Called by the cleaner's markOrderReadyForDelivery and the admin
// fallback adminMarkReadyAction. NOT a server action: keeping it a plain module
// means it can only run behind a role-guarded caller (same rule as complete-order.ts).

import { reportError } from '@/lib/services/error-alerts';
import { updateOrderStatusGuarded } from '@/lib/database/orders';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';
import { sendPriceReceiptEmail } from '@/lib/services/customer-emails';
import { sendToAdmins } from '@/lib/email/admin-mail';
import {
  PRICE_REVIEW_ESTIMATE_FACTOR,
  formatKrExact,
  orderPriceNeedsReview,
} from '@/lib/config/pricing';
import type { Order } from '@/types/database';

export type ReadyOrderInput = Pick<
  Order,
  | 'id'
  | 'order_number'
  | 'status'
  | 'wash_loads'
  | 'total_cost_ore'
  | 'promo'
  | 'customer_estimate'
  | 'pricing_notes'
>;

export interface ReadyOrderResult {
  success: boolean;
  error?: string;
  chargeFailed?: boolean;
  /** The price is far above the customer's estimate: no charge was created, the admins were e-mailed. */
  chargeHeld?: boolean;
}

/**
 * Pure: the plain-text e-mail that tells the admins a charge was held because
 * the cleaner's price is far above the customer's estimate. `appUrl` is the
 * public origin (NEXT_PUBLIC_APP_URL); a trailing slash is tolerated.
 */
export function buildPriceReviewEmail(
  order: ReadyOrderInput,
  appUrl: string
): { subject: string; text: string } {
  const estimate = order.customer_estimate;
  const promo = order.promo;
  const discountOre = promo?.discount_ore ?? 0;
  const chargeOre = order.total_cost_ore ?? 0;
  const fullPriceOre = chargeOre + discountOre;
  const note = order.pricing_notes?.trim() || 'ingen';
  const link = `${appUrl.replace(/\/+$/, '')}/admin/orders/${order.id}`;

  const lines = [
    `Belastningen for ordre #${order.order_number} er holdt tilbake`,
    '',
    `Renserens pris er mer enn ${PRICE_REVIEW_ESTIMATE_FACTOR} ganger kundens estimat. Kunden er ikke belastet og har ikke fått e-posten med prisen. Ordren er markert klar for levering, og renseren leverer som normalt.`,
    '',
  ];
  if (estimate) {
    lines.push(
      `Kundens estimat: ${formatKrExact(estimate.estimated_total_ore)}`,
      `Kunden oppga: ${estimate.bags} ${estimate.bags === 1 ? 'pose' : 'poser'}, ${estimate.bedding_sets} sett sengetøy`
    );
  }
  lines.push(`Renserens pris: ${formatKrExact(fullPriceOre)} (${order.wash_loads} vask)`);
  if (promo && discountOre > 0) {
    lines.push(
      `Rabatt (${promo.code}): −${formatKrExact(discountOre)}`,
      `Kunden skal betale: ${formatKrExact(chargeOre)}`
    );
  }
  lines.push(
    `Renserens notat om prisen: ${note}`,
    '',
    link,
    '',
    'Gjør ett av to på ordresiden:',
    '1. Prisen stemmer: trykk «Belast på nytt» under Betalinger. Da sendes betalingen til Vipps, og kunden får e-posten med prisen.',
    '2. Prisen er feil: endre antall vask under Pris og lagre. Trykk deretter «Belast på nytt» – å lagre en ny pris belaster ikke kunden.',
    '',
    'Kunden belastes ikke før du har trykket «Belast på nytt». Begge deler virker også etter at tøyet er levert.',
    ''
  );

  return {
    subject: `Pris må godkjennes – ordre #${order.order_number}: ${formatKrExact(fullPriceOre)} mot estimat ${
      estimate ? formatKrExact(estimate.estimated_total_ore) : 'ukjent'
    }`,
    text: lines.join('\n'),
  };
}

/**
 * E-mails every admin that the charge is held. Never throws: the order is
 * already ready for delivery and that must stand. One e-mail per order
 * (Resend Idempotency-Key) — an order passes the ready step only once.
 */
async function sendPriceReviewEmail(order: ReadyOrderInput): Promise<void> {
  try {
    const email = buildPriceReviewEmail(order, process.env.NEXT_PUBLIC_APP_URL ?? '');
    const { recipients, sent } = await sendToAdmins({
      ...email,
      idempotencyKey: `price-review/${order.id}`,
    });
    if (sent === 0) {
      await reportError(
        'Varsel om tilbakeholdt belastning nådde ingen admin',
        new Error(`Price review e-mail reached ${sent} of ${recipients} admin(s)`),
        { ordre: order.order_number }
      );
    } else if (sent < recipients) {
      console.error(
        `[Price review] Order ${order.order_number}: e-mail reached ${sent} of ${recipients} admin(s)`
      );
    }
  } catch (error) {
    await reportError('Varsel om tilbakeholdt belastning feilet', error, {
      ordre: order.order_number,
    });
  }
}

/**
 * Guarded `in_cleaning → ready_for_delivery`, then the Vipps charge for the
 * locked price, then the "price is set" e-mail to the customer. Wash details
 * and price must exist first, because the charge fires here. The guarded
 * transition runs before the charge, so a double-tap can never charge (or
 * e-mail) twice (the second call fails the from-status guard).
 *
 * Price guard: when the price is far above the customer's checkout estimate
 * (orderPriceNeedsReview — more than PRICE_REVIEW_ESTIMATE_FACTOR times it,
 * measured on the full price before promo) the order still becomes
 * ready_for_delivery, but NO payment row and NO Vipps charge are created and
 * the customer gets NO price e-mail. The admins are e-mailed instead and the
 * result is `{ success: true, chargeHeld: true }`. An admin then approves the
 * charge with «Belast på nytt» (retryChargeAction, which sends the customer
 * the price e-mail) or corrects the price first (overrideOrderPriceAction).
 * Orders without an estimate are never held.
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

  // Price guard — after the guarded transition (so a double-tap alerts once),
  // before any payment row or Vipps call.
  if (orderPriceNeedsReview(order)) {
    console.log(`Order ${order.order_number}: price is far above the estimate — charge held for review`);
    await sendPriceReviewEmail(order);
    return { success: true, chargeHeld: true };
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
