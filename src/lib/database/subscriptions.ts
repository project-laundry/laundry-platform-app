// Subscription database operations

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  Subscription,
  SubscriptionStatus,
  SubscriptionFrequency,
  Weekday,
} from '@/types/database';

export interface CreateSubscriptionData {
  customer_id: string;
  assigned_cleaner_id?: string | null;
  default_needs_ironing: boolean;
  frequency: SubscriptionFrequency;
  location_city: string;
  recurring_weekday: Weekday | null;
  provider_agreement_id: string;
  provider_agreement_metadata?: Record<string, unknown> | null;
}

/**
 * Create a new subscription with pending_payment status
 * Uses admin client to bypass RLS (no INSERT policy on subscriptions table)
 *
 * Note: Addresses are stored in provider_agreement_metadata for order generation
 */
export async function createSubscription(
  data: CreateSubscriptionData
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      customer_id: data.customer_id,
      assigned_cleaner_id: data.assigned_cleaner_id || null,
      default_needs_ironing: data.default_needs_ironing,
      frequency: data.frequency,
      location_city: data.location_city,
      recurring_weekday: data.recurring_weekday,
      status: 'pending_payment' as SubscriptionStatus,
      started_at: null,
      provider_agreement_id: data.provider_agreement_id,
      provider_agreement_metadata: data.provider_agreement_metadata || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating subscription:', error);
    return null;
  }

  return subscription;
}

/**
 * Get a subscription by ID
 */
export async function getSubscriptionById(
  subscriptionId: string
): Promise<Subscription | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();

  if (error) {
    return null;
  }

  return data;
}



/**
 * Get active subscription for a customer
 * Returns subscription with status 'pending_payment' or 'active'
 * Uses admin client to bypass RLS (no SELECT policy on subscriptions table)
 */
export async function getActiveSubscriptionByCustomerId(
  customerId: string
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('customer_id', customerId)
    .in('status', ['pending_payment', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active subscription:', error);
    return null;
  }

  return data;
}

// =============================================================================
// VIPPS AGREEMENT MANAGEMENT
// =============================================================================

/**
 * Get subscription by Vipps agreement ID
 * Uses admin client to bypass RLS (no SELECT policy on subscriptions table)
 */
export async function getSubscriptionByAgreementId(
  agreementId: string
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('provider_agreement_id', agreementId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Activate subscription when Vipps agreement is activated
 * Sets status to active, started_at to now, and expires_at to one month from now
 * Uses admin client to bypass RLS (no UPDATE policy on subscriptions table)
 */
export async function activateSubscriptionOnAgreementActivation(
  subscriptionId: string
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active' as SubscriptionStatus,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) {
    console.error('Error activating subscription on agreement activation:', error);
    return null;
  }

  return data;
}

/**
 * Update a subscription with partial data
 * Uses admin client to bypass RLS (no UPDATE policy on subscriptions table)
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<Subscription>
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating subscription:', error);
    return null;
  }

  return data;
}


/**
 * Cancel a subscription
 * Sets status to 'cancelled' and records the timestamp
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled' as SubscriptionStatus,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) {
    console.error('Error cancelling subscription:', error);
    return null;
  }

  return data;
}
