// Promo code database operations
//
// Codes are SHARED (one code, many customers) but each customer may redeem a code only ONCE.
// Validation locks the discount terms into a snapshot at checkout; redemption is recorded
// when the first order is generated (see the Vipps recurring webhook).

import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderPromo, PromoCode, PromoDiscountType } from '@/types/database';

export interface PromoValidationResult {
  valid: boolean;
  promo?: OrderPromo; // locked snapshot to store on the agreement/order
  error?: string; // Norwegian, user-facing
}

/**
 * Validate a promo code for a given customer.
 *
 * Checks, in order: exists → active → within validity window → global redemption cap not
 * reached → customer hasn't already redeemed it (shared, once-per-customer).
 *
 * Returns a locked snapshot of the discount terms on success.
 */
export async function validatePromoCode(
  code: string,
  customerId: string
): Promise<PromoValidationResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, error: 'Skriv inn en rabattkode' };
  }

  const supabase = createAdminClient();

  const { data: promoCode, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();

  if (error) {
    console.error('Error fetching promo code:', error);
    return { valid: false, error: 'Kunne ikke validere rabattkoden' };
  }

  if (!promoCode) {
    return { valid: false, error: 'Ugyldig rabattkode' };
  }

  if (!promoCode.active) {
    return { valid: false, error: 'Rabattkoden er ikke lenger aktiv' };
  }

  const now = new Date();
  if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
    return { valid: false, error: 'Rabattkoden er ikke gyldig ennå' };
  }
  if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
    return { valid: false, error: 'Rabattkoden har utløpt' };
  }

  // Global redemption cap (count of ledger rows)
  if (promoCode.max_redemptions != null) {
    const { count } = await supabase
      .from('promo_code_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('promo_code_id', promoCode.id);

    if ((count ?? 0) >= promoCode.max_redemptions) {
      return { valid: false, error: 'Rabattkoden er brukt opp' };
    }
  }

  // Per-customer: once per customer
  const { data: existing } = await supabase
    .from('promo_code_redemptions')
    .select('id')
    .eq('promo_code_id', promoCode.id)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (existing) {
    return { valid: false, error: 'Du har allerede brukt denne rabattkoden' };
  }

  return {
    valid: true,
    promo: {
      promo_code_id: promoCode.id,
      code: promoCode.code,
      discount_type: promoCode.discount_type,
      discount_value: promoCode.discount_value,
      max_discount_ore: promoCode.max_discount_ore,
    },
  };
}

/**
 * Record a promo redemption when the first order is generated.
 *
 * Idempotent: relies on the UNIQUE(promo_code_id, customer_id) constraint, so a duplicate
 * (e.g. a webhook retry) is silently ignored. Recording at first-order generation — rather
 * than at checkout — means abandoned checkouts don't consume a customer's single use.
 */
export async function recordPromoRedemption(params: {
  promoCodeId: string;
  customerId: string;
  paymentAgreementId: string;
  orderId: string;
}): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('promo_code_redemptions').insert({
    promo_code_id: params.promoCodeId,
    customer_id: params.customerId,
    payment_agreement_id: params.paymentAgreementId,
    order_id: params.orderId,
  });

  // 23505 = unique_violation → already redeemed; safe to ignore (idempotent).
  if (error && error.code !== '23505') {
    console.error('Error recording promo redemption:', error);
  }
}

// ---------------------------------------------------------------------------
// Admin management (list, create, edit) — used by /admin/promo-codes only.
// ---------------------------------------------------------------------------

export interface PromoCodeWithRedemptionCount extends PromoCode {
  redemption_count: number;
}

/**
 * All promo codes with their redemption counts, newest first. Admin dashboard only.
 *
 * Counts are grouped in JS from a single fetch of the ledger's promo_code_id
 * column — fine at MVP scale and avoids a per-code count query.
 */
export async function getAllPromoCodesWithRedemptionCount(): Promise<
  PromoCodeWithRedemptionCount[]
> {
  const supabase = createAdminClient();

  const [codesRes, redemptionsRes] = await Promise.all([
    supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
    supabase.from('promo_code_redemptions').select('promo_code_id'),
  ]);

  if (codesRes.error || !codesRes.data) {
    console.error('Error fetching promo codes:', codesRes.error);
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of redemptionsRes.data ?? []) {
    counts.set(row.promo_code_id, (counts.get(row.promo_code_id) ?? 0) + 1);
  }

  return codesRes.data.map((code) => ({
    ...code,
    redemption_count: counts.get(code.id) ?? 0,
  }));
}

export interface PromoCodeRedemptionRow {
  id: string;
  redeemed_at: string;
  customer: { user: { full_name: string; email: string } } | null;
}

export interface PromoCodeWithRedemptions extends PromoCode {
  redemptions: PromoCodeRedemptionRow[];
}

/**
 * A single promo code with its redemptions (customer name + date), newest
 * redemption first. Admin dashboard only.
 */
export async function getPromoCodeWithRedemptions(
  promoCodeId: string
): Promise<PromoCodeWithRedemptions | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('promo_codes')
    .select(`
      *,
      redemptions:promo_code_redemptions(
        id,
        redeemed_at,
        customer:customers!customer_id(
          user:users!user_id(full_name, email)
        )
      )
    `)
    .eq('id', promoCodeId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('Error fetching promo code:', error);
    return null;
  }

  const result = data as PromoCodeWithRedemptions;
  result.redemptions.sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at));
  return result;
}

export interface PromoCodeData {
  code: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  max_discount_ore: number | null;
  active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  max_redemptions: number | null;
}

export interface PromoCodeWriteResult {
  promoCode: PromoCode | null;
  error: string | null;
}

const DUPLICATE_CODE_ERROR = 'Koden finnes allerede';

export async function createPromoCode(data: PromoCodeData): Promise<PromoCodeWriteResult> {
  const supabase = createAdminClient();

  const { data: promoCode, error } = await supabase
    .from('promo_codes')
    .insert(data)
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation on promo_codes_code_key
    if (error.code === '23505') return { promoCode: null, error: DUPLICATE_CODE_ERROR };
    console.error('Error creating promo code:', error);
    return { promoCode: null, error: 'Kunne ikke opprette rabattkoden' };
  }

  return { promoCode, error: null };
}

export async function updatePromoCode(
  promoCodeId: string,
  data: PromoCodeData
): Promise<PromoCodeWriteResult> {
  const supabase = createAdminClient();

  const { data: promoCode, error } = await supabase
    .from('promo_codes')
    .update(data)
    .eq('id', promoCodeId)
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === '23505') return { promoCode: null, error: DUPLICATE_CODE_ERROR };
    console.error('Error updating promo code:', error);
    return { promoCode: null, error: 'Kunne ikke oppdatere rabattkoden' };
  }
  if (!promoCode) {
    return { promoCode: null, error: 'Rabattkoden ble ikke funnet' };
  }

  return { promoCode, error: null };
}
