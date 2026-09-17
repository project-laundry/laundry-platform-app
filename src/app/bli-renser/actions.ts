"use server";

import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth/require-role";
import {
  createCleaner,
  getCleanerByUserId,
  isTaxIdTaken,
} from "@/lib/database/cleaners";
import { geocodeAddress } from "@/lib/maps/geocoding";
import {
  MAX_IMAGE_BASE64_LENGTH,
  recognizeWashingMachine,
  type MachineImageMediaType,
  type MachineRecognitionResult,
} from "@/lib/ai/machine-recognition";
import { getCityFromPostalCode } from "@/lib/config/postal-codes";
import {
  taxIdTakenMessage,
  validateBankAccount,
  validateTaxId,
  validateYear,
} from "@/lib/validation/cleaner";
import type { CleanerBusinessType } from "@/types/database";
import type { CleanerOnboardingData } from "@/types/cleaner-flow";

export interface CreateCleanerProfileResult {
  success: boolean;
  error?: string;
  cleanerId?: string;
}

const digitsOnly = (value: string) => value.replace(/\D/g, "");

/**
 * Step-1 pre-check: is this tax id already on another cleaner's row?
 * cleaners.tax_id is UNIQUE, but without this the duplicate only surfaces
 * when the final insert fails on step 5. Cleaner-only — the (steps) layout
 * guarantees the caller is a signed-in cleaner without a profile. A failed
 * role guard or a malformed id reports "not taken": the form proceeds and
 * createCleanerProfileAction rejects at the end instead.
 */
export async function checkTaxIdAvailabilityAction(input: {
  taxId: string;
  businessType: CleanerBusinessType;
}): Promise<{ taken: boolean }> {
  const { error } = await assertRole(["cleaner"]);
  if (error) {
    return { taken: false };
  }

  const taxId = digitsOnly(input.taxId ?? "");
  if (!validateTaxId(taxId, input.businessType)) {
    return { taken: false };
  }

  return { taken: await isTaxIdTaken(taxId) };
}

const ALLOWED_IMAGE_TYPES: readonly MachineImageMediaType[] = ["image/jpeg", "image/png", "image/webp"];
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Step-3 helper: ask Claude what washing machine is in the photo so the
 * equipment form can pre-fill brand/model, capacity, year and condition.
 * The cleaner can edit every suggested value; the photo is not stored.
 * Cleaner-only — the (steps) layout guarantees the caller is a signed-in
 * cleaner without a profile. A failed role guard, a bad media type or an
 * oversized/invalid payload reports "unavailable": the form shows a short
 * message and the cleaner fills the fields manually.
 */
export async function recognizeMachineAction(input: {
  imageBase64: string;
  mediaType: MachineImageMediaType;
}): Promise<MachineRecognitionResult> {
  const { error } = await assertRole(["cleaner"]);
  if (error) {
    return { status: "unavailable" };
  }

  const data = input.imageBase64 ?? "";
  if (
    !ALLOWED_IMAGE_TYPES.includes(input.mediaType) ||
    data.length === 0 ||
    data.length > MAX_IMAGE_BASE64_LENGTH ||
    !BASE64_PATTERN.test(data)
  ) {
    return { status: "unavailable" };
  }

  return recognizeWashingMachine({ data, mediaType: input.mediaType });
}

/**
 * Create a new cleaner profile
 * Called from the confirmation page after user accepts terms
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Validate + normalise the submitted data (never trust the client)
 * 3. Check if user already has a cleaner profile, and that the tax id is
 *    not already on another cleaner (step 1 checks this too; this is the
 *    fallback for stale session data)
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

    // cleaners.tax_id is UNIQUE. Step 1 already ran this check, but the user
    // may reach here with stale session data.
    if (await isTaxIdTaken(taxId)) {
      return { success: false, error: taxIdTakenMessage(data.businessType) };
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
      // 23505 = unique_violation. user_id was checked above, so the only
      // other UNIQUE column that can fail is tax_id — a race between the
      // pre-check and the insert lands here.
      if (createError?.code === "23505") {
        return { success: false, error: taxIdTakenMessage(data.businessType) };
      }
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
