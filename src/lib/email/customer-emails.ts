// Customer e-mail builders — pure (no I/O), unit tested. Each builder turns
// an order loaded by getOrderForCustomerEmail into { subject, text, html }.
// Text and HTML are rendered from ONE block list so they can never drift,
// and the HTML wrapper mirrors supabase/templates/confirmation.html so every
// NooraCare e-mail looks the same. Sending lives in
// lib/services/customer-emails.ts.
//
// Wording rules (CLAUDE.md): customers count "poser" (estimate), the binding
// price is per machine ("maskiner"), kilos only appear as the weighed weight,
// and the e-mails carry no explanation of estimate vs. binding price — the
// confirmation shows the checkout figure as an «Estimat» row and nothing more.

import { COMPANY } from '@/lib/config/company';
import { evaluationPath } from '@/lib/config/evaluation';
import { PICKUP_TIME_RANGE } from '@/lib/config/pickup-times';
import {
  IRONING_OFFERED,
  PRICING,
  calculateOrderPrice,
  estimateAfterPromo,
  formatKr,
  formatKrExact,
} from '@/lib/config/pricing';
import type { OrderForCustomerEmail } from '@/lib/database/orders';
import { getSubscriptionFrequencyLabel } from '@/lib/utils/subscription-status';
import type { CustomerEstimate, Payment } from '@/types/database';

export interface CustomerEmail {
  subject: string;
  text: string;
  html: string;
}

export interface CustomerEmailOptions {
  /** Public origin (NEXT_PUBLIC_APP_URL); trailing slash tolerated. */
  appUrl: string;
}

// ─── Content model ──────────────────────────────────────────────────────────

export interface Row {
  label: string;
  value: string;
  strong?: boolean;
}

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'rows'; rows: Row[] }
  | { type: 'button'; label: string; url: string };

export const heading = (text: string): Block => ({ type: 'heading', text });
export const paragraph = (text: string): Block => ({ type: 'paragraph', text });
export const rows = (list: Row[]): Block => ({ type: 'rows', rows: list });
export const button = (label: string, url: string): Block => ({ type: 'button', label, url });

// ─── Formatting helpers ─────────────────────────────────────────────────────

// Charged amounts use formatKrExact from lib/config/pricing (41840 → "418,40 kr",
// 50000 → "500 kr" — øre are never dropped); estimates use formatKr (whole
// kroner). Re-exported so the e-mail module keeps exposing it.
export { formatKrExact };

/** "lørdag 24. oktober 2026" from YYYY-MM-DD. Noon UTC keeps the calendar day in Oslo. */
export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Oslo',
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function baseUrl(options: CustomerEmailOptions): string {
  return options.appUrl.replace(/\/$/, '');
}

function orderUrl(order: OrderForCustomerEmail, options: CustomerEmailOptions): string {
  return `${baseUrl(options)}/orders/details/${order.id}`;
}

function greeting(order: OrderForCustomerEmail): Block {
  const firstName = order.customer.user.full_name.trim().split(/\s+/)[0];
  return paragraph(firstName ? `Hei ${firstName}!` : 'Hei!');
}

export function closing(): Block {
  return paragraph(`Spørsmål? Svar på denne e-posten eller skriv til ${COMPANY.email}.`);
}

/** "Det du sender" lines from the checkout selection; ironing only while it is offered. */
export function estimateRows(estimate: CustomerEstimate): Row[] {
  const list: Row[] = [];
  if (estimate.bags > 0) {
    list.push({ label: 'Klær', value: `${estimate.bags} ${estimate.bags === 1 ? 'pose' : 'poser'}` });
  }
  if (estimate.bedding_sets > 0) {
    list.push({ label: 'Sengetøy', value: `${estimate.bedding_sets} sett` });
  }
  if (IRONING_OFFERED) {
    if (estimate.iron_everyday_items > 0) {
      list.push({ label: 'Stryking av vanlige plagg', value: `${estimate.iron_everyday_items} plagg` });
    }
    if (estimate.iron_formal_items > 0) {
      list.push({ label: 'Stryking av skjorter & kjoler', value: `${estimate.iron_formal_items} plagg` });
    }
    if (estimate.iron_bedding && estimate.bedding_sets > 0) {
      list.push({ label: 'Stryking av sengetøy', value: `${estimate.bedding_sets} sett` });
    }
  }
  return list;
}

