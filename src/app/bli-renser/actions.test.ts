import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { CleanerOnboardingData } from '@/types/cleaner-flow';

const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/lib/database/cleaners', () => ({
  createCleaner: vi.fn(),
  getCleanerByUserId: vi.fn(),
}));
vi.mock('@/lib/maps/geocoding', () => ({ geocodeAddress: vi.fn() }));

import { createCleaner, getCleanerByUserId } from '@/lib/database/cleaners';
import { geocodeAddress } from '@/lib/maps/geocoding';
import { createCleanerProfileAction } from './actions';

const m = (fn: unknown) => fn as Mock;

const baseData: CleanerOnboardingData = {
  businessType: 'individual',
  taxId: '12345678901',
  bankAccount: '12345678901',
  baseStreet: 'Testveien 1',
  basePostalCode: '5803',
  // Deliberately wrong: the server must ignore this and derive from the postal code.
  baseCity: 'Rådal',
  baseCountry: 'Norway',
  machineBrand: 'Miele',
  machineCapacityKg: '8',
  machineYear: '2020',
  machineCondition: 'good',
  displayName: 'Test Renser',
  experienceLevel: 'some',
  termsAccepted: true,
  privacyAccepted: true,
  informationAccuracyConfirmed: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  m(getCleanerByUserId).mockResolvedValue(null); // no existing cleaner profile
  m(geocodeAddress).mockResolvedValue(null);
  m(createCleaner).mockResolvedValue({ data: { id: 'cl-1' }, error: null });
});

describe('createCleanerProfileAction', () => {
  it('rejects when not authenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createCleanerProfileAction(baseData);

    expect(result.success).toBe(false);
    expect(createCleaner).not.toHaveBeenCalled();
  });

  it('rejects a postal code outside the service area', async () => {
    const result = await createCleanerProfileAction({
      ...baseData,
      basePostalCode: '5401',
    });

    expect(result).toEqual({
      success: false,
      error: 'Postnummeret er utenfor serviceområdet vårt (Bergen og Oslo).',
    });
    expect(createCleaner).not.toHaveBeenCalled();
    expect(geocodeAddress).not.toHaveBeenCalled();
  });

  it('derives base_city from the postal code, ignoring the client-supplied city', async () => {
    const result = await createCleanerProfileAction(baseData);

    expect(result).toEqual({ success: true, cleanerId: 'cl-1' });
    expect(geocodeAddress).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Bergen' })
    );
    expect(createCleaner).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ base_city: 'Bergen' })
    );
  });

  it('strips formatting from the tax id and bank account before saving', async () => {
    const result = await createCleanerProfileAction({
      ...baseData,
      taxId: '123456 78901',
      bankAccount: '1234.56.78901',
    });

    expect(result.success).toBe(true);
    expect(createCleaner).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ tax_id: '12345678901', bank_account: '12345678901' })
    );
  });

  it('rejects a bank account that is not 11 digits', async () => {
    const result = await createCleanerProfileAction({
      ...baseData,
      bankAccount: '1234567890',
    });

    expect(result).toEqual({ success: false, error: 'Kontonummer må være 11 siffer' });
    expect(createCleaner).not.toHaveBeenCalled();
  });

  it('rejects a 9-digit tax id for an individual', async () => {
    const result = await createCleanerProfileAction({
      ...baseData,
      taxId: '123456789',
    });

    expect(result).toEqual({ success: false, error: 'Fødselsnummer må være 11 siffer' });
    expect(createCleaner).not.toHaveBeenCalled();
  });

  it('requires business name and address for a registered business', async () => {
    const result = await createCleanerProfileAction({
      ...baseData,
      businessType: 'business',
      taxId: '123456789',
      businessName: 'Vask AS',
      businessAddress: '',
    });

    expect(result.success).toBe(false);
    expect(createCleaner).not.toHaveBeenCalled();
  });

  it('stores the washing machine details as numbers and enum', async () => {
    await createCleanerProfileAction(baseData);

    expect(createCleaner).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        machine_brand: 'Miele',
        machine_capacity_kg: 8,
        machine_year: 2020,
        machine_condition: 'good',
      })
    );
  });

  it('rejects a non-integer machine capacity', async () => {
    const result = await createCleanerProfileAction({
      ...baseData,
      machineCapacityKg: '7.5',
    });

    expect(result.success).toBe(false);
    expect(createCleaner).not.toHaveBeenCalled();
  });

  it('stores the optional note to the driver, null when blank', async () => {
    await createCleanerProfileAction({ ...baseData, baseSpecialInstructions: '  2. etasje  ' });
    expect(createCleaner).toHaveBeenLastCalledWith(
      'user-1',
      expect.objectContaining({ base_special_instructions: '2. etasje' })
    );

    await createCleanerProfileAction({ ...baseData, baseSpecialInstructions: '   ' });
    expect(createCleaner).toHaveBeenLastCalledWith(
      'user-1',
      expect.objectContaining({ base_special_instructions: null })
    );
  });

  it('rejects when the user already has a cleaner profile', async () => {
    m(getCleanerByUserId).mockResolvedValue({ id: 'cl-existing' });

    const result = await createCleanerProfileAction(baseData);

    expect(result).toEqual({ success: false, error: 'Du har allerede en renserprofil' });
    expect(createCleaner).not.toHaveBeenCalled();
  });
});
