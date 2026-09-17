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
  isTaxIdTaken: vi.fn(),
}));
vi.mock('@/lib/maps/geocoding', () => ({ geocodeAddress: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ assertRole: vi.fn() }));
vi.mock('@/lib/ai/machine-recognition', () => ({
  MAX_IMAGE_BASE64_LENGTH: 900_000,
  recognizeWashingMachine: vi.fn(),
}));

import { createCleaner, getCleanerByUserId, isTaxIdTaken } from '@/lib/database/cleaners';
import { geocodeAddress } from '@/lib/maps/geocoding';
import { assertRole } from '@/lib/auth/require-role';
import { recognizeWashingMachine } from '@/lib/ai/machine-recognition';
import {
  checkTaxIdAvailabilityAction,
  createCleanerProfileAction,
  recognizeMachineAction,
} from './actions';

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
  m(isTaxIdTaken).mockResolvedValue(false);
  m(geocodeAddress).mockResolvedValue(null);
  m(createCleaner).mockResolvedValue({ data: { id: 'cl-1' }, error: null });
  m(assertRole).mockResolvedValue({
    auth: { authUserId: 'user-1', dbUser: { id: 'user-1', role: 'cleaner' } },
    error: null,
  });
  m(recognizeWashingMachine).mockResolvedValue({ status: 'unavailable' });
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

  it('rejects a tax id that is already on another cleaner, before geocoding', async () => {
    m(isTaxIdTaken).mockResolvedValue(true);

    const result = await createCleanerProfileAction(baseData);

    expect(result).toEqual({
      success: false,
      error:
        'Fødselsnummeret er allerede registrert på en annen renserkonto. Ta kontakt med oss hvis du mener dette er feil.',
    });
    expect(isTaxIdTaken).toHaveBeenCalledWith('12345678901');
    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(createCleaner).not.toHaveBeenCalled();
  });

  it('uses the organisasjonsnummer wording for a business', async () => {
    m(isTaxIdTaken).mockResolvedValue(true);

    const result = await createCleanerProfileAction({
      ...baseData,
      businessType: 'business',
      taxId: '123456789',
      businessName: 'Vask AS',
      businessAddress: 'Vaskeveien 1, 0150 Oslo',
    });

    expect(result).toEqual({
      success: false,
      error:
        'Organisasjonsnummeret er allerede registrert på en annen renserkonto. Ta kontakt med oss hvis du mener dette er feil.',
    });
    expect(createCleaner).not.toHaveBeenCalled();
  });

  it('maps a unique violation from the insert to the tax id message', async () => {
    m(createCleaner).mockResolvedValue({
      data: null,
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "cleaners_tax_id_key"',
      },
    });

    const result = await createCleanerProfileAction(baseData);

    expect(result).toEqual({
      success: false,
      error:
        'Fødselsnummeret er allerede registrert på en annen renserkonto. Ta kontakt med oss hvis du mener dette er feil.',
    });
  });

  it('keeps the generic message for other insert errors', async () => {
    m(createCleaner).mockResolvedValue({
      data: null,
      error: { code: '23514', message: 'check constraint violated' },
    });

    const result = await createCleanerProfileAction(baseData);

    expect(result).toEqual({
      success: false,
      error: 'Kunne ikke opprette renserprofil. Vennligst prøv igjen.',
    });
  });
});

describe('checkTaxIdAvailabilityAction', () => {
  it('normalises the tax id to digits and reports what the lookup says', async () => {
    m(isTaxIdTaken).mockResolvedValue(true);

    const result = await checkTaxIdAvailabilityAction({
      taxId: '123456 78901',
      businessType: 'individual',
    });

    expect(result).toEqual({ taken: true });
    expect(isTaxIdTaken).toHaveBeenCalledWith('12345678901');
  });

  it('reports not taken when the lookup finds nothing', async () => {
    const result = await checkTaxIdAvailabilityAction({
      taxId: '12345678901',
      businessType: 'individual',
    });

    expect(result).toEqual({ taken: false });
    expect(isTaxIdTaken).toHaveBeenCalledWith('12345678901');
  });

  it('skips the lookup when the caller is not a cleaner', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await checkTaxIdAvailabilityAction({
      taxId: '12345678901',
      businessType: 'individual',
    });

    expect(result).toEqual({ taken: false });
    expect(isTaxIdTaken).not.toHaveBeenCalled();
  });

  it('skips the lookup when the tax id has the wrong length for the business type', async () => {
    const result = await checkTaxIdAvailabilityAction({
      taxId: '12345678901',
      businessType: 'business',
    });

    expect(result).toEqual({ taken: false });
    expect(isTaxIdTaken).not.toHaveBeenCalled();
  });
});

describe('recognizeMachineAction', () => {
  const VALID_INPUT = { imageBase64: 'aGVsbG8=', mediaType: 'image/jpeg' as const };

  it('passes a valid payload to the recognition service and returns its result', async () => {
    m(recognizeWashingMachine).mockResolvedValue({
      status: 'ok',
      suggestion: { brandModel: 'Bosch Serie 6', capacityKg: 9, year: null, condition: 'good' },
    });

    const result = await recognizeMachineAction(VALID_INPUT);

    expect(result).toEqual({
      status: 'ok',
      suggestion: { brandModel: 'Bosch Serie 6', capacityKg: 9, year: null, condition: 'good' },
    });
    expect(recognizeWashingMachine).toHaveBeenCalledWith({ data: 'aGVsbG8=', mediaType: 'image/jpeg' });
  });

  it('skips the service when the caller is not a cleaner', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await recognizeMachineAction(VALID_INPUT);

    expect(result).toEqual({ status: 'unavailable' });
    expect(recognizeWashingMachine).not.toHaveBeenCalled();
  });

  it('rejects a data-URL prefixed or otherwise non-base64 payload', async () => {
    const result = await recognizeMachineAction({
      ...VALID_INPUT,
      imageBase64: 'data:image/jpeg;base64,aGVsbG8=',
    });

    expect(result).toEqual({ status: 'unavailable' });
    expect(recognizeWashingMachine).not.toHaveBeenCalled();
  });

  it('rejects an empty or oversized payload', async () => {
    expect(await recognizeMachineAction({ ...VALID_INPUT, imageBase64: '' })).toEqual({
      status: 'unavailable',
    });
    expect(
      await recognizeMachineAction({ ...VALID_INPUT, imageBase64: 'a'.repeat(900_001) })
    ).toEqual({ status: 'unavailable' });
    expect(recognizeWashingMachine).not.toHaveBeenCalled();
  });

  it('rejects an unsupported media type', async () => {
    const result = await recognizeMachineAction({
      imageBase64: 'aGVsbG8=',
      mediaType: 'image/heic' as unknown as 'image/jpeg',
    });

    expect(result).toEqual({ status: 'unavailable' });
    expect(recognizeWashingMachine).not.toHaveBeenCalled();
  });
});