// ─── Renderers ──────────────────────────────────────────────────────────────

function renderText(blocks: Block[]): string {
  const parts = blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return block.text.toUpperCase();
      case 'paragraph':
        return block.text;
      case 'rows':
        return block.rows.map((row) => `${row.label}: ${row.value}`).join('\n');
      case 'button':
        return `${block.label}: ${block.url}`;
    }
  });
  return `${parts.join('\n\n')}\n`;
}

const FONT = "Jost,'Helvetica Neue',Arial,sans-serif";

function renderBlockHtml(block: Block): string {
  switch (block.type) {
    case 'heading':
      return `<p style="margin:24px 0 8px;font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#3D6A7B;">${escapeHtml(block.text)}</p>`;
    case 'paragraph':
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1E3A4C;">${escapeHtml(block.text)}</p>`;
    case 'rows':
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#1E3A4C;">${block.rows
        .map((row) => {
          const weight = row.strong ? 'font-weight:600;' : '';
          return `<tr><td style="padding:4px 0;${weight}">${escapeHtml(row.label)}</td><td align="right" style="padding:4px 0 4px 16px;white-space:nowrap;${weight}">${escapeHtml(row.value)}</td></tr>`;
        })
        .join('')}</table>`;
    case 'button':
      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:999px;background-color:#1E3A4C;"><a href="${escapeHtml(block.url)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:500;color:#FFFFFF;text-decoration:none;border-radius:999px;">${escapeHtml(block.label)}</a></td></tr></table>`;
  }
}

function renderHtml(title: string, blocks: Block[], siteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="no">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F7F5F0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F7F5F0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#FDFCFA;border:1px solid #E9E1D3;border-radius:24px;">
            <tr>
              <td style="padding:32px 28px;font-family:${FONT};color:#1E3A4C;">
                <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#3D6A7B;">NooraCare</p>
                <h1 style="margin:0 0 16px;font-family:Fraunces,Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;line-height:1.25;color:#1E3A4C;">${escapeHtml(title)}</h1>
                ${blocks.map(renderBlockHtml).join('\n                ')}
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#586974;">NooraCare · <a href="mailto:${COMPANY.email}" style="color:#3D6A7B;">${COMPANY.email}</a><br /><a href="${escapeHtml(siteUrl)}" style="color:#3D6A7B;">${escapeHtml(siteUrl)}</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function finish(
  subject: string,
  title: string,
  blocks: Block[],
  options: CustomerEmailOptions
): CustomerEmail {
  return {
    subject,
    text: renderText(blocks),
    html: renderHtml(title, blocks, baseUrl(options)),
  };
}

// ─── #23 Order confirmation ─────────────────────────────────────────────────

/**
 * Sent once the first order exists (agreement activated). Shows the checkout
 * figure as an «Estimat» row, with no explanatory text. Subscription wording only for a
 * subscription order; a one-time order never mentions one. An order created
 * without a cleaner (status pending_assignment) gets the "we are assigning a
 * cleaner" intro: the pickup is still confirmed and no deadline is promised (#30).
 */
