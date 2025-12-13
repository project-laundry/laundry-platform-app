// Subscription database operations

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  Weekday,
} from '@/types/database';

export interface CreateSubscriptionData {
  customer_id: string;
  plan_id: string;
  assigned_cleaner_id?: string | null;
  default_extra_kg?: number;
  default_needs_ironing?: boolean;
  default_delicate_items_count?: number;
  recurring_weekday?: Weekday | null;
  delivery_street: string;
  delivery_postal_code: string;
  delivery_city: string;
  delivery_country: string;
  delivery_special_instructions?: string | null;
  billing_cost_ore: number;
  provider_agreement_id: string;
}

/**
 * Create a new subscription with pending_payment status
 * Uses admin client to bypass RLS (no INSERT policy on subscriptions table)
 */
export async function createSubscription(
  data: CreateSubscriptionData
): Promise<Subscription | null> {
  const supabase = createAdminClient();

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      customer_id: data.customer_id,
      plan_id: data.plan_id,
      assigned_cleaner_id: data.assigned_cleaner_id || null,
      default_extra_kg: data.default_extra_kg || 0,
      default_needs_ironing: data.default_needs_ironing || false,
      default_delicate_items_count: data.default_delicate_items_count || 0,
      recurring_weekday: data.recurring_weekday || null,
      delivery_street: data.delivery_street,
      delivery_postal_code: data.delivery_postal_code,
      delivery_city: data.delivery_city,
      delivery_country: data.delivery_country,
      delivery_special_instructions: data.delivery_special_instructions || null,
      billing_cost_ore: data.billing_cost_ore,
      status: 'pending_payment' as SubscriptionStatus,
      started_at: null,
      next_billing_date: null,
      provider_agreement_id: data.provider_agreement_id,
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
 * Get subscription plan by ID
 */
export async function getSubscriptionPlanById(
  planId: string
): Promise<SubscriptionPlan | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get all active subscription plans
 */
export async function getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return [];
  }

  return data;
}

/**
 * Get subscription plan by slug
 */
export async function getSubscriptionPlanBySlug(
  slug: string
): Promise<SubscriptionPlan | null> {
  const supabase = await createClient();

  const { data, error} = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
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
  const supabase = await createAdminClient();

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
