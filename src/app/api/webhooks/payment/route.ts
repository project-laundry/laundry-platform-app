import { NextRequest, NextResponse } from 'next/server';
import { capturePayment, getPaymentForSubscription, getPaymentById } from '@/lib/database/payments';
import {
  getSubscriptionById,
  activateSubscription,
  activateOneTimeSubscription,
  getSubscriptionPlanById,
} from '@/lib/database/subscriptions';
import { findAvailableCleaner } from '@/lib/database/cleaners';
import { generateOrdersForSubscription } from '@/lib/services/order-generation';
import { updateOrderStatus } from '@/lib/database/orders';

interface PaymentWebhookBody {
  subscriptionId?: string;
  paymentId?: string;
  // For real payment providers, would include:
  // providerPaymentId?: string;
  // status?: string;
}

/**
 * Handle standalone order payment capture
 * Updates order status from pending_payment to pending_assignment
 */
async function handleStandaloneOrderPayment(paymentId: string) {
  try {
    // Get payment record
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check payment status
    if (payment.status === 'captured') {
      return NextResponse.json(
        { error: 'Payment already captured' },
        { status: 400 }
      );
    }

    // Check if payment has an order
    if (!payment.order_id) {
      return NextResponse.json(
        { error: 'No order associated with this payment' },
        { status: 400 }
      );
    }

    // Capture payment
    const capturedPayment = await capturePayment(paymentId);
    if (!capturedPayment) {
      return NextResponse.json(
        { error: 'Failed to capture payment' },
        { status: 500 }
      );
    }

    // Update order status from pending_payment
    // Check if cleaner is already assigned during order creation
    const { getOrderById } = await import('@/lib/database/orders');
    const order = await getOrderById(payment.order_id);

    const newStatus = order?.cleaner_id ? 'pickup_scheduled' : 'pending_assignment';
    const updatedOrder = await updateOrderStatus(payment.order_id, newStatus);
    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: capturedPayment.id,
        status: capturedPayment.status,
        captured_at: capturedPayment.captured_at,
      },
      order: {
        id: updatedOrder.id,
        order_number: updatedOrder.order_number,
        status: updatedOrder.status,
        scheduled_date: updatedOrder.scheduled_date,
        delivery_date: updatedOrder.delivery_date,
      },
    });
  } catch (error) {
    console.error('Standalone order payment webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Payment webhook endpoint
 *
 * For mock payments: Call manually from Postman
 * For real payments: Will be called by Vipps/Stripe
 *
 * POST /api/webhooks/payment
 * Body: { subscriptionId: "uuid" } OR { paymentId: "uuid" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PaymentWebhookBody;
    const { subscriptionId, paymentId } = body;

    if (!subscriptionId && !paymentId) {
      return NextResponse.json(
        { error: 'Either subscriptionId or paymentId is required' },
        { status: 400 }
      );
    }

    // Handle standalone order payment
    if (paymentId) {
      return handleStandaloneOrderPayment(paymentId);
    }

    // Handle subscription payment (existing logic)
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId is required' },
        { status: 400 }
      );
    }

    // 1. Get subscription
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check subscription is pending payment
    if (subscription.status !== 'pending_payment') {
      return NextResponse.json(
        { error: `Subscription is not pending payment. Status: ${subscription.status}` },
        { status: 400 }
      );
    }

    // 2. Get payment for subscription
    const payment = await getPaymentForSubscription(subscriptionId);
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found for subscription' },
        { status: 404 }
      );
    }

    // 3. Capture payment (mark as successful)
    const capturedPayment = await capturePayment(payment.id);
    if (!capturedPayment) {
      return NextResponse.json(
        { error: 'Failed to capture payment' },
        { status: 500 }
      );
    }

    // 4. Get subscription plan
    const plan = await getSubscriptionPlanById(subscription.plan_id);
    if (!plan) {
      return NextResponse.json(
        { error: 'Subscription plan not found' },
        { status: 404 }
      );
    }

    // 5. Validate subscription has address
    if (!subscription.delivery_street || !subscription.delivery_city) {
      return NextResponse.json(
        { error: 'Subscription must have delivery address' },
        { status: 400 }
      );
    }

    // 6. Find available cleaner
    let cleanerId: string | null = null;

    if (subscription.recurring_weekday) {
      const cleaner = await findAvailableCleaner(
        subscription.delivery_city,
        subscription.recurring_weekday
      );
      cleanerId = cleaner?.id || null;
    }

    // 7. Activate subscription
    let activatedSubscription;
    if (plan.billing_period === 'one_time') {
      activatedSubscription = await activateOneTimeSubscription(
        subscriptionId,
        cleanerId
      );
    } else {
      activatedSubscription = await activateSubscription(
        subscriptionId,
        cleanerId
      );
    }

    if (!activatedSubscription) {
      return NextResponse.json(
        { error: 'Failed to activate subscription' },
        { status: 500 }
      );
    }

    // 8. Generate orders
    const { orders, bagDelivery } = await generateOrdersForSubscription(
      activatedSubscription,
      plan,
      {
        street: subscription.delivery_street,
        postal_code: subscription.delivery_postal_code,
        city: subscription.delivery_city,
        country: subscription.delivery_country,
        special_instructions: subscription.delivery_special_instructions,
      }
    );

    // Return success response
    return NextResponse.json({
      success: true,
      subscription: {
        id: activatedSubscription.id,
        status: activatedSubscription.status,
        started_at: activatedSubscription.started_at,
        next_billing_date: activatedSubscription.next_billing_date,
        assigned_cleaner_id: activatedSubscription.assigned_cleaner_id,
      },
      payment: {
        id: capturedPayment.id,
        status: capturedPayment.status,
        captured_at: capturedPayment.captured_at,
      },
      orders: orders.map((order) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        scheduled_date: order.scheduled_date,
        delivery_date: order.delivery_date,
      })),
      bagDelivery: bagDelivery
        ? {
            id: bagDelivery.id,
            delivery_number: bagDelivery.delivery_number,
            scheduled_date: bagDelivery.scheduled_date,
          }
        : null,
      cleanerAssigned: !!cleanerId,
    });
  } catch (error) {
    console.error('Payment webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