export function buildOrderConfirmationEmail(
  order: OrderForCustomerEmail,
  options: CustomerEmailOptions
): CustomerEmail {
  const subscription =
    order.subscription && order.subscription.frequency !== 'on_demand' ? order.subscription : null;
  const estimate = order.customer_estimate;
  const pickupDate = formatLongDate(order.scheduled_date);
  // #30: no cleaner was matched at checkout. The pickup date and address the
  // customer chose still stand — only the cleaner is missing — so the order is
  // confirmed like any other and the intro adds that we are assigning a
  // cleaner (no deadline promised); the customer hears from us again when an
  // admin assigns (buildCleanerConfirmedEmail).
  const awaitingCleaner = order.status === 'pending_assignment';

  let intro: string;
  if (awaitingCleaner) {
    intro =
      'Takk for bestillingen! Hentingen din er bekreftet. Vi tildeler nå en lokal renser – du trenger ikke gjøre noe, og du får en e-post så snart renseren er på plass.';
  } else if (subscription) {
    intro = 'Takk for bestillingen! Abonnementet ditt er i gang, og første henting er bekreftet.';
  } else {
    intro = 'Takk for bestillingen! Hentingen din er bekreftet.';
  }

  const blocks: Block[] = [
    greeting(order),
    paragraph(intro),
    heading('Henting'),
    rows([
      { label: 'Dato', value: pickupDate },
      { label: 'Adresse', value: `${order.street}, ${order.postal_code} ${order.city}` },
    ]),
  ];
  const items = estimate ? estimateRows(estimate) : [];
  if (items.length > 0) {
    blocks.push(heading('Det du sender'), rows(items));
  }

  // The «Pris» section is the estimate figure — with a promo code: estimate
  // before discount, the discount, and the estimate after it. With neither an
  // estimate nor a promo there is nothing to say and the section is left out.
  const priceBlocks: Block[] = [];
  if (estimate) {
    const { discountOre, totalOre } = estimateAfterPromo(estimate.estimated_total_ore, order.promo);
    if (order.promo && discountOre > 0) {
      priceBlocks.push(
        rows([
          { label: 'Estimat før rabatt', value: `ca. ${formatKr(estimate.estimated_total_ore)}` },
          { label: `Rabatt (${order.promo.code})`, value: `−${formatKr(discountOre)}` },
          { label: 'Estimat', value: `ca. ${formatKr(totalOre)}`, strong: true },
        ])
      );
    } else {
      priceBlocks.push(rows([{ label: 'Estimat', value: `ca. ${formatKr(estimate.estimated_total_ore)}` }]));
    }
  } else if (order.promo) {
    priceBlocks.push(paragraph(`Rabattkoden ${order.promo.code} trekkes fra den endelige prisen.`));
  }
  if (priceBlocks.length > 0) {
    blocks.push(heading('Pris'), ...priceBlocks);
  }

  if (subscription) {
    blocks.push(
      heading('Abonnement'),
      paragraph(
        `Henting ${getSubscriptionFrequencyLabel(subscription.frequency).toLowerCase()}. Neste henting settes opp automatisk når tøyet er levert. Du kan si opp abonnementet når som helst under «Abonnement» på Min side: ${baseUrl(options)}/dashboard/subscription`
      )
    );
  }

  blocks.push(button('Se bestillingen', orderUrl(order, options)), closing());

  return finish(
    `Bestilling #${order.order_number} er bekreftet – henting ${pickupDate}`,
    'Bestillingen din er bekreftet',
    blocks,
    options
  );
}

// ─── #26 Price set + receipt ────────────────────────────────────────────────

/**
 * Sent when the cleaner marks the order ready and the Vipps charge is created
 * (and again by the admin's «Belast på nytt» for the new charge). Doubles as
 * the receipt: the full price lines, the promo deduction and the Vipps
 * reference. The checkout estimate is not mentioned. `payment` is null for a
 * 0-total order (100 % promo) — nothing is charged then.
 */
