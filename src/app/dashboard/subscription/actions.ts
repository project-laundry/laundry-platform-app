'use server';

import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getSubscriptionById, cancelSubscription } from '@/lib/database/subscriptions';
import { getPaymentAgreementById, stopPaymentAgreement } from '@/lib/database/payment-agreements';
import { getActiveOrdersBySubscriptionId } from '@/lib/database/orders';
import { cancelVippsAgreement } from '@/lib/payments/vipps/service';

export interface CancelSubscriptionResult {
  success: boolean;
  error?: string;
  /** true => an in-flight order remains; the Vipps stop is deferred until it is charged */
  hasInFlightOrder?: boolean;
}

/**
 * Cancel a customer's subscription
 *
 * Cancels the subscription (and every not-yet-picked-up order) immediately.
 * If an order is already in-flight (picked up or beyond), it survives to complete
 * and be charged normally, and the Vipps agreement stop is deferred until that
 * happens — stopping it now would make the cleaner's future charge fail.
 */
export async function cancelSubscriptionAction(
  subscriptionId: string
): Promise<CancelSubscriptionResult> {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Ikke autentisert' };
    }

    // Get customer
    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return { success: false, error: 'Kundeprofil ikke funnet' };
    }

    // Get subscription and verify ownership
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      return { success: false, error: 'Abonnement ikke funnet' };
    }

    if (subscription.customer_id !== customer.id) {
      return { success: false, error: 'Ikke autorisert' };
    }

    // Check if subscription can be cancelled
    if (!['pending_payment', 'active'].includes(subscription.status)) {
      return { success: false, error: 'Abonnementet kan ikke kanselleres' };
    }

    // Cancel DB state first: this cancels only not-yet-picked-up orders and flips
    // status to 'cancelled', which already blocks new order generation.
    const result = await cancelSubscription(subscriptionId);
    if (!result) {
      return { success: false, error: 'Kunne ikke kansellere abonnementet' };
    }

    // Anything left over after the DB cancel is in-flight by construction.
    const remaining = await getActiveOrdersBySubscriptionId(subscriptionId);
    const hasInFlightOrder = remaining.length > 0;

    if (hasInFlightOrder) {
      // Skip the Vipps stop entirely — the payment agreement stays 'active' so the
      // cleaner's charge for the in-flight order still works. It is stopped later
      // by stopVippsAgreementForCancelledSubscription once that order is settled.
      return { success: true, hasInFlightOrder: true };
    }

    // No in-flight order — stop the Vipps agreement now.
    if (subscription.payment_agreement_id) {
      const paymentAgreement = await getPaymentAgreementById(subscription.payment_agreement_id);
      if (paymentAgreement) {
        try {
          await cancelVippsAgreement(paymentAgreement.provider_agreement_id);
        } catch (vippsError) {
          console.error('Error cancelling Vipps agreement:', vippsError);
          // Continue with database cancellation even if Vipps fails
        }
        await stopPaymentAgreement(paymentAgreement.id);
      }
    }

    return { success: true, hasInFlightOrder: false };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: 'En feil oppstod ved kansellering av abonnementet' };
  }
}
