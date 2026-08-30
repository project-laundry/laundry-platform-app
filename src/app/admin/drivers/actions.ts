'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import { createStaffAccount, deleteStaffAccount } from '@/lib/services/staff-accounts';
import {
  createDriverProfile,
  updateDriverProfile,
  getDriverWithUserById,
  type DriverProfileData,
} from '@/lib/database/drivers';
import { updateUserContact } from '@/lib/database/users';
import { geocodeAddress } from '@/lib/maps/geocoding';
import { validateNorwegianPhone, validatePostalCode } from '@/lib/validation/cleaner';

export interface DriverFormInput {
  full_name: string;
  email: string; // ignored on update
  phone: string;
  password: string; // ignored on update
  city: 'Bergen' | 'Oslo';
  /** Optional start point. Blank street+postal = none (create) / keep stored (update). */
  start_street: string;
  start_postal_code: string;
  start_label: string;
  /** Update only: clear the stored start point (dashboard falls back to city centre). */
  remove_start_point?: boolean;
}

export interface StaffActionResult {
  success: boolean;
  error?: string;
}

function validateCommonFields(input: {
  full_name: string;
  phone: string;
  city: string;
}): string | null {
  if (input.full_name.trim().length < 2) return 'Navn må ha minst 2 tegn';
  if (!validateNorwegianPhone(input.phone)) return 'Ugyldig telefonnummer (8 sifre, evt. +47)';
  if (input.city !== 'Bergen' && input.city !== 'Oslo') return 'Ugyldig by';
  return null;
}

type StartPoint = Pick<DriverProfileData, 'start_latitude' | 'start_longitude' | 'start_label'>;

/**
 * Geocode the optional start point. A geocoding failure is NOT an error:
 * the start point is simply unset and the driver dashboard falls back to
 * the city centre (same graceful degradation as checkout/onboarding).
 */
async function resolveStartPoint(
  input: Pick<DriverFormInput, 'start_street' | 'start_postal_code' | 'start_label' | 'city'>
): Promise<{ point: StartPoint } | { error: string }> {
  const street = input.start_street.trim();
  const postal = input.start_postal_code.trim();

  if (!street && !postal) {
    return { point: { start_latitude: null, start_longitude: null, start_label: null } };
  }

  if (!street || !validatePostalCode(postal)) {
    return { error: 'Startpunkt: oppgi både gateadresse og gyldig postnummer (4 sifre)' };
  }

  const coords = await geocodeAddress({
    street,
    postal_code: postal,
    city: input.city,
    country: 'Norway',
  });

  if (!coords) {
    return { point: { start_latitude: null, start_longitude: null, start_label: null } };
  }

  return {
    point: {
      start_latitude: coords.latitude,
      start_longitude: coords.longitude,
      start_label: input.start_label.trim() || street,
    },
  };
}

/**
 * Create a driver: auth user + role flip (staff-accounts service) + driver
 * profile row. Rolls the whole account back if the profile insert fails.
 */
export async function createDriverAction(input: DriverFormInput): Promise<StaffActionResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const validationError = validateCommonFields(input);
  if (validationError) return { success: false, error: validationError };
  if (!input.email.trim()) return { success: false, error: 'E-post er påkrevd' };
  if (input.password.length < 8) return { success: false, error: 'Passordet må ha minst 8 tegn' };

  const startPoint = await resolveStartPoint(input);
  if ('error' in startPoint) return { success: false, error: startPoint.error };

  const { userId, error } = await createStaffAccount({
    full_name: input.full_name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    password: input.password,
    role: 'driver',
  });
  if (error || !userId) {
    return { success: false, error: error || 'Kunne ikke opprette brukeren' };
  }

  const driver = await createDriverProfile(userId, {
    city: input.city,
    ...startPoint.point,
  });
  if (!driver) {
    await deleteStaffAccount(userId);
    return { success: false, error: 'Kunne ikke opprette sjåførprofilen — prøv igjen' };
  }

  revalidatePath('/admin/drivers');
  return { success: true };
}

/**
 * Update a driver's contact info, city, and start point. Blank start-address
 * fields keep the stored start point (only coords + label are stored, never
 * the address); remove_start_point clears it.
 */
export async function updateDriverAction(
  driverId: string,
  input: DriverFormInput
): Promise<StaffActionResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const driver = await getDriverWithUserById(driverId);
  if (!driver) return { success: false, error: 'Sjåføren ble ikke funnet' };

  const validationError = validateCommonFields(input);
  if (validationError) return { success: false, error: validationError };

  const { error: contactError } = await updateUserContact(driver.user_id, {
    full_name: input.full_name.trim(),
    phone: input.phone.trim(),
  });
  if (contactError) return { success: false, error: contactError };

  const profileUpdates: Partial<DriverProfileData> = { city: input.city };

  if (input.remove_start_point) {
    profileUpdates.start_latitude = null;
    profileUpdates.start_longitude = null;
    profileUpdates.start_label = null;
  } else if (input.start_street.trim() || input.start_postal_code.trim()) {
    const startPoint = await resolveStartPoint(input);
    if ('error' in startPoint) return { success: false, error: startPoint.error };
    Object.assign(profileUpdates, startPoint.point);
  }

  const updated = await updateDriverProfile(driverId, profileUpdates);
  if (!updated) return { success: false, error: 'Kunne ikke oppdatere sjåføren' };

  revalidatePath('/admin/drivers');
  return { success: true };
}