export function buildPriceReceiptEmail(
  order: OrderForCustomerEmail,
  payment: Pick<Payment, 'provider_reference'> | null,
  options: CustomerEmailOptions
): CustomerEmail {
  const total = order.total_cost_ore ?? 0;
  const discount = order.promo?.discount_ore ?? 0;
  const breakdown = calculateOrderPrice({
    wash_loads: order.wash_loads,
    ironing_details: order.ironing_details,
  });

  // The line-by-line breakdown is only shown when it reproduces the stored
  // total exactly (it always does for a cleaner- or admin-priced order under
  // the current PRICING); otherwise the receipt shows the total alone.
  const priceRows: Row[] = [];
  if (breakdown.total_ore - discount === total) {
    priceRows.push({
      label: `Vask – ${order.wash_loads} ${order.wash_loads === 1 ? 'maskin' : 'maskiner'} à ${formatKr(PRICING.price_per_load_ore)}`,
      value: formatKrExact(breakdown.loads_subtotal_ore),
    });
    if (breakdown.ironing_subtotal_ore > 0) {
      priceRows.push({ label: 'Stryking', value: formatKrExact(breakdown.ironing_subtotal_ore) });
    }
    priceRows.push(
      { label: 'Henting og levering', value: formatKrExact(breakdown.pickup_delivery_ore) },
      { label: 'Servicegebyr', value: formatKrExact(breakdown.service_fee_ore) }
    );
    if (breakdown.minimum_applied) {
      priceRows.push({ label: 'Minstepris per bestilling', value: formatKrExact(breakdown.total_ore) });
    }
    if (order.promo && discount > 0) {
      priceRows.push({ label: `Rabatt (${order.promo.code})`, value: `−${formatKrExact(discount)}` });
    }
  }
  priceRows.push({ label: 'Totalt', value: formatKrExact(total), strong: true });

  const blocks: Block[] = [
    greeting(order),
    paragraph('Tøyet ditt er ferdig vasket, og renseren har satt den endelige prisen. Her er kvitteringen din.'),
    heading(`Bestilling #${order.order_number}`),
    rows(priceRows),
    paragraph('Den endelige prisen er basert på hvor mye tøy du faktisk sendte.'),
  ];

  if (order.actual_weight_kg !== null) {
    blocks.push(rows([{ label: 'Veid', value: `${order.actual_weight_kg} kg` }]));
  }
  if (order.pricing_notes) {
    blocks.push(paragraph(`Fra renseren: «${order.pricing_notes}»`));
  }

  blocks.push(heading('Betaling'));
  if (total > 0) {
    blocks.push(
      paragraph(
        `${formatKrExact(total)} trekkes automatisk via Vipps-avtalen din i løpet av et par dager. Du trenger ikke gjøre noe.`
      )
    );
    if (payment?.provider_reference) {
      blocks.push(rows([{ label: 'Vipps-referanse', value: payment.provider_reference }]));
    }
  } else {
    blocks.push(paragraph('Rabatten dekker hele beløpet – ingenting trekkes fra Vipps-avtalen din.'));
  }

  blocks.push(button('Se bestillingen', orderUrl(order, options)), closing());

  return finish(
    `Prisen er satt – ${formatKrExact(total)} for bestilling #${order.order_number}`,
    'Prisen er satt',
    blocks,
    options
  );
}

// ─── #28 Payment failed ─────────────────────────────────────────────────────

/**
 * Sent when Vipps reports the charge as failed (charge-failed after its own
 * retries, or charge-creation-failed). The customer usually does not know.
 * Encodes the retry policy: nothing to do, we re-charge within a few days
 * (admin «Belast på nytt»), we get in touch if that fails too; the laundry
 * is delivered regardless.
 */
export function buildPaymentFailedEmail(
  order: OrderForCustomerEmail,
  payment: Pick<Payment, 'amount_ore' | 'provider_reference'>,
  options: CustomerEmailOptions
): CustomerEmail {
  const amount = formatKrExact(payment.amount_ore);
  const blocks: Block[] = [
    greeting(order),
    paragraph(`Vi fikk dessverre ikke trukket ${amount} for bestilling #${order.order_number} via Vipps.`),
    heading('Hva skjer nå'),
    paragraph('Dette påvirker ikke leveringen av tøyet ditt.'),
    paragraph(
      'Sjekk at betalingskortet i Vipps-appen er gyldig og har dekning, og at Vipps-avtalen med NooraCare fortsatt er aktiv.'
    ),
    paragraph(
      'Vi gjør et nytt forsøk på å trekke beløpet i løpet av noen dager. Du trenger ikke gjøre noe mer. Lykkes det ikke, tar vi kontakt med deg.'
    ),
  ];

  if (payment.provider_reference) {
    blocks.push(rows([{ label: 'Vipps-referanse', value: payment.provider_reference }]));
  }

  blocks.push(button('Se bestillingen', orderUrl(order, options)), closing());

  return finish(
    `Betalingen for bestilling #${order.order_number} gikk ikke gjennom`,
    'Betalingen gikk ikke gjennom',
    blocks,
    options
  );
}

