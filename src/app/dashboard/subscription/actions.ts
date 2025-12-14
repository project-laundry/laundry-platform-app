'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getSubscriptionById, pauseSubscription, cancelSubscription } from '@/lib/database/subscriptions';
import { cancelVippsAgreement, cancelPendingVippsChargesForSubscription } from '@/lib/payments/vipps/service';

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Pause a customer's subscription
 * Sets status to 'paused' to skip next billing cycle
 */
export async function pauseSubscriptionAction(
  subscriptionId: string
): Promise<ActionResult> {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get customer
    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    // Get subscription and verify ownership
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    if (subscription.customer_id !== customer.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if subscription can be paused
    if (subscription.status !== 'active') {
      return { success: false, error: 'Only active subscriptions can be paused' };
    }

    if(!subscription.provider_agreement_id) {
      return { success: false, error: 'Subscription does not have a Vipps agreement' };
    }

    // Cancel pending Vipps charges before pausing
    try {
      await cancelPendingVippsChargesForSubscription(subscriptionId, subscription.provider_agreement_id);
    } catch (vippsError) {
      console.error('Error cancelling Vipps charges:', vippsError);
      return {
        success: false,
        error: vippsError instanceof Error
          ? `Failed to cancel pending payments: ${vippsError.message}`
          : 'Failed to cancel pending payments'
      };
    }

    // Pause subscription in database
    const result = await pauseSubscription(subscriptionId);

    if (!result) {
      return { success: false, error: 'Failed to pause subscription' };
    }

    // Redirect to dashboard
    redirect('/dashboard');
  } catch (error) {
    console.error('Error pausing subscription:', error);
    return { success: false, error: 'An error occurred while pausing subscription' };
  }
}

/**
 * Cancel a customer's subscription
 * Sets status to 'cancelled' and stops Vipps agreement
 */
export async function cancelSubscriptionAction(
  subscriptionId: string
): Promise<ActionResult> {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get customer
    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    // Get subscription and verify ownership
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    if (subscription.customer_id !== customer.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if subscription can be cancelled
    if (subscription.status === 'cancelled') {
      return { success: false, error: 'Subscription is already cancelled' };
    }

    // Cancel Vipps agreement if exists
    if (subscription.provider_agreement_id) {
      try {
        await cancelVippsAgreement(subscriptionId);
      } catch (vippsError) {
        console.error('Error cancelling Vipps agreement:', vippsError);
        // Continue with database cancellation even if Vipps fails
      }
    }

    // Cancel subscription in database
    const result = await cancelSubscription(subscriptionId);

    if (!result) {
      return { success: false, error: 'Failed to cancel subscription' };
    }

    // Redirect to dashboard
    redirect('/dashboard');
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: 'An error occurred while cancelling subscription' };
  }
}
