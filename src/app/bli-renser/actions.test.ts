import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { CleanerOnboardingData } from '@/types/cleaner-flow';

const getUser = vi.fn();
const single = vi.fn();
const eq = vi.fn(() => ({ single }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser }, from })),
}));
vi.mock('@/lib/database/cleaners', () => ({ createCleaner: vi.fn() }));
vi.mock('@/lib/maps/geocoding', () => ({ geocodeAddress: vi.fn() }));

import { createCleaner } from '@/lib/database/cleaners';
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
  specializations: [],
  languages: ['no'],
  termsAccepted: true,
  privacyAccepted: true,
  informationAccuracyConfirmed: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  single.mockResolvedValue({ data: null, error: null }); // no existing cleaner profile
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
});
