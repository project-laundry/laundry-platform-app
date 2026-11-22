// Staff e-mail builders — pure (no I/O), unit tested. «Nytt oppdrag» to the
// cleaner uses the same block list and HTML wrapper as the customer e-mails
// (lib/email/customer-emails.ts); the two admin alerts are plain text like
// the daily digest. Sending lives in lib/services/staff-emails.ts.
//
// The cleaner mail carries no customer name, phone or e-mail — the cleaner
// finds those on the order page behind the button.

import { PICKUP_TIME_RANGE } from '@/lib/config/pickup-times';
import type { OrderForStaffEmail } from '@/lib/database/orders';
import {
  baseUrl,
  button,
  closing,
  estimateRows,
  finish,
  formatLongDate,
  heading,
  paragraph,
  rows,
  type Block,
  type CustomerEmail,
  type CustomerEmailOptions,
} from '@/lib/email/customer-emails';

/** A plain-text admin alert (same shape as the daily digest). */
export interface StaffTextEmail {
  subject: string;
  text: string;
}

/**
 * «Nytt oppdrag» — sent to the cleaner whenever an order becomes theirs
 * (first order, admin assignment, automatic re-assignment after a decline).
 */
export function buildCleanerNewOrderEmail(
  order: OrderForStaffEmail,
  options: CustomerEmailOptions
): CustomerEmail {
  const pickupDate = formatLongDate(order.scheduled_date);
  const firstName = order.cleaner?.user.full_name.trim().split(/\s+/)[0];
  const pickupNote = order.special_instructions_address?.trim() || null;

  const blocks: Block[] = [
    paragraph(firstName ? `Hei ${firstName}!` : 'Hei!'),
    paragraph(`Du har fått et nytt oppdrag: ordre #${order.order_number}.`),
    heading('Henting'),
    rows([
      { label: 'Dato', value: pickupDate },
      { label: 'Tid', value: `kl. ${PICKUP_TIME_RANGE.start}–${PICKUP_TIME_RANGE.end}` },
      { label: 'Adresse', value: `${order.street}, ${order.postal_code} ${order.city}` },
    ]),
  ];

  if (pickupNote) {
    blocks.push(paragraph(`Henteinstruksjoner: ${pickupNote}`));
  }

  const items = order.customer_estimate ? estimateRows(order.customer_estimate) : [];
  if (items.length > 0) {
    blocks.push(heading('Kunden har oppgitt'), rows(items));
  }

  blocks.push(
    paragraph('Kan du ikke ta oppdraget? Avslå det på oppdragssiden så snart som mulig.'),
    button('Åpne oppdraget', `${baseUrl(options)}/dashboard/cleaner/${order.id}`),
    closing()
  );

  return finish(
    `Nytt oppdrag – henting ${pickupDate} (ordre #${order.order_number})`,
    'Nytt oppdrag',
    blocks,
    options
  );
}

/** «Ny ordre» — sent to every admin when a first order is created. */
export function buildAdminNewOrderEmail(
  order: OrderForStaffEmail,
  options: CustomerEmailOptions
): StaffTextEmail {
  const pickupDate = formatLongDate(order.scheduled_date);
  const cleanerName = order.cleaner?.display_name.trim() || null;

  return {
    subject: `Ny ordre #${order.order_number} – ${order.city}, henting ${pickupDate}${
      cleanerName ? '' : ' – ingen renser ennå'
    }`,
    text: [
      `Ny ordre #${order.order_number}`,
      '',
      `By: ${order.city}`,
      `Henting: ${pickupDate}`,
      `Renser: ${cleanerName ?? 'ingen renser ennå'}`,
      '',
      `${baseUrl(options)}/admin/orders/${order.id}`,
      '',
    ].join('\n'),
  };
}

/**
 * «Ordre venter på tildeling» — sent to every admin when a cleaner declined
 * and the order could not be handed to another cleaner automatically.
 */
export function buildAdminOrderUnassignedEmail(
  order: OrderForStaffEmail,
  details: { declinedByName: string },
  options: CustomerEmailOptions
): StaffTextEmail {
  const pickupDate = formatLongDate(order.scheduled_date);
  const declinedBy = details.declinedByName.trim() || 'Renseren';
  const declineCount = (order.declined_by_cleaner_ids ?? []).length;

  return {
    subject: `Ordre #${order.order_number} venter på tildeling – ${order.city}, henting ${pickupDate}`,
    text: [
      `Ordre #${order.order_number} venter på tildeling`,
      '',
      `${declinedBy} avslo oppdraget, og ingen annen renser ble tildelt automatisk. Tildel en renser manuelt.`,
      '',
      `By: ${order.city}`,
      `Henting: ${pickupDate}`,
      `Antall rensere som har avslått: ${declineCount}`,
      '',
      `${baseUrl(options)}/admin/orders/${order.id}`,
      '',
    ].join('\n'),
  };
}
