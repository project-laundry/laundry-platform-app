"use server";

import { createClient } from "@/lib/supabase/server";
import { createCleaner } from "@/lib/database/cleaners";
import type { CleanerOnboardingData } from "@/types/cleaner-flow";

export interface CreateCleanerProfileResult {
  success: boolean;
  error?: string;
  cleanerId?: string;
}

/**
 * Create a new cleaner profile
 * Called from the confirmation page after user accepts terms
 *
 * Flow:
 * 1. Verify user is authenticated
 * 2. Check if user already has a cleaner profile
 * 3. Create cleaner record in database
 * 4. Return success/error
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

    // 2. Check if user already has a cleaner profile
    const { data: existingCleaner } = await supabase
      .from("cleaners")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingCleaner) {
      return {
        success: false,
        error: "Du har allerede en renserprofil",
      };
    }

    // 3. Create cleaner record
    const { data: cleaner, error: createError } = await createCleaner(user.id, {
      display_name: data.displayName,
      profile_image_url: null, // File uploads skipped per requirements
      bio: null, // Not collected in onboarding
      verification_status: "pending",
      business_type: data.businessType,
      tax_id: data.taxId,
      business_name: data.businessName || null,
      business_address: data.businessAddress || null,
      bank_account: data.bankAccount,
      base_street: data.baseStreet,
      base_postal_code: data.basePostalCode,
      base_city: data.baseCity,
      base_country: data.baseCountry,
      base_special_instructions: data.baseSpecialInstructions || null,
      experience_level: data.experienceLevel,
      languages: data.languages,
      specializations: data.specializations || null,
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
