// Staff e-mail builders — pure (no I/O), unit tested. «Nytt oppdrag» to the
// cleaner uses the same block list and HTML wrapper as the customer e-mails
// (lib/email/customer-emails.ts); the admin alerts are plain text like
// the daily digest. Sending lives in lib/services/staff-emails.ts.
//
// The cleaner mail carries no customer name, phone or e-mail — the cleaner
// finds those on the order page behind the button.

import { PICKUP_TIME_RANGE } from '@/lib/config/pickup-times';
import type { OrderForStaffEmail } from '@/lib/database/orders';
import type { CleanerBusinessType } from '@/types/database';
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

/**
 * «Ny hentedato» — sent to the cleaner who keeps an order whose pickup date
 * was moved (by the customer on the reschedule page or by an admin). The
 * order passed in already carries the new date.
 */
export function buildCleanerPickupRescheduledEmail(
  order: OrderForStaffEmail,
  change: { previousPickupDate: string },
  options: CustomerEmailOptions
): CustomerEmail {
  const newDate = formatLongDate(order.scheduled_date);
  const firstName = order.cleaner?.user.full_name.trim().split(/\s+/)[0];
  const pickupNote = order.special_instructions_address?.trim() || null;

  const blocks: Block[] = [
    paragraph(firstName ? `Hei ${firstName}!` : 'Hei!'),
    paragraph(`Hentedatoen for ordre #${order.order_number} er endret.`),
    heading('Henting'),
    rows([
      { label: 'Ny dato', value: newDate, strong: true },
      { label: 'Tidligere dato', value: formatLongDate(change.previousPickupDate) },
      { label: 'Tid', value: `kl. ${PICKUP_TIME_RANGE.start}–${PICKUP_TIME_RANGE.end}` },
      { label: 'Adresse', value: `${order.street}, ${order.postal_code} ${order.city}` },
    ]),
  ];

  if (pickupNote) {
    blocks.push(paragraph(`Henteinstruksjoner: ${pickupNote}`));
  }

  blocks.push(
    paragraph('Passer ikke den nye datoen? Avslå oppdraget på oppdragssiden så snart som mulig.'),
    button('Åpne oppdraget', `${baseUrl(options)}/dashboard/cleaner/${order.id}`),
    closing()
  );

  return finish(
    `Ny hentedato – ${newDate} (ordre #${order.order_number})`,
    'Ny hentedato',
    blocks,
    options
  );
}

/**
 * «Oppdraget er flyttet» — sent to the cleaner who LOSES an order because the
 * pickup was moved to a weekday they do not work. Carries no address and no
 * customer details: the order is no longer theirs.
 */
export function buildCleanerOrderMovedEmail(
  details: { orderNumber: string; previousPickupDate: string; cleanerFullName: string },
  options: CustomerEmailOptions
): CustomerEmail {
  const firstName = details.cleanerFullName.trim().split(/\s+/)[0];

  const blocks: Block[] = [
    paragraph(firstName ? `Hei ${firstName}!` : 'Hei!'),
    paragraph(
      `Hentedatoen for ordre #${details.orderNumber} er endret til en dag som ikke er en av hentedagene dine. Oppdraget er derfor ikke lenger ditt.`
    ),
    paragraph(
      `Du skal ikke hente tøyet ${formatLongDate(details.previousPickupDate)}, og du trenger ikke gjøre noe.`
    ),
    button('Åpne oversikten', `${baseUrl(options)}/dashboard/cleaner`),
    closing(),
  ];

  return finish(
    `Ordre #${details.orderNumber} er ikke lenger ditt oppdrag`,
    'Oppdraget er flyttet',
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

/** What «Ny renser venter på godkjenning» needs — deliberately no tax id, bank account or contact details. */
export interface NewCleanerForAdminEmail {
  id: string;
  display_name: string;
  full_name: string;
  base_city: string;
  business_type: CleanerBusinessType;
}

/**
 * «Ny renser venter på godkjenning» — sent to every admin when a cleaner has
 * finished onboarding and the profile waits for approval.
 */
export function buildAdminNewCleanerEmail(
  cleaner: NewCleanerForAdminEmail,
  options: CustomerEmailOptions
): StaffTextEmail {
  const displayName = cleaner.display_name.trim();

  return {
    subject: `Ny renser venter på godkjenning – ${displayName}, ${cleaner.base_city}`,
    text: [
      'Ny renser venter på godkjenning',
      '',
      `${displayName} har fullført registreringen. Se gjennom opplysningene og godkjenn eller avslå.`,
      '',
      `Visningsnavn: ${displayName}`,
      `Navn: ${cleaner.full_name.trim() || 'ikke oppgitt'}`,
      `By: ${cleaner.base_city}`,
      `Type: ${cleaner.business_type === 'business' ? 'Registrert virksomhet' : 'Privatperson'}`,
      '',
      `${baseUrl(options)}/admin/cleaners/${cleaner.id}`,
      '',
    ].join('\n'),
  };
}