// ─── #27 Order delivered ────────────────────────────────────────────────────

/**
 * The payment sentence of the delivered e-mail, or null when nothing true and
 * useful can be said. The charge was created when the order was marked ready,
 * so at delivery it is usually still pending (due the day after), sometimes
 * already captured, and occasionally failed. Failed / cancelled / refunded /
 * never-created charges return null on purpose: that conversation belongs to
 * the payment-failed e-mail and the admin's retry, not to a delivery note.
 */
function deliveredPaymentLine(
  order: OrderForCustomerEmail,
  payments: Pick<Payment, 'status' | 'amount_ore' | 'provider_reference'>[]
): string | null {
  if (order.total_cost_ore === 0) {
    return 'Ingenting trekkes fra Vipps-avtalen din for denne bestillingen.';
  }

  const captured = payments.find((payment) => payment.status === 'captured');
  if (captured) {
    return `${formatKrExact(captured.amount_ore)} er trukket via Vipps-avtalen din.`;
  }

  const inFlight = payments.find(
    (payment) =>
      payment.status === 'authorized' ||
      (payment.status === 'pending' && payment.provider_reference !== null)
  );
  if (inFlight) {
    return `${formatKrExact(inFlight.amount_ore)} trekkes automatisk via Vipps-avtalen din i løpet av et par dager. Du trenger ikke gjøre noe.`;
  }

  return null;
}

/**
 * Sent once when the order becomes `completed` (completeDeliveredOrder).
 * Closes the loop: delivered when and where, what happens with the payment,
 * link to the order. `payments` = every payments row of the order. The
 * subscription paragraph is dormant while subscriptions are hidden (a one-time
 * order has no subscription) and never states a date — the next order is
 * generated in the background while this e-mail is built.
 */
export function buildOrderDeliveredEmail(
  order: OrderForCustomerEmail,
  payments: Pick<Payment, 'status' | 'amount_ore' | 'provider_reference'>[],
  options: CustomerEmailOptions
): CustomerEmail {
  const blocks: Block[] = [
    greeting(order),
    paragraph(`Tøyet ditt er levert, og bestilling #${order.order_number} er fullført.`),
    heading('Levering'),
    rows([
      { label: 'Levert', value: formatLongDate(order.delivery_date) },
      { label: 'Adresse', value: `${order.street}, ${order.postal_code} ${order.city}` },
    ]),
  ];

  const paymentLine = deliveredPaymentLine(order, payments);
  if (paymentLine) {
    blocks.push(heading('Betaling'), paragraph(paymentLine));
  }

  if (
    order.subscription &&
    order.subscription.status === 'active' &&
    order.subscription.frequency !== 'on_demand'
  ) {
    blocks.push(
      paragraph(
        `Abonnementet ditt fortsetter. Neste henting settes opp automatisk, og du finner datoen på Min side: ${baseUrl(options)}/dashboard`
      )
    );
  }

  blocks.push(button('Se bestillingen', orderUrl(order, options)), closing());

  return finish(
    `Tøyet ditt er levert – bestilling #${order.order_number}`,
    'Tøyet ditt er levert',
    blocks,
    options
  );
}

// ─── #25 Laundry picked up ──────────────────────────────────────────────────

/** "lørdag 24. oktober kl. 14:32" (Oslo time) from an ISO timestamp. */
function formatPickupMoment(iso: string): string {
  const at = new Date(iso);
  const day = new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Oslo',
  }).format(at);
  const time = new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Oslo',
  }).format(at);
  return `${day} kl. ${time}`;
}

