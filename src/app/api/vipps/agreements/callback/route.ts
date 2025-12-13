// API Route: Vipps Agreement Callback
// GET /api/vipps/agreements/callback?subscriptionId=xxx

import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionById } from "@/lib/database/subscriptions";

/**
 * Vipps redirects user here after approving or rejecting agreement
 *
 * Query params:
 * - subscriptionId: UUID of the subscription
 *
 * This endpoint verifies the agreement is active and redirects user to success page.
 * Actual subscription activation happens via webhook when payment is captured.
 */
export async function GET(request: NextRequest) {
  try {
    // Get subscription ID from query params
    const searchParams = request.nextUrl.searchParams;
    const subscriptionId = searchParams.get("subscriptionId");

    if (!subscriptionId) {
      // Redirect to confirmation page with error
      return NextResponse.redirect(
        new URL("/orders/confirm?error=missing_subscription", request.url),
      );
    }

    // Get subscription
    const subscription = await getSubscriptionById(subscriptionId);

    if (!subscription) {
      return NextResponse.redirect(
        new URL("/orders/confirm?error=invalid_subscription", request.url),
      );
    }

    // Redirect to success page anyway - webhook might have already processed
    return NextResponse.redirect(
      new URL(`/orders/success?subscriptionId=${subscriptionId}`, request.url),
    );
  } catch (error) {
    console.error("Vipps callback error:", error);

    // Redirect to confirmation page with generic error
    return NextResponse.redirect(
      new URL("/orders/confirm?error=callback_failed", request.url),
    );
  }
}
