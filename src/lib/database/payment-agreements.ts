// Payment agreement database operations

import { createAdminClient } from '@/lib/supabase/admin';
import type { PaymentAgreement, PaymentAgreementStatus } from '@/types/database';

export interface CreatePaymentAgreementData {
  customer_id: string;
  provider?: string;
  provider_agreement_id: string;
  provider_metadata?: Record<string, unknown> | null;
}

/**
 * Create a new payment agreement with pending status
 * Uses admin client to bypass RLS
 */
export async function createPaymentAgreement(
  data: CreatePaymentAgreementData
): Promise<PaymentAgreement | null> {
  const supabase = createAdminClient();

  const { data: agreement, error } = await supabase
    .from('payment_agreements')
    .insert({
      customer_id: data.customer_id,
      provider: data.provider || 'vipps',
      provider_agreement_id: data.provider_agreement_id,
      status: 'pending' as PaymentAgreementStatus,
      provider_metadata: data.provider_metadata || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating payment agreement:', error);
    return null;
  }

  return agreement;
}

/**
 * Get a payment agreement by ID
 */
export async function getPaymentAgreementById(
  id: string
): Promise<PaymentAgreement | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('payment_agreements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get payment agreement by Vipps provider agreement ID
 * Replaces getSubscriptionByAgreementId()
 */
export async function getPaymentAgreementByProviderId(
  providerAgreementId: string
): Promise<PaymentAgreement | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('payment_agreements')
    .select('*')
    .eq('provider_agreement_id', providerAgreementId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get all payment agreements for a customer
 */
export async function getPaymentAgreementsByCustomerId(
  customerId: string
): Promise<PaymentAgreement[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('payment_agreements')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payment agreements:', error);
    return [];
  }

  return data;
}

/**
 * Activate a payment agreement
 * Sets status to 'active' and activated_at to now
 */
export async function activatePaymentAgreement(
  id: string
): Promise<PaymentAgreement | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('payment_agreements')
    .update({
      status: 'active' as PaymentAgreementStatus,
      activated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error activating payment agreement:', error);
    return null;
  }

  return data;
}

/**
 * Stop a payment agreement
 * Sets status to 'stopped' and stopped_at to now
 */
export async function stopPaymentAgreement(
  id: string
): Promise<PaymentAgreement | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('payment_agreements')
    .update({
      status: 'stopped' as PaymentAgreementStatus,
      stopped_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error stopping payment agreement:', error);
    return null;
  }

  return data;
}

/**
 * Expire a payment agreement
 * Sets status to 'expired'
 */
export async function expirePaymentAgreement(
  id: string
): Promise<PaymentAgreement | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('payment_agreements')
    .update({
      status: 'expired' as PaymentAgreementStatus,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error expiring payment agreement:', error);
    return null;
  }

  return data;
}

/**
 * Get subscription linked to a payment agreement (if any)
 * Returns null if this agreement has no subscription (e.g., one-time order)
 */
export async function getSubscriptionByPaymentAgreementId(
  paymentAgreementId: string
): Promise<{ id: string; customer_id: string; frequency: string; status: string; order_defaults: unknown } | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, customer_id, frequency, status, order_defaults')
    .eq('payment_agreement_id', paymentAgreementId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching subscription by payment agreement:', error);
    return null;
  }

  return data;
}
