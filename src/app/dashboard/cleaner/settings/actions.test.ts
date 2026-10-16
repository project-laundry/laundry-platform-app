import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/lib/database/cleaners', () => ({
  getCleanerByUserId: vi.fn(),
  updateCleanerProfile: vi.fn(),
}));
vi.mock('@/lib/maps/geocoding', () => ({ geocodeAddress: vi.fn() }));

import { getCleanerByUserId, updateCleanerProfile } from '@/lib/database/cleaners';
import { geocodeAddress } from '@/lib/maps/geocoding';
import { updateCleanerSettingsAction, type CleanerSettingsInput } from './actions';

const m = (fn: unknown) => fn as Mock;

const existingCleaner = {
  id: 'cl-1',
  base_street: 'Gamleveien 2',
  base_postal_code: '5803',
  base_city: 'Bergen',
  base_country: 'Norway',
};

const baseInput: CleanerSettingsInput = {
  displayName: 'Test Renser',
  experienceLevel: 'some',
  bankAccount: '1234 56 78901',
  baseStreet: 'Gamleveien 2',
  basePostalCode: '5803',
  machineBrand: 'Miele',
  machineCapacityKg: '8',
  machineYear: '2020',
  machineCondition: 'good',
  isAcceptingOrders: true,
  weeklySchedule: {
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  m(getCleanerByUserId).mockResolvedValue(existingCleaner);
  m(geocodeAddress).mockResolvedValue(null);
  m(updateCleanerProfile).mockResolvedValue({ id: 'cl-1' });
});

describe('updateCleanerSettingsAction', () => {
  it('rejects when not authenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await updateCleanerSettingsAction(baseInput);

    expect(result.success).toBe(false);
    expect(updateCleanerProfile).not.toHaveBeenCalled();
  });

  it('rejects when the user has no cleaner profile', async () => {
    m(getCleanerByUserId).mockResolvedValue(null);

    const result = await updateCleanerSettingsAction(baseInput);

    expect(result.success).toBe(false);
    expect(updateCleanerProfile).not.toHaveBeenCalled();
  });

  it('rejects an invalid bank account', async () => {
    const result = await updateCleanerSettingsAction({
      ...baseInput,
      bankAccount: '123',
    });

    expect(result).toEqual({ success: false, error: 'Kontonummer må være 11 siffer' });
    expect(updateCleanerProfile).not.toHaveBeenCalled();
  });

  it('rejects a non-integer machine capacity', async () => {
    const result = await updateCleanerSettingsAction({
      ...baseInput,
      machineCapacityKg: '7.5',
    });

    expect(result).toEqual({ success: false, error: 'Oppgi kapasiteten i hele kilo' });
    expect(updateCleanerProfile).not.toHaveBeenCalled();
  });

  it('rejects a schedule with no available days', async () => {
    const result = await updateCleanerSettingsAction({
      ...baseInput,
      weeklySchedule: {
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false,
        sun: false,
      },
    });

    expect(result).toEqual({
      success: false,
      error: 'Velg minst én dag du tar imot henting',
    });
    expect(updateCleanerProfile).not.toHaveBeenCalled();
  });

  it('rejects a postal code outside the service area', async () => {
    const result = await updateCleanerSettingsAction({
      ...baseInput,
      basePostalCode: '5401',
    });

    expect(result).toEqual({
      success: false,
      error: 'Postnummeret er utenfor serviceområdet vårt (Bergen og Oslo).',
    });
    expect(updateCleanerProfile).not.toHaveBeenCalled();
    expect(geocodeAddress).not.toHaveBeenCalled();
  });

  it('saves without geocoding when the address is unchanged', async () => {
    const result = await updateCleanerSettingsAction(baseInput);

    expect(result).toEqual({ success: true });
    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(updateCleanerProfile).toHaveBeenCalledWith(
      'cl-1',
      expect.objectContaining({
        display_name: 'Test Renser',
        bank_account: '12345678901',
        base_city: 'Bergen',
        machine_capacity_kg: 8,
        machine_year: 2020,
        is_accepting_orders: true,
        weekly_schedule: {
          mon: true,
          tue: true,
          wed: true,
          thu: true,
          fri: true,
          sat: false,
          sun: false,
        },
      })
    );
    const updates = m(updateCleanerProfile).mock.calls[0][1];
    expect('latitude' in updates).toBe(false);
  });

  it('re-geocodes and derives the new city when the address changes', async () => {
    m(geocodeAddress).mockResolvedValue({ latitude: 59.91, longitude: 10.75 });

    const result = await updateCleanerSettingsAction({
      ...baseInput,
      baseStreet: 'Osloveien 1',
      basePostalCode: '0150',
    });

    expect(result).toEqual({ success: true });
    expect(geocodeAddress).toHaveBeenCalledWith({
      street: 'Osloveien 1',
      postal_code: '0150',
      city: 'Oslo',
      country: 'Norway',
    });
    expect(updateCleanerProfile).toHaveBeenCalledWith(
      'cl-1',
      expect.objectContaining({
        base_city: 'Oslo',
        latitude: 59.91,
        longitude: 10.75,
      })
    );
  });

  it('nulls coordinates when the changed address fails to geocode', async () => {
    m(geocodeAddress).mockResolvedValue(null);

    const result = await updateCleanerSettingsAction({
      ...baseInput,
      baseStreet: 'Nyveien 9',
    });

    expect(result).toEqual({ success: true });
    expect(updateCleanerProfile).toHaveBeenCalledWith(
      'cl-1',
      expect.objectContaining({ latitude: null, longitude: null })
    );
  });
});
