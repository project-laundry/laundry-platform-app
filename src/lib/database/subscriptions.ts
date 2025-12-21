// Subscription database operations

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  Subscription,
  SubscriptionStatus,
  SubscriptionFrequency,
  SubscriptionOrderDefaults,
} from '@/types/database';

export interface CreateSubscriptionData {
  customer_id: string;
  frequency: SubscriptionFrequency;
  provider_agreement_id: string;
  order_defaults?: SubscriptionOrderDefaults | null;
}

/**
 * Create a new subscription with pending_payment status
 * Uses admin client to bypass RLS (no INSERT policy on subscriptions table)
 *
 * Note: Order defaults (address, cleaner, preferences) are stored in order_defaults JSONB
 */
export async function createSubscription(
  data: CreateSubscriptionData
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      customer_id: data.customer_id,
      frequency: data.frequency,
      status: 'pending_payment' as SubscriptionStatus,
      started_at: null,
      provider_agreement_id: data.provider_agreement_id,
      order_defaults: data.order_defaults || null,
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
  const supabase = createAdminClient();

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
 * Sets status to active and started_at to now
 * Uses admin client to bypass RLS (no UPDATE policy on subscriptions table)
 */
export async function activateSubscriptionOnAgreementActivation(
  subscriptionId: string
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  const now = new Date();

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active' as SubscriptionStatus,
      started_at: now.toISOString(),
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
 * Cancel a subscription with all related data
 *
 * This is the unified cancellation function used by:
 * - User-initiated cancellation (via dashboard)
 * - Vipps webhook events (agreement stopped/rejected/expired)
 *
 * Actions performed:
 * 1. Cancels all pending/upcoming orders
 * 2. Cancels all pending/authorized payments (imported from payments.ts to avoid circular dependency)
 * 3. Updates subscription status to 'cancelled'
 *
 * @param subscriptionId - The subscription ID to cancel
 * @param cancelledAt - Optional timestamp (defaults to now, used by webhooks for accurate timing)
 * @param reason - Optional cancellation reason (for logging/auditing)
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelledAt?: string,
  reason?: string
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  console.log(`[cancelSubscription] Cancelling subscription ${subscriptionId}${reason ? ` - Reason: ${reason}` : ''}`);

  // 1. Cancel all related orders that haven't been picked up yet
  const { data: cancelledOrders, error: ordersError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
    })
    .eq('subscription_id', subscriptionId)
    .in('status', [
      'pending_assignment',
      'pickup_scheduled'      
    ])
    .select('id, order_number');

  if (ordersError) {
    console.error('[cancelSubscription] Error cancelling orders:', ordersError);
  } else if (cancelledOrders && cancelledOrders.length > 0) {
    console.log(`[cancelSubscription] Cancelled ${cancelledOrders.length} order(s): ${cancelledOrders.map(o => o.order_number).join(', ')}`);
  }

  // 2. Cancel all pending/authorized payments
  // Note: Using dynamic import to avoid circular dependency
  // This is safe because it's only called at runtime, not during module initialization
  const { cancelPendingPaymentsForSubscription } = await import('@/lib/database/payments');
  const cancelledPaymentsCount = await cancelPendingPaymentsForSubscription(
    subscriptionId,
    reason || 'Subscription cancelled'
  );

  if (cancelledPaymentsCount > 0) {
    console.log(`[cancelSubscription] Cancelled ${cancelledPaymentsCount} pending payment(s)`);
  }

  // 3. Update subscription status to cancelled
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled' as SubscriptionStatus,
      cancelled_at: cancelledAt || new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) {
    console.error('[cancelSubscription] Error updating subscription:', error);
    return null;
  }

  console.log(`[cancelSubscription] Subscription ${subscriptionId} cancelled successfully`);
  return data;
}

/**
 * Expire a subscription with all related data cleanup
 *
 * Similar to cancelSubscription but sets status to 'expired' instead of 'cancelled'.
 * Used when Vipps agreement expires naturally (reached end date).
 *
 * Actions performed:
 * 1. Cancels all pending/upcoming orders
 * 2. Cancels all pending/authorized payments
 * 3. Updates subscription status to 'expired'
 *
 * @param subscriptionId - The subscription ID to expire
 */
export async function expireSubscription(
  subscriptionId: string
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  console.log(`[expireSubscription] Expiring subscription ${subscriptionId}`);

  // 1. Cancel all related orders that haven't been completed yet
  const { data: cancelledOrders, error: ordersError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
    })
    .eq('subscription_id', subscriptionId)
    .in('status', [
      'pending_assignment',
      'pickup_scheduled',
      'picked_up',
      'in_cleaning',
      'ready_for_delivery',
      'out_for_delivery'
    ])
    .select('id, order_number');

  if (ordersError) {
    console.error('[expireSubscription] Error cancelling orders:', ordersError);
  } else if (cancelledOrders && cancelledOrders.length > 0) {
    console.log(`[expireSubscription] Cancelled ${cancelledOrders.length} order(s): ${cancelledOrders.map(o => o.order_number).join(', ')}`);
  }

  // 2. Cancel all pending/authorized payments
  const { cancelPendingPaymentsForSubscription } = await import('@/lib/database/payments');
  const cancelledPaymentsCount = await cancelPendingPaymentsForSubscription(
    subscriptionId,
    'Agreement expired'
  );

  if (cancelledPaymentsCount > 0) {
    console.log(`[expireSubscription] Cancelled ${cancelledPaymentsCount} pending payment(s)`);
  }

  // 3. Update subscription status to expired
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'expired' as SubscriptionStatus,
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) {
    console.error('[expireSubscription] Error updating subscription:', error);
    return null;
  }

  console.log(`[expireSubscription] Subscription ${subscriptionId} expired successfully`);
  return data;
}
