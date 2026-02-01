'use server';

import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getSubscriptionById, cancelSubscription } from '@/lib/database/subscriptions';
import { getPaymentAgreementById, stopPaymentAgreement } from '@/lib/database/payment-agreements';
import { cancelVippsAgreement } from '@/lib/payments/vipps/service';

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Cancel a customer's subscription
 * Sets status to 'cancelled', stops Vipps agreement, and updates payment agreement
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

    // Cancel Vipps agreement via payment agreement
    if (subscription.payment_agreement_id) {
      const paymentAgreement = await getPaymentAgreementById(subscription.payment_agreement_id);
      if (paymentAgreement) {
        try {
          await cancelVippsAgreement(paymentAgreement.provider_agreement_id);
        } catch (vippsError) {
          console.error('Error cancelling Vipps agreement:', vippsError);
          // Continue with database cancellation even if Vipps fails
        }
        // Update payment agreement status
        await stopPaymentAgreement(paymentAgreement.id);
      }
    }

    // Cancel subscription in database
    const result = await cancelSubscription(subscriptionId);

    if (!result) {
      return { success: false, error: 'Failed to cancel subscription' };
    }
    return { success: true };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: 'An error occurred while cancelling subscription' };
  }
}
