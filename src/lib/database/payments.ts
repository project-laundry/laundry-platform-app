// Payment database operations

import { createAdminClient } from '@/lib/supabase/admin';
import type { Payment, PaymentStatus, PaymentType, PaymentProvider, Customer, User, Order } from '@/types/database';

export interface CreatePaymentData {
  customer_id: string;
  order_id: string;
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
      order_id: data.order_id,
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
// PAYMENT LOOKUP
// =============================================================================

/**
 * Get payment by provider reference
 *
 * Queries provider_reference field to find payment by merchant reference.
 * Used by the Recurring API webhook handler.
 *
 * @param reference - Vipps chargeId used as the merchant reference.
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

/**
 * True when any Vipps payment for the subscription's orders is still
 * un-settled (pending/authorized). Used by the deferred agreement stop:
 * stopping a Vipps agreement cancels its still-pending charges, so the stop
 * must wait until every charge has settled.
 */
export async function hasUnsettledVippsPaymentForSubscription(
  subscriptionId: string
): Promise<boolean> {
  const supabase = await createAdminClient();

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('subscription_id', subscriptionId);

  if (ordersError) {
    console.error('Error fetching subscription orders for payment check:', ordersError);
    // Fail safe: claim un-settled so the agreement is NOT stopped on a read error.
    return true;
  }
  if (!orders || orders.length === 0) {
    return false;
  }

  const { data: payments, error } = await supabase
    .from('payments')
    .select('id')
    .in('order_id', orders.map((order) => order.id))
    .eq('payment_provider', 'vipps')
    .in('status', ['pending', 'authorized'])
    .limit(1);

  if (error) {
    console.error('Error checking unsettled Vipps payments:', error);
    return true;
  }

  return (payments?.length ?? 0) > 0;
}

/**
 * Payment with customer and order summary for the admin payment list.
 */
export interface AdminPaymentListItem extends Payment {
  customer: Customer & { user: User };
  order: Pick<Order, 'id' | 'order_number'> | null;
}

/**
 * All payments for the admin dashboard, newest first, optionally filtered
 * by status.
 */
export async function getAllPaymentsWithDetails(options: {
  status?: PaymentStatus;
  limit?: number;
}): Promise<AdminPaymentListItem[]> {
  const supabase = await createAdminClient();

  let query = supabase
    .from('payments')
    .select(`
      *,
      customer:customers!customer_id(
        *,
        user:users!user_id(*)
      ),
      order:orders!order_id(id, order_number)
    `);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 200);

  if (error || !data) {
    console.error('Error fetching admin payments:', error);
    return [];
  }

  return data as AdminPaymentListItem[];
}
