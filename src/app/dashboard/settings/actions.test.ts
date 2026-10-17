import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ assertRole: vi.fn() }));
vi.mock('@/lib/database/users', () => ({ updateUserContact: vi.fn() }));
vi.mock('@/lib/database/customers', () => ({ getCustomerByUserId: vi.fn() }));
vi.mock('@/lib/database/subscriptions', () => ({
  getActiveSubscriptionByCustomerId: vi.fn(),
  updateSubscription: vi.fn(),
}));
vi.mock('@/lib/database/orders', () => ({
  updateUpcomingOrdersAddressBySubscriptionId: vi.fn(),
}));
vi.mock('@/lib/maps/geocoding', () => ({ validateAddress: vi.fn() }));

import { assertRole } from '@/lib/auth/require-role';
import { updateUserContact } from '@/lib/database/users';
import { getCustomerByUserId } from '@/lib/database/customers';
import {
  getActiveSubscriptionByCustomerId,
  updateSubscription,
} from '@/lib/database/subscriptions';
import { updateUpcomingOrdersAddressBySubscriptionId } from '@/lib/database/orders';
import { validateAddress } from '@/lib/maps/geocoding';
import {
  updateCustomerContactAction,
  updateSubscriptionAddressAction,
  type SubscriptionAddressInput,
} from './actions';

const m = (fn: unknown) => fn as Mock;

const ACTIVE_SUBSCRIPTION = {
  id: 'sub-1',
  customer_id: 'cust-1',
  status: 'active',
  order_defaults: {
    initial_address: {
      street: 'Bryggen 15',
      postal_code: '5003',
      city: 'Bergen',
      country: 'Norway',
      special_instructions: 'Ring på',
      latitude: 60.39,
      longitude: 5.32,
    },
    location_city: 'Bergen',
    default_needs_ironing: false,
    default_cleaner_id: 'cl-1',
    first_pickup_date: '2026-11-02',
  },
};

const ADDRESS_INPUT: SubscriptionAddressInput = {
  street: 'Strandgaten 1',
  postalCode: '5013',
  specialInstructions: 'Portkode 1234',
  applyToUpcomingOrder: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  m(assertRole).mockResolvedValue({
    auth: { authUserId: 'user-1', dbUser: { id: 'user-1', role: 'customer' } },
    error: null,
  });
  m(updateUserContact).mockResolvedValue({ data: {}, error: null });
  m(getCustomerByUserId).mockResolvedValue({ id: 'cust-1' });
  m(getActiveSubscriptionByCustomerId).mockResolvedValue(ACTIVE_SUBSCRIPTION);
  m(validateAddress).mockResolvedValue({
    valid: true,
    coordinates: { latitude: 60.4, longitude: 5.33 },
  });
  m(updateSubscription).mockResolvedValue({ id: 'sub-1' });
  m(updateUpcomingOrdersAddressBySubscriptionId).mockResolvedValue(true);
});

describe('updateCustomerContactAction', () => {
  it('rejects when the caller is not a customer', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await updateCustomerContactAction({ fullName: 'Ola Nordmann', phone: '99887766' });

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(updateUserContact).not.toHaveBeenCalled();
  });

  it('rejects a name shorter than 2 characters', async () => {
    const result = await updateCustomerContactAction({ fullName: ' O ', phone: '99887766' });

    expect(result).toEqual({ success: false, error: 'Navn må ha minst 2 tegn' });
    expect(updateUserContact).not.toHaveBeenCalled();
  });

  it('rejects a phone that is not 8 digits', async () => {
    const result = await updateCustomerContactAction({ fullName: 'Ola Nordmann', phone: '1234567' });

    expect(result).toEqual({ success: false, error: 'Telefonnummer må være 8 siffer' });
    expect(updateUserContact).not.toHaveBeenCalled();
  });

  it('saves the trimmed name and the phone with a +47 prefix on the caller\'s own row', async () => {
    const result = await updateCustomerContactAction({
      fullName: '  Ola Nordmann ',
      phone: '998 87 766',
    });

    expect(result).toEqual({ success: true });
    expect(updateUserContact).toHaveBeenCalledWith('user-1', {
      full_name: 'Ola Nordmann',
      phone: '+4799887766',
    });
  });

  it('propagates a phone-conflict error from updateUserContact', async () => {
    m(updateUserContact).mockResolvedValue({
      data: null,
      error: 'Telefonnummeret er allerede i bruk',
    });

    const result = await updateCustomerContactAction({ fullName: 'Ola Nordmann', phone: '99887766' });

    expect(result).toEqual({ success: false, error: 'Telefonnummeret er allerede i bruk' });
  });
});

