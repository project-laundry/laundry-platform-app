'use server';

import { updateOrderStatus } from '@/lib/database/orders';
import { checkAndGenerateNextOrders } from '@/lib/services/order-generation';
import type { OrderStatus } from '@/types/database';

/**
 * Complete an order and trigger next order generation for subscriptions
 *
 * This is a reference implementation showing the proper pattern for order completion.
 * Use this pattern wherever orders are marked as completed (admin dashboard, cleaner dashboard, etc.)
 *
 * @param orderId - The order ID to complete
 * @param subscriptionId - Optional subscription ID (if order is part of a subscription)
 */
export async function completeOrderAction(
  orderId: string,
  subscriptionId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update order status to completed
    const order = await updateOrderStatus(orderId, 'completed');

    if (!order) {
      return { success: false, error: 'Failed to update order status' };
    }

    // If order is part of a subscription, generate next order (fire-and-forget)
    // This maintains the rolling window of 1 upcoming order
    if (subscriptionId || order.subscription_id) {
      const subId = subscriptionId || order.subscription_id;

      if (subId) {
        // Don't await - let this run in background
        checkAndGenerateNextOrders(subId).catch(error => {
          console.error('[Order Completion] Failed to generate next order:', error);
          // TODO: Send admin notification about generation failure
          // This could be via email, Slack, or an in-app notification system
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[Order Completion] Error completing order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update order status with optional next order generation
 *
 * Use this for status changes other than completion (e.g., picked_up, in_cleaning, etc.)
 * that don't trigger next order generation.
 *
 * @param orderId - The order ID
 * @param status - The new status
 */
export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await updateOrderStatus(orderId, status);

    if (!order) {
      return { success: false, error: 'Failed to update order status' };
    }

    return { success: true };
  } catch (error) {
    console.error('[Order Status Update] Error updating status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
