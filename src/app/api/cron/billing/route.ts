// API Route: Recurring Billing Scheduler
// GET /api/cron/billing
//
// Scheduled daily to create recurring charges for subscriptions due for billing
// Configure in vercel.json or via Vercel Dashboard

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRecurringChargeForSubscription } from '@/lib/payments/vipps/service';

/**
 * Recurring billing cron job
 *
 * Runs daily (recommended: 2:00 AM) to check for subscriptions due for billing
 * Creates Vipps charges for subscriptions where next_billing_date <= today
 */
export async function GET(request: NextRequest) {
  try {
    // Validate cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.error('[Billing Cron] Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Billing Cron] Starting recurring billing job...');

    // Initialize Supabase client with service role
    const supabase = await createClient();

    // Find subscriptions due for billing
    // - status = 'active'
    // - next_billing_date <= today
    // - provider_agreement_id is not null (has Vipps agreement)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_billing_date', today)
      .not('provider_agreement_id', 'is', null);

    if (error) {
      console.error('[Billing Cron] Error fetching subscriptions:', error);
      throw error;
    }

    console.log(`[Billing Cron] Found ${subscriptions?.length || 0} subscriptions due for billing`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { subscriptionId: string; error: string }[],
    };

    // Process each subscription
    for (const subscription of subscriptions || []) {
      try {
        console.log(`[Billing Cron] Creating charge for subscription ${subscription.id}`);

        // Create recurring charge via Vipps
        const paymentId = await createRecurringChargeForSubscription(subscription.id);

        console.log(`[Billing Cron] Charge created for subscription ${subscription.id}, payment ID: ${paymentId}`);

        results.success++;
      } catch (error) {
        console.error(`[Billing Cron] Failed to create charge for subscription ${subscription.id}:`, error);

        results.failed++;
        results.errors.push({
          subscriptionId: subscription.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[Billing Cron] Job complete. Success: ${results.success}, Failed: ${results.failed}`);

    // Return summary
    return NextResponse.json({
      success: true,
      processed: subscriptions?.length || 0,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Billing Cron] Job error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