/**
 * Sent when the laundry leaves the customer's door (cleaner's «Jeg har hentet
 * tøyet» or the admin fallback). Receipt of custody: who has it, what happens
 * next. Deliberately NO delivery
 * date or deadline — no turnaround promises (CLAUDE.md). `showPickupTime` is
 * false for the admin fallback, whose timestamp is when the admin clicked,
 * not when the bags were collected.
 */
export function buildOrderPickedUpEmail(
  order: OrderForCustomerEmail,
  details: { showPickupTime: boolean },
  options: CustomerEmailOptions
): CustomerEmail {
  // The cleaner's whole display name (plan amendment: not just the first word).
  const cleanerName = order.cleaner?.display_name.trim();
  const who = cleanerName ? `${cleanerName}, renseren din,` : 'Renseren din';
  const when =
    details.showPickupTime && order.picked_up_at ? formatPickupMoment(order.picked_up_at) : null;

  const blocks: Block[] = [
    greeting(order),
    paragraph(when ? `${who} hentet tøyet ditt ${when}.` : `${who} har hentet tøyet ditt.`),
    heading('Hva skjer nå'),
    paragraph(
      'Nå skal tøyet vaskes. Du får en e-post når prisen er satt, og en ny når tøyet er levert.'
    ),
    button('Se bestillingen', orderUrl(order, options)),
    closing(),
  ];

  return finish(
    `Tøyet ditt er hentet – bestilling #${order.order_number}`,
    'Tøyet ditt er hentet',
    blocks,
    options
  );
}

// ─── #24 Pickup reminder ────────────────────────────────────────────────────

/**
 * Sent by the pickup-reminders cron the evening before the pickup date, to
 * orders in pickup_scheduled. One job: get the bag ready. Repeats the address
 * and the customer's own instructions so an error is spotted while the order
 * page still accepts changes (address, instructions, a later date).
 * Cancellation is deliberately not offered: the app refuses it less than 24
 * hours before pickup. Never mentions a subscription.
 */
export function buildPickupReminderEmail(
  order: OrderForCustomerEmail,
  options: CustomerEmailOptions
): CustomerEmail {
  const pickupDate = formatLongDate(order.scheduled_date);
  const cleanerName = order.cleaner?.display_name.trim() || null;
  const addressNote = order.special_instructions_address?.trim() || null;
  const washNote = order.special_instructions?.trim() || null;

  const pickupRows = [
    { label: 'Dato', value: pickupDate },
    { label: 'Tid', value: `kl. ${PICKUP_TIME_RANGE.start}–${PICKUP_TIME_RANGE.end}` },
    { label: 'Adresse', value: `${order.street}, ${order.postal_code} ${order.city}` },
  ];
  if (cleanerName) {
    pickupRows.push({ label: 'Renser', value: cleanerName });
  }

  const blocks: Block[] = [
    greeting(order),
    paragraph(
      `${cleanerName ?? 'Vi'} henter tøyet ditt i morgen, ${pickupDate}, mellom kl. ${PICKUP_TIME_RANGE.start} og ${PICKUP_TIME_RANGE.end}. Sett posen klar før kl. ${PICKUP_TIME_RANGE.start}.`
    ),
    heading('Henting'),
    rows(pickupRows),
    heading('Dine beskjeder'),
  ];

  if (addressNote) {
    blocks.push(paragraph(`Henteinstruksjoner: ${addressNote}`));
  }
  if (washNote) {
    blocks.push(paragraph(`Vaskeinstruksjoner: ${washNote}`));
  }
  if (!addressNote && !washNote) {
    blocks.push(paragraph('Du har ikke lagt inn noen beskjeder til renseren.'));
  }

  blocks.push(
    paragraph(
      'Stemmer ikke noe? Du kan fortsatt endre adresse, beskjeder og hentedato på bestillingssiden.'
    ),
    button('Se eller endre bestillingen', orderUrl(order, options)),
    closing()
  );

  return finish(
    'Vi henter tøyet ditt i morgen – sett posen klar',
    'Vi henter tøyet ditt i morgen',
    blocks,
    options
  );
}

// ─── #29 Order cancelled / new pickup date ──────────────────────────────────

