"use server";

import { createClient } from "@/lib/supabase/server";
import { createCleaner, getCleanerByUserId } from "@/lib/database/cleaners";
import { geocodeAddress } from "@/lib/maps/geocoding";
import { getCityFromPostalCode } from "@/lib/config/postal-codes";
import {
  validateBankAccount,
  validateTaxId,
  validateYear,
} from "@/lib/validation/cleaner";
import type { CleanerOnboardingData } from "@/types/cleaner-flow";

export interface CreateCleanerProfileResult {
  success: boolean;
  error?: string;
  cleanerId?: string;
}

const digitsOnly = (value: string) => value.replace(/\D/g, "");

/**
 * Create a new cleaner profile
 * Called from the confirmation page after user accepts terms
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Validate + normalise the submitted data (never trust the client)
 * 3. Check if user already has a cleaner profile
 * 4. Geocode the base address, create the cleaner record
 *
 * Note: User role is set to 'cleaner' during signup via the handle_new_user() trigger,
 * which reads the role from auth metadata. No role update is needed here.
 */
export async function createCleanerProfileAction(
  data: CleanerOnboardingData,
): Promise<CreateCleanerProfileResult> {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Du må være innlogget for å opprette en renserprofil",
      };
    }

    // 2. Validate + normalise. The DB rejects non-digit bank accounts
    //    (cleaners_bank_account_format), so strip formatting here.
    const baseCity = getCityFromPostalCode(data.basePostalCode);
    if (!baseCity) {
      return {
        success: false,
        error: "Postnummeret er utenfor serviceområdet vårt (Bergen og Oslo).",
      };
    }

    const taxId = digitsOnly(data.taxId ?? "");
    if (!validateTaxId(taxId, data.businessType)) {
      return {
        success: false,
        error: data.businessType === "individual"
          ? "Fødselsnummer må være 11 siffer"
          : "Organisasjonsnummer må være 9 siffer",
      };
    }

    const bankAccount = digitsOnly(data.bankAccount ?? "");
    if (!validateBankAccount(bankAccount)) {
      return { success: false, error: "Kontonummer må være 11 siffer" };
    }

    const businessName = data.businessName?.trim() || null;
    const businessAddress = data.businessAddress?.trim() || null;
    if (data.businessType === "business" && (!businessName || !businessAddress)) {
      return {
        success: false,
        error: "Firmanavn og forretningsadresse er påkrevd for virksomheter",
      };
    }

    const displayName = (data.displayName ?? "").trim();
    if (displayName.length < 2) {
      return { success: false, error: "Visningsnavn må være minst 2 tegn" };
    }

    const machineBrand = (data.machineBrand ?? "").trim();
    const machineCapacityKg = Number(data.machineCapacityKg);
    const machineYear = Number(data.machineYear);
    if (!machineBrand) {
      return { success: false, error: "Merke og modell på vaskemaskinen er påkrevd" };
    }
    if (!Number.isInteger(machineCapacityKg) || machineCapacityKg <= 0) {
      return { success: false, error: "Oppgi vaskemaskinens kapasitet i hele kilo" };
    }
    if (!validateYear(data.machineYear ?? "")) {
      return { success: false, error: "Oppgi et gyldig årstall for vaskemaskinen" };
    }
    if (!data.machineCondition) {
      return { success: false, error: "Velg tilstand på vaskemaskinen" };
    }

    // 3. Check if user already has a cleaner profile
    const existingCleaner = await getCleanerByUserId(user.id);
    if (existingCleaner) {
      return {
        success: false,
        error: "Du har allerede en renserprofil",
      };
    }

    // 4. Geocode the base address so the cleaner has coordinates for route
    //    optimization. Null on failure — the profile still saves.
    const baseCoords = await geocodeAddress({
      street: data.baseStreet,
      postal_code: data.basePostalCode,
      city: baseCity,
      country: data.baseCountry,
    });

    const { data: cleaner, error: createError } = await createCleaner(user.id, {
      display_name: displayName,
      profile_image_url: null, // File uploads skipped per requirements
      bio: null, // Not collected in onboarding
      verification_status: "pending",
      business_type: data.businessType,
      tax_id: taxId,
      business_name: data.businessType === "business" ? businessName : null,
      business_address: data.businessType === "business" ? businessAddress : null,
      bank_account: bankAccount,
      base_street: data.baseStreet.trim(),
      base_postal_code: data.basePostalCode,
      base_city: baseCity,
      base_country: data.baseCountry,
      base_special_instructions: data.baseSpecialInstructions?.trim() || null,
      latitude: baseCoords?.latitude ?? null,
      longitude: baseCoords?.longitude ?? null,
      experience_level: data.experienceLevel,
      machine_brand: machineBrand,
      machine_capacity_kg: machineCapacityKg,
      machine_year: machineYear,
      machine_condition: data.machineCondition,
      weekly_schedule: {
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: true,
        sun: true,
      },
    });

    if (createError || !cleaner) {
      console.error("Error creating cleaner:", createError);
      return {
        success: false,
        error: "Kunne ikke opprette renserprofil. Vennligst prøv igjen.",
      };
    }

    return {
      success: true,
      cleanerId: cleaner.id,
    };
  } catch (error) {
    console.error("Unexpected error in createCleanerProfileAction:", error);
    return {
      success: false,
      error: "En uventet feil oppstod. Vennligst prøv igjen.",
    };
  }
}
