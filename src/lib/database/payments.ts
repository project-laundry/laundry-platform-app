// Payment database operations

import { createAdminClient } from '@/lib/supabase/admin';
import type { Payment, PaymentStatus, PaymentType, PaymentProvider } from '@/types/database';

export interface CreatePaymentData {
  customer_id: string;
  order_id?: string | null;
  subscription_id?: string | null;
  payment_type: PaymentType;
  amount_ore: number;
  payment_provider?: PaymentProvider,
  provider_reference?: string;
  provider_metadata?: Record<string, unknown>;
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
      payment_provider: data.payment_provider,
      provider_reference: data.provider_reference,
      provider_metadata: data.provider_metadata || null,
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

// =============================================================================
// VIPPS PAYMENT METADATA MANAGEMENT
// =============================================================================

/**
 * Update payment with provider metadata (for Vipps charge IDs, etc.)
 */
export async function updatePaymentWithMetadata(
  paymentId: string,
  metadata: Record<string, unknown>
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .update({
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
 * Update payment with provider reference and metadata
 */
export async function updatePayment(
  paymentId: string,
  updates: {
    provider_reference?: string;
    provider_metadata?: Record<string, unknown>;
  }
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment:', error);
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
  metadata: Record<string, unknown>
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'authorized' as PaymentStatus,
      authorized_at: new Date().toISOString(),
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
  metadata: Record<string, unknown>
): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'captured' as PaymentStatus,
      captured_at: new Date().toISOString(),
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
 * Get payment by provider reference
 *
 * Queries provider_reference field to find payment by merchant reference.
 * Used by both Recurring and ePayment webhook handlers.
 *
 * @param reference - For Recurring API: Vipps chargeId. For ePayment API: order number or custom reference.
 */
export async function getPaymentByReference(reference: string): Promise<Payment | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('provider_reference', reference)
    .single();

  if (error) {
    console.error('Error fetching payment by reference:', error);
    return null;
  }

  return data;
}