export interface OrderCancelledDetails {
  /**
   * Pickup date (YYYY-MM-DD) of the subscription's next not-yet-picked-up
   * order, or null. Only read for an order of an active recurring subscription.
   */
  nextPickupDate: string | null;
}

/**
 * Sent when an order is cancelled before pickup — by the customer
 * (cancelOrderAction) or by an admin (cancelOrderAdminAction). The admin's
 * required reason is stored in cancellation_reason and shown; a customer
 * cannot enter one, so a non-empty reason means NooraCare cancelled.
 *
 * "Ingenting er trukket … du blir ikke belastet" is true for every order
 * that can be cancelled: a charge is only created once an order is marked
 * ready (in_cleaning → ready_for_delivery), and only pending_assignment /
 * pickup_scheduled orders can be cancelled. The Vipps AGREEMENT is
 * deliberately not mentioned: for a one-time order it is stopped silently
 * right after the cancel write (stopVippsAgreementForOneTimeOrder), and a
 * failed stop is only logged, so neither "stopped" nor "still active" is safe
 * to say.
 */
export function buildOrderCancelledEmail(
  order: OrderForCustomerEmail,
  details: OrderCancelledDetails,
  options: CustomerEmailOptions
): CustomerEmail {
  const reason = order.cancellation_reason?.trim() || null;
  const subscription =
    order.subscription && order.subscription.frequency !== 'on_demand' ? order.subscription : null;

  const blocks: Block[] = [
    greeting(order),
    paragraph(
      reason
        ? `Vi har kansellert bestilling #${order.order_number}. Tøyet blir ikke hentet.`
        : `Vi bekrefter at bestilling #${order.order_number} er kansellert. Tøyet blir ikke hentet.`
    ),
  ];

  if (reason) {
    blocks.push(paragraph(`Årsak: ${reason}`));
  }

  blocks.push(
    heading('Kansellert henting'),
    rows([
      { label: 'Dato', value: formatLongDate(order.scheduled_date) },
      { label: 'Adresse', value: `${order.street}, ${order.postal_code} ${order.city}` },
    ]),
    heading('Betaling'),
    paragraph('Ingenting er trukket for denne bestillingen, og du blir ikke belastet for den.')
  );

  if (subscription?.status === 'active') {
    blocks.push(
      heading('Abonnement'),
      paragraph(
        details.nextPickupDate
          ? `Abonnementet ditt fortsetter. Neste henting er ${formatLongDate(details.nextPickupDate)}.`
          : 'Abonnementet ditt fortsetter. Neste henting settes opp automatisk, og du finner den på Min side.'
      )
    );
  } else if (subscription?.status === 'cancelled' || subscription?.status === 'expired') {
    blocks.push(
      heading('Abonnement'),
      paragraph('Abonnementet ditt er sagt opp, så det settes ikke opp flere hentinger.')
    );
  }

  blocks.push(button('Se bestillingen', orderUrl(order, options)), closing());

  return finish(
    `Bestilling #${order.order_number} er kansellert`,
    'Bestillingen er kansellert',
    blocks,
    options
  );
}

export interface PickupDateChange {
  /** orders.scheduled_date before the change (YYYY-MM-DD). The order passed to the builder already carries the new date. */
  previousPickupDate: string;
  /** Who moved the pickup: the customer on the reschedule page, or an admin in the order edit form. */
  changedBy: 'customer' | 'admin';
}

/**
 * Sent when the pickup date of a not-yet-picked-up order changes: old date →
 * new date, with the address and the pickup instructions, so the customer
 * has it in writing. When an admin moved the pickup the customer did not ask
 * for it, so the wording says "vi" and invites a reply.
 */
