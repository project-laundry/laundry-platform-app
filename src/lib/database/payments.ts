// Payment database operations

import { createClient } from '@/lib/supabase/server';
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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
