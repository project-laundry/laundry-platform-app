// Server-side checks for the checkout input (createSubscriptionAction).
// The order flow validates the same things in the browser, but the values are
// stored and only turned into an order by the Vipps webhook AFTER the customer
// has approved — a bad postal code or date there fails order creation on every
// webhook retry. So nothing unchecked may reach the agreement.

import { getCityFromPostalCode, isValidPostalCodeFormat, serviceAreaText } from '@/lib/config/postal-codes';
import { earliestPickupDate } from '@/lib/config/order-timing';
import { daysBetweenISODates } from '@/lib/utils/date';
import { deliveryInputError } from '@/lib/config/delivery';

/** The date chips offer about two weeks; anything far beyond that is a stale
 *  or tampered value. */
export const MAX_DAYS_AHEAD = 60;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface CheckoutAddressInput {
  location: string;
  firstPickupDate: string;
  pickupAddress: {
    street: string;
    postalCode: string;
    specialInstructions?: string;
  };
  deliveryIfAbsent: string;
  deliveryInstructions?: string;
}

/**
 * Returns a Norwegian, customer-facing error, or null when the input is fine.
 * `todayISO` is today's date in Norway (todayInOslo()).
 */
export function validateCheckoutInput(
  input: CheckoutAddressInput,
  todayISO: string,
  now: Date = new Date()
): string | null {
  if (input.location !== 'Bergen' && input.location !== 'Oslo') {
    return `Vi henter foreløpig bare i ${serviceAreaText()}`;
  }

  const street = typeof input.pickupAddress?.street === 'string' ? input.pickupAddress.street.trim() : '';
  if (street.length < 3) return 'Gateadresse må være minst 3 tegn';
  if (street.length > 200) return 'Gateadresse kan ikke være mer enn 200 tegn';

  const postalCode = input.pickupAddress.postalCode;
  if (typeof postalCode !== 'string' || !isValidPostalCodeFormat(postalCode)) {
    return 'Postnummer må være 4 siffer';
  }
  if (getCityFromPostalCode(postalCode) !== input.location) {
    return 'Postnummeret ligger utenfor området vi henter i';
  }

  const instructions = input.pickupAddress.specialInstructions;
  if (instructions != null && (typeof instructions !== 'string' || instructions.length > 500)) {
    return 'Hentedetaljer kan ikke være mer enn 500 tegn';
  }

  const deliveryError = deliveryInputError(input.deliveryIfAbsent, input.deliveryInstructions);
  if (deliveryError) return deliveryError;

  const date = input.firstPickupDate;
  if (
    typeof date !== 'string' ||
    !ISO_DATE_RE.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  ) {
    return 'Velg en hentedato';
  }
  // ISO dates compare correctly as strings.
  if (date < earliestPickupDate(now) || daysBetweenISODates(todayISO, date) > MAX_DAYS_AHEAD) {
    return 'Hentedatoen er ikke lenger tilgjengelig. Velg en ny dato.';
  }

  return null;
}
