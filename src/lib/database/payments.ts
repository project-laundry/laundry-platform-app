// Payment database operations

import { createAdminClient } from '@/lib/supabase/admin';
import type { Payment, PaymentStatus, PaymentType, PaymentProvider } from '@/types/database';

export interface CreatePaymentData {
  customer_id: string;
  order_id?: string | null;
  subscription_id?: string | null;
  payment_type: PaymentType;
  amount_ore: number;
  payment_provider?: PaymentProvider;
}

/**
 * Create a new payment record
 */
export async function createPayment(data: CreatePaymentData): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      customer_id: data.customer_id,
      order_id: data.order_id || null,
      subscription_id: data.subscription_id || null,
      payment_type: data.payment_type,
      amount_ore: data.amount_ore,
      status: 'pending' as PaymentStatus,
      payment_provider: data.payment_provider || 'manual',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating payment:', error);
    return null;
  }

  return payment;
}

/**
 * Get a payment by ID
 */
export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get payment for a subscription
 */
export async function getPaymentForSubscription(
  subscriptionId: string
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Update payment status to captured (payment successful)
 */
export async function capturePayment(
  paymentId: string,
  providerPaymentId?: string
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'captured' as PaymentStatus,
      captured_at: new Date().toISOString(),
      provider_payment_id: providerPaymentId || null,
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error capturing payment:', error);
    return null;
  }

  return data;
}

/**
 * Update payment status to failed
 */
export async function failPayment(
  paymentId: string,
  failureReason?: string
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'failed' as PaymentStatus,
      failed_at: new Date().toISOString(),
      failure_reason: failureReason || null,
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error failing payment:', error);
    return null;
  }

  return data;
}

/**
 * Get payments for a customer
 */
export async function getPaymentsForCustomer(customerId: string): Promise<Payment[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return data;
}

// =============================================================================
// VIPPS PAYMENT METADATA MANAGEMENT
// =============================================================================

/**
 * Update payment with provider metadata (for Vipps charge IDs, etc.)
 */
export async function updatePaymentWithMetadata(
  paymentId: string,
  providerPaymentId: string,
  metadata: Record<string, unknown>
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .update({
      provider_payment_id: providerPaymentId,
      provider_metadata: metadata,
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment metadata:', error);
    return null;
  }

  return data;
}

/**
 * Get payment by Vipps agreement ID and charge ID
 */
export async function getPaymentByAgreementAndCharge(
  agreementId: string,
  chargeId: string
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('provider_metadata->>vipps_agreement_id', agreementId)
    .eq('provider_metadata->>vipps_charge_id', chargeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Authorize payment (RESERVE_CAPTURE: first step)
 * Sets status to 'authorized' and records timestamp
 */
export async function authorizePayment(
  paymentId: string,
  providerPaymentId: string,
  metadata: Record<string, unknown>
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'authorized' as PaymentStatus,
      authorized_at: new Date().toISOString(),
      provider_payment_id: providerPaymentId,
      provider_metadata: metadata,
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error authorizing payment:', error);
    return null;
  }

  return data;
}

/**
 * Capture payment with metadata (RESERVE_CAPTURE: second step)
 * Updates status to 'captured' and records capture timestamp
 */
export async function capturePaymentWithMetadata(
  paymentId: string,
  providerPaymentId: string,
  metadata: Record<string, unknown>
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'captured' as PaymentStatus,
      captured_at: new Date().toISOString(),
      provider_payment_id: providerPaymentId,
      provider_metadata: metadata,
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error capturing payment:', error);
    return null;
  }

  return data;
}

/**
 * Fail payment with metadata and reason
 */
export async function failPaymentWithMetadata(
  paymentId: string,
  failureReason: string,
  metadata: Record<string, unknown>
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'failed' as PaymentStatus,
      failed_at: new Date().toISOString(),
      failure_reason: failureReason,
      provider_metadata: metadata,
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error failing payment:', error);
    return null;
  }

  return data;
}

// =============================================================================
// EPAYMENT QUERIES
// =============================================================================

/**
 * Get payment by Vipps ePayment reference
 * Used by webhook handler to look up payments by merchant reference
 *
 * Note: Queries provider_payment_id which stores the reference for ePayments
 */
export async function getPaymentByReference(reference: string): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('provider_payment_id', reference)
    .single();

  if (error) {
    console.error('Error fetching payment by reference:', error);
    return null;
  }

  return data;
}