describe('updateSubscriptionAddressAction', () => {
  it('rejects when the caller is not a customer', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ikke autentisert' });

    const result = await updateSubscriptionAddressAction(ADDRESS_INPUT);

    expect(result).toEqual({ success: false, error: 'Ikke autentisert' });
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it('rejects when there is no subscription', async () => {
    m(getActiveSubscriptionByCustomerId).mockResolvedValue(null);

    const result = await updateSubscriptionAddressAction(ADDRESS_INPUT);

    expect(result).toEqual({ success: false, error: 'Du har ikke et aktivt abonnement' });
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it('rejects a pending_payment subscription', async () => {
    m(getActiveSubscriptionByCustomerId).mockResolvedValue({
      ...ACTIVE_SUBSCRIPTION,
      status: 'pending_payment',
    });

    const result = await updateSubscriptionAddressAction(ADDRESS_INPUT);

    expect(result).toEqual({ success: false, error: 'Du har ikke et aktivt abonnement' });
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it('rejects a postal code outside the service area without calling Maps', async () => {
    const result = await updateSubscriptionAddressAction({ ...ADDRESS_INPUT, postalCode: '5401' });

    expect(result).toEqual({
      success: false,
      error: 'Postnummeret er utenfor serviceområdet vårt (Bergen og Oslo).',
    });
    expect(validateAddress).not.toHaveBeenCalled();
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it('rejects a postal code in the other service city without calling Maps', async () => {
    const result = await updateSubscriptionAddressAction({ ...ADDRESS_INPUT, postalCode: '0150' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Abonnementet ditt gjelder Bergen');
    expect(result.error).toContain('Oslo');
    expect(validateAddress).not.toHaveBeenCalled();
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it('rejects an address Maps cannot find', async () => {
    m(validateAddress).mockResolvedValue({ valid: false, reason: 'not_found' });

    const result = await updateSubscriptionAddressAction(ADDRESS_INPUT);

    expect(result).toEqual({
      success: false,
      error: 'Vi fant ikke denne adressen. Sjekk gateadresse og postnummer.',
    });
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it('validates with the existing country and rewrites initial_address, keeping the other defaults', async () => {
    const result = await updateSubscriptionAddressAction(ADDRESS_INPUT);

    expect(result).toEqual({ success: true });
    expect(validateAddress).toHaveBeenCalledWith({
      street: 'Strandgaten 1',
      postal_code: '5013',
      city: 'Bergen',
      country: 'Norway',
    });
    expect(updateSubscription).toHaveBeenCalledWith('sub-1', {
      order_defaults: {
        ...ACTIVE_SUBSCRIPTION.order_defaults,
        initial_address: {
          street: 'Strandgaten 1',
          postal_code: '5013',
          city: 'Bergen',
          country: 'Norway',
          special_instructions: 'Portkode 1234',
          latitude: 60.4,
          longitude: 5.33,
        },
      },
    });
  });

  it('copies the new address onto the not-yet-picked-up orders when asked', async () => {
    await updateSubscriptionAddressAction(ADDRESS_INPUT);

    expect(updateUpcomingOrdersAddressBySubscriptionId).toHaveBeenCalledWith('sub-1', {
      street: 'Strandgaten 1',
      postal_code: '5013',
      city: 'Bergen',
      special_instructions_address: 'Portkode 1234',
      latitude: 60.4,
      longitude: 5.33,
    });
  });

  it('leaves existing orders alone when applyToUpcomingOrder is false', async () => {
    const result = await updateSubscriptionAddressAction({
      ...ADDRESS_INPUT,
      applyToUpcomingOrder: false,
    });

    expect(result).toEqual({ success: true });
    expect(updateUpcomingOrdersAddressBySubscriptionId).not.toHaveBeenCalled();
  });

  it('drops the instructions key and nulls the order column when instructions are blank', async () => {
    await updateSubscriptionAddressAction({ ...ADDRESS_INPUT, specialInstructions: '   ' });

    const updates = m(updateSubscription).mock.calls[0][1];
    expect(updates.order_defaults.initial_address.special_instructions).toBeUndefined();
    expect(updateUpcomingOrdersAddressBySubscriptionId).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({ special_instructions_address: null })
    );
  });

  it('stores null coordinates when address validation was skipped', async () => {
    m(validateAddress).mockResolvedValue({ valid: true, skipped: true });

    const result = await updateSubscriptionAddressAction(ADDRESS_INPUT);

    expect(result).toEqual({ success: true });
    const updates = m(updateSubscription).mock.calls[0][1];
    expect(updates.order_defaults.initial_address.latitude).toBeNull();
    expect(updates.order_defaults.initial_address.longitude).toBeNull();
  });

  it('reports a partial failure when the order copy fails after the subscription was saved', async () => {
    m(updateUpcomingOrdersAddressBySubscriptionId).mockResolvedValue(false);

    const result = await updateSubscriptionAddressAction(ADDRESS_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Adressen for abonnementet er lagret');
    expect(updateSubscription).toHaveBeenCalledTimes(1);
  });
});
