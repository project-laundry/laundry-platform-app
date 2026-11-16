'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId, updateCleanerProfile } from '@/lib/database/cleaners';
import { geocodeAddress } from '@/lib/maps/geocoding';
import { getCityFromPostalCode } from '@/lib/config/postal-codes';
import { EXPERIENCE_LEVEL_OPTIONS, MACHINE_CONDITION_OPTIONS } from '@/lib/config/cleaner-options';
import {
  hasAnyWeekday,
  normalizeWeeklySchedule,
  validateBankAccount,
  validatePostalCode,
  validateYear,
} from '@/lib/validation/cleaner';
import type {
  Cleaner,
  CleanerExperienceLevel,
  CleanerMachineCondition,
  WeeklySchedule,
} from '@/types/database';

export interface CleanerSettingsInput {
  displayName: string;
  experienceLevel: CleanerExperienceLevel;
  bankAccount: string;
  baseStreet: string;
  basePostalCode: string;
  machineBrand: string;
  machineCapacityKg: string;
  machineYear: string;
  machineCondition: CleanerMachineCondition | '';
  isAcceptingOrders: boolean;
  weeklySchedule: WeeklySchedule;
}

export interface UpdateCleanerSettingsResult {
  success: boolean;
  error?: string;
}

const EXPERIENCE_LEVELS = EXPERIENCE_LEVEL_OPTIONS.map((o) => o.value);
const MACHINE_CONDITIONS = MACHINE_CONDITION_OPTIONS.map((o) => o.value);

/**
 * Update the signed-in cleaner's editable profile settings.
 *
 * base_city is always derived from the postal code (never client-supplied),
 * exactly like createCleanerProfileAction. When the address changed, the new
 * address is re-geocoded and the stored coordinates are REPLACED — including
 * being nulled on geocoding failure, because the old coordinates describe the
 * old address and must not survive an address change.
 */
export async function updateCleanerSettingsAction(
  input: CleanerSettingsInput
): Promise<UpdateCleanerSettingsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Ikke autentisert' };
    }

    const cleaner = await getCleanerByUserId(user.id);
    if (!cleaner) {
      return { success: false, error: 'Renserprofil ikke funnet' };
    }

    // Validation mirrors the onboarding steps (services, equipment, profile).
    const displayName = input.displayName.trim();
    if (displayName.length < 2) {
      return { success: false, error: 'Visningsnavn må være minst 2 tegn' };
    }
    if (!EXPERIENCE_LEVELS.includes(input.experienceLevel)) {
      return { success: false, error: 'Ugyldig erfaringsnivå' };
    }
    const bankAccount = input.bankAccount.replace(/\s/g, '');
    if (!validateBankAccount(bankAccount)) {
      return { success: false, error: 'Kontonummer må være 11 siffer' };
    }
    const baseStreet = input.baseStreet.trim();
    if (baseStreet.length < 3) {
      return { success: false, error: 'Gateadresse må være minst 3 tegn' };
    }
    if (!validatePostalCode(input.basePostalCode)) {
      return { success: false, error: 'Postnummer må være 4 siffer' };
    }
    const baseCity = getCityFromPostalCode(input.basePostalCode);
    if (!baseCity) {
      return {
        success: false,
        error: 'Postnummeret er utenfor serviceområdet vårt (Bergen og Oslo).',
      };
    }
    const machineBrand = input.machineBrand.trim();
    if (!machineBrand) {
      return { success: false, error: 'Merke og modell er påkrevd' };
    }
    const machineCapacityKg = Number(input.machineCapacityKg);
    // Column is a smallint; the form caps entry at 2 digits like onboarding.
    if (!Number.isInteger(machineCapacityKg) || machineCapacityKg <= 0 || machineCapacityKg > 99) {
      return { success: false, error: 'Oppgi kapasiteten i hele kilo' };
    }
    if (!validateYear(input.machineYear)) {
      return { success: false, error: 'Oppgi et gyldig årstall (4 siffer)' };
    }
    if (!input.machineCondition || !MACHINE_CONDITIONS.includes(input.machineCondition)) {
      return { success: false, error: 'Velg tilstand' };
    }
    // Rebuild the schedule key-by-key so extra/missing client keys can't reach
    // the jsonb column, and require at least one day (same rule as onboarding).
    const weeklySchedule = normalizeWeeklySchedule(input.weeklySchedule);
    if (!hasAnyWeekday(weeklySchedule)) {
      return { success: false, error: 'Velg minst én dag du tar imot henting' };
    }

    const updates: Partial<Cleaner> = {
      display_name: displayName,
      experience_level: input.experienceLevel,
      bank_account: bankAccount,
      base_street: baseStreet,
      base_postal_code: input.basePostalCode,
      base_city: baseCity,
      machine_brand: machineBrand,
      machine_capacity_kg: machineCapacityKg,
      machine_year: Number(input.machineYear),
      machine_condition: input.machineCondition,
      is_accepting_orders: input.isAcceptingOrders === true,
      weekly_schedule: weeklySchedule,
    };

    const addressChanged =
      baseStreet !== cleaner.base_street ||
      input.basePostalCode !== cleaner.base_postal_code;

    if (addressChanged) {
      const coords = await geocodeAddress({
        street: baseStreet,
        postal_code: input.basePostalCode,
        city: baseCity,
        country: cleaner.base_country,
      });
      updates.latitude = coords?.latitude ?? null;
      updates.longitude = coords?.longitude ?? null;
    }

    const updated = await updateCleanerProfile(cleaner.id, updates);
    if (!updated) {
      return { success: false, error: 'Kunne ikke lagre endringene. Vennligst prøv igjen.' };
    }

    revalidatePath('/dashboard/cleaner');
    revalidatePath('/dashboard/cleaner/settings');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateCleanerSettingsAction:', error);
    return { success: false, error: 'En uventet feil oppstod. Vennligst prøv igjen.' };
  }
}
