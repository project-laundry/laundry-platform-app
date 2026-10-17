'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import { updateUserContact } from '@/lib/database/users';
import { getCustomerByUserId } from '@/lib/database/customers';
import {
  getActiveSubscriptionByCustomerId,
  updateSubscription,
} from '@/lib/database/subscriptions';
import { updateUpcomingOrdersAddressBySubscriptionId } from '@/lib/database/orders';
import { validateAddress } from '@/lib/maps/geocoding';
import { getCityFromPostalCode } from '@/lib/config/postal-codes';
import { validateNorwegianPhone, validatePostalCode } from '@/lib/validation/cleaner';
import type { SubscriptionOrderDefaults } from '@/types/database';

export interface SettingsActionResult {
  success: boolean;
  error?: string;
}

export interface CustomerContactInput {
  fullName: string;
  /** 8 digits without the +47 prefix — the form strips everything else. */
  phone: string;
}

/**
 * Update the signed-in customer's name and phone on their own users row.
 * The phone is always stored as +47 + 8 digits, exactly like signup does.
 */
export async function updateCustomerContactAction(
  input: CustomerContactInput
): Promise<SettingsActionResult> {
  try {
    const { auth, error: authError } = await assertRole(['customer']);
    if (authError || !auth) {
      return { success: false, error: authError ?? 'Ikke autentisert' };
    }

    const fullName = input.fullName.trim();
    if (fullName.length < 2) {
      return { success: false, error: 'Navn må ha minst 2 tegn' };
    }
    if (fullName.length > 100) {
      return { success: false, error: 'Navn kan ikke være mer enn 100 tegn' };
    }

    const digits = input.phone.replace(/\D/g, '');
    if (!validateNorwegianPhone(digits)) {
      return { success: false, error: 'Telefonnummer må være 8 siffer' };
    }
    const phone = `+47${digits}`;

    const { error } = await updateUserContact(auth.authUserId, {
      full_name: fullName,
      phone,
    });
    if (error) {
      return { success: false, error };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateCustomerContactAction:', error);
    return { success: false, error: 'En uventet feil oppstod. Vennligst prøv igjen.' };
  }
}

export interface SubscriptionAddressInput {
  street: string;
  postalCode: string;
  specialInstructions: string;
  /** Also copy the new address onto the not-yet-picked-up order(s). */
  applyToUpcomingOrder: boolean;
}

/**
 * Rewrite the active subscription's order_defaults.initial_address — the address
 * every future generated order is built from (see buildOrderData) — and
 * optionally copy it onto the current not-yet-picked-up order.
 *
 * Same-city only: location_city, default_cleaner_id and the current order's
 * cleaner are all bound to the service city, so a move to the other city is a
 * new subscription, not an address edit.
 */
export async function updateSubscriptionAddressAction(
  input: SubscriptionAddressInput
): Promise<SettingsActionResult> {
  try {
    const { auth, error: authError } = await assertRole(['customer']);
    if (authError || !auth) {
      return { success: false, error: authError ?? 'Ikke autentisert' };
    }

    const customer = await getCustomerByUserId(auth.authUserId);
    if (!customer) {
      return { success: false, error: 'Kundeprofil ikke funnet' };
    }

    // Resolved from the signed-in customer, never from a client-supplied id.
    const subscription = await getActiveSubscriptionByCustomerId(customer.id);
    const defaults = subscription?.order_defaults ?? null;
    if (!subscription || subscription.status !== 'active' || !defaults?.initial_address) {
      return { success: false, error: 'Du har ikke et aktivt abonnement' };
    }

    // Validation mirrors updateOrderAddressAction (app/orders/actions.ts).
    const street = input.street.trim();
    if (street.length < 3) {
      return { success: false, error: 'Gateadresse må være minst 3 tegn' };
    }
    if (street.length > 200) {
      return { success: false, error: 'Gateadresse kan ikke være mer enn 200 tegn' };
    }
    if (!validatePostalCode(input.postalCode)) {
      return { success: false, error: 'Postnummer må være 4 siffer' };
    }

    const city = getCityFromPostalCode(input.postalCode);
    if (!city) {
      return {
        success: false,
        error: 'Postnummeret er utenfor serviceområdet vårt (Bergen og Oslo).',
      };
    }
    if (city !== defaults.location_city) {
      return {
        success: false,
        error: `Abonnementet ditt gjelder ${defaults.location_city}. Flytter du til ${city}, må du kansellere abonnementet og bestille på nytt med den nye adressen.`,
      };
    }

    const specialInstructions = input.specialInstructions.trim();
    if (specialInstructions.length > 500) {
      return { success: false, error: 'Henteinstruksjoner kan ikke være mer enn 500 tegn' };
    }

    // Blocks typo'd / non-existent streets; fails open when Maps is unavailable.
    // The coordinates it returns are stored so future orders inherit them.
    const validation = await validateAddress({
      street,
      postal_code: input.postalCode,
      city,
      country: defaults.initial_address.country,
    });
    if (!validation.valid) {
      return {
        success: false,
        error:
          validation.reason === 'not_found'
            ? 'Vi fant ikke denne adressen. Sjekk gateadresse og postnummer.'
            : 'Vi klarte ikke å finne nøyaktig denne adressen. Dobbeltsjekk gateadressen.',
      };
    }

    const latitude = validation.coordinates?.latitude ?? null;
    const longitude = validation.coordinates?.longitude ?? null;

    const nextDefaults: SubscriptionOrderDefaults = {
      ...defaults,
      initial_address: {
        ...defaults.initial_address,
        street,
        postal_code: input.postalCode,
        city,
        special_instructions: specialInstructions || undefined,
        latitude,
        longitude,
      },
    };

    const updated = await updateSubscription(subscription.id, { order_defaults: nextDefaults });
    if (!updated) {
      return { success: false, error: 'Kunne ikke lagre adressen. Vennligst prøv igjen.' };
    }

    if (input.applyToUpcomingOrder === true) {
      const copied = await updateUpcomingOrdersAddressBySubscriptionId(subscription.id, {
        street,
        postal_code: input.postalCode,
        city,
        special_instructions_address: specialInstructions || null,
        latitude,
        longitude,
      });
      if (!copied) {
        return {
          success: false,
          error:
            'Adressen for abonnementet er lagret, men neste henting kunne ikke oppdateres. Endre den fra bestillingssiden.',
        };
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/subscription');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateSubscriptionAddressAction:', error);
    return { success: false, error: 'En uventet feil oppstod. Vennligst prøv igjen.' };
  }
}