export function buildPickupRescheduledEmail(
  order: OrderForCustomerEmail,
  change: PickupDateChange,
  options: CustomerEmailOptions
): CustomerEmail {
  const newDate = formatLongDate(order.scheduled_date);
  const byAdmin = change.changedBy === 'admin';

  const blocks: Block[] = [
    greeting(order),
    paragraph(
      byAdmin
        ? `Vi har endret hentedatoen for bestilling #${order.order_number}.`
        : `Vi bekrefter at hentedatoen for bestilling #${order.order_number} er endret.`
    ),
    heading('Henting'),
    rows([
      { label: 'Ny dato', value: newDate, strong: true },
      { label: 'Tidligere dato', value: formatLongDate(change.previousPickupDate) },
      { label: 'Adresse', value: `${order.street}, ${order.postal_code} ${order.city}` },
    ]),
  ];

  const instructions = order.special_instructions_address?.trim();
  if (instructions) {
    blocks.push(paragraph(`Henteinstruksjoner: ${instructions}`));
  }

  if (byAdmin) {
    blocks.push(
      paragraph('Passer ikke den nye datoen? Gi oss beskjed ved å svare på denne e-posten.')
    );
  }

  blocks.push(button('Se bestillingen', orderUrl(order, options)), closing());

  return finish(
    `Ny hentedato for bestilling #${order.order_number}: ${newDate}`,
    'Ny hentedato',
    blocks,
    options
  );
}

// ─── #30 Cleaner confirmed ──────────────────────────────────────────────────

/**
 * Sent when an admin assigns a cleaner to an order that was waiting for one
 * (pending_assignment → pickup_scheduled). Names the cleaner and repeats the
 * pickup date the order has now and the address. The pickup itself was
 * already confirmed, so this announces the cleaner, not the date. The copy stands on its
 * own — it never refers back to an earlier e-mail — because it is also what
 * the customer gets when a cleaner declined a confirmed order and the admin
 * assigns a new one.
 */
export function buildCleanerConfirmedEmail(
  order: OrderForCustomerEmail,
  cleanerDisplayName: string,
  options: CustomerEmailOptions
): CustomerEmail {
  const pickupDate = formatLongDate(order.scheduled_date);
  // The whole display name the cleaner chose to show customers (plan amendment:
  // not just the first word). Never the cleaner's legal name.
  const cleanerName = cleanerDisplayName.trim();

  const pickupRows: Row[] = [
    { label: 'Dato', value: pickupDate },
    { label: 'Adresse', value: `${order.street}, ${order.postal_code} ${order.city}` },
  ];
  if (cleanerName) {
    pickupRows.push({ label: 'Renser', value: cleanerName });
  }

  const blocks: Block[] = [
    greeting(order),
    paragraph(
      cleanerName
        ? `Renseren din er på plass. ${cleanerName}, en godkjent renser i området, henter tøyet ditt ${pickupDate}.`
        : `Renseren din er på plass. En godkjent renser i området henter tøyet ditt ${pickupDate}.`
    ),
    heading('Henting'),
    rows(pickupRows),
    paragraph('Du trenger ikke gjøre noe mer.'),
    button('Se bestillingen', orderUrl(order, options)),
    closing(),
  ];

  return finish(
    `Renseren din er på plass – henting ${pickupDate} (bestilling #${order.order_number})`,
    'Renseren din er på plass',
    blocks,
    options
  );
}

// ─── Evaluation request ─────────────────────────────────────────────────────

/**
 * Sent right after the delivered e-mail when the order is the customer's
 * first completed one (sendEvaluationRequestEmail). One button to the form at
 * /evaluering/<order id>, which needs no login.
 */
export function buildEvaluationRequestEmail(
  order: OrderForCustomerEmail,
  options: CustomerEmailOptions
): CustomerEmail {
  const blocks: Block[] = [
    greeting(order),
    paragraph(
      `Takk for at du prøvde NooraCare. Vi vil gjerne høre hvordan det gikk med bestilling #${order.order_number}.`
    ),
    paragraph('Svarene dine hjelper oss å sette riktig pris og gjøre tjenesten bedre. Det tar ca. 2 minutter.'),
    button('Svar på spørsmålene', `${baseUrl(options)}${evaluationPath(order.id)}`),
    closing(),
  ];

  return finish('Hvordan var vasken?', 'Hvordan var vasken?', blocks, options);
}
