'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import {
  createPromoCode,
  updatePromoCode,
  type PromoCodeData,
} from '@/lib/database/promo-codes';
import type { PromoDiscountType } from '@/types/database';

export interface PromoCodeFormInput {
  code: string;
  discount_type: PromoDiscountType;
  /** Percentage 1–100 for `percentage`, whole kroner for `fixed`. */
  discount_value: string;
  /** Percentage codes only: optional cap in whole kroner. '' = no cap. */
  max_discount_kr: string;
  /** 'YYYY-MM-DD' or '' (no bound). */
  valid_from: string;
  valid_until: string;
  /** '' = unlimited. */
  max_redemptions: string;
  active: boolean;
}

export interface PromoCodeActionResult {
  success: boolean;
  error?: string;
}

const CODE_PATTERN = /^[A-ZÆØÅ0-9-]{2,32}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse an integer form field: null for blank, 'invalid' for non-digits. */
function parseIntField(value: string): number | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return 'invalid';
  return parseInt(trimmed, 10);
}

/**
 * Validate the form input and build the DB payload. Money fields are converted
 * kr → øre here; dates become UTC day boundaries (from = start of day,
 * until = end of day) so a code stays valid through its last day.
 */
function validateAndBuild(
  input: PromoCodeFormInput
): { data: PromoCodeData } | { error: string } {
  const code = input.code.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    return { error: 'Koden må være 2–32 tegn: bokstaver, tall og bindestrek' };
  }

  const discountValue = parseIntField(input.discount_value);
  if (discountValue === 'invalid' || discountValue === null || discountValue < 1) {
    return { error: 'Rabattverdien må være et heltall større enn 0' };
  }
  if (input.discount_type === 'percentage' && discountValue > 100) {
    return { error: 'Prosentrabatten kan ikke være over 100' };
  }

  let maxDiscountOre: number | null = null;
  if (input.discount_type === 'percentage') {
    const maxKr = parseIntField(input.max_discount_kr);
    if (maxKr === 'invalid' || (maxKr !== null && maxKr < 1)) {
      return { error: 'Maksrabatten må være et heltall større enn 0, eller stå tom' };
    }
    maxDiscountOre = maxKr === null ? null : maxKr * 100;
  }

  const maxRedemptions = parseIntField(input.max_redemptions);
  if (maxRedemptions === 'invalid' || (maxRedemptions !== null && maxRedemptions < 1)) {
    return { error: 'Maks antall bruk må være et heltall større enn 0, eller stå tom' };
  }

  const from = input.valid_from.trim();
  const until = input.valid_until.trim();
  if (from && !DATE_PATTERN.test(from)) return { error: 'Ugyldig fra-dato' };
  if (until && !DATE_PATTERN.test(until)) return { error: 'Ugyldig til-dato' };
  if (from && until && from > until) {
    return { error: 'Fra-datoen kan ikke være etter til-datoen' };
  }

  return {
    data: {
      code,
      discount_type: input.discount_type,
      discount_value:
        input.discount_type === 'fixed' ? discountValue * 100 : discountValue,
      max_discount_ore: maxDiscountOre,
      active: input.active,
      valid_from: from ? `${from}T00:00:00.000Z` : null,
      valid_until: until ? `${until}T23:59:59.999Z` : null,
      max_redemptions: maxRedemptions,
    },
  };
}

export async function createPromoCodeAction(
  input: PromoCodeFormInput
): Promise<PromoCodeActionResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const built = validateAndBuild(input);
  if ('error' in built) return { success: false, error: built.error };

  const { error } = await createPromoCode(built.data);
  if (error) return { success: false, error };

  revalidatePath('/admin/promo-codes');
  return { success: true };
}

export async function updatePromoCodeAction(
  promoCodeId: string,
  input: PromoCodeFormInput
): Promise<PromoCodeActionResult> {
  const { error: authError } = await assertRole(['admin']);
  if (authError) return { success: false, error: authError };

  const built = validateAndBuild(input);
  if ('error' in built) return { success: false, error: built.error };

  const { error } = await updatePromoCode(promoCodeId, built.data);
  if (error) return { success: false, error };

  revalidatePath('/admin/promo-codes');
  return { success: true };
}
