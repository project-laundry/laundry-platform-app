// API Route: pickup reminders
// GET /api/cron/pickup-reminders
//
// Called by the Vercel cron declared in vercel.json (16:00 UTC daily = 17:00
// in Oslo in winter, 18:00 in summer; Production only). Vercel sends
// `Authorization: Bearer <CRON_SECRET>`; anything else is 401.
// E-mails every customer whose order is in pickup_scheduled with a pickup
// date of TOMORROW (Europe/Oslo): "sett posen klar" (#24). Orders still in
// pending_assignment get nothing — there is no cleaner yet.
//
// Safe to call again the same evening: each send carries the Resend
// Idempotency-Key pickup-reminder/<order.id>/<scheduled_date>, so a repeat
// does not send a second e-mail, and a send that failed is retried.
// Sends go one at a time: one failing send never stops the rest, and the
// pace stays far below Resend's rate limit without any throttling code.
//
// Response codes: 401 bad/missing secret; 500 missing configuration or the
// order query failed; 502 { date, sent, failed } when at least one send
// failed; 200 { date, sent, failed: 0 } otherwise (also when there was
// nothing to send).

import { NextResponse } from 'next/server';
import { getOrdersForPickupReminder } from '@/lib/database/orders';
import { sendPickupReminderEmail } from '@/lib/services/customer-emails';
import { tomorrowInOslo } from '@/lib/utils/date';

// Room for a long evening: sends are sequential (well under a second each).
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.NEXT_PUBLIC_APP_URL) {
    console.error('[Pickup Reminders] RESEND_API_KEY and NEXT_PUBLIC_APP_URL must be set');
    return NextResponse.json({ error: 'Pickup reminders are not configured' }, { status: 500 });
  }

  const date = tomorrowInOslo();
  const orders = await getOrdersForPickupReminder(date);
  if (orders === null) {
    return NextResponse.json({ error: 'Could not load orders' }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  for (const order of orders) {
    if (await sendPickupReminderEmail(order)) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  if (failed > 0) {
    console.error(`[Pickup Reminders] ${date}: ${sent} sent, ${failed} failed`);
    return NextResponse.json({ date, sent, failed }, { status: 502 });
  }

  console.log(`[Pickup Reminders] ${date}: ${sent} sent`);
  return NextResponse.json({ date, sent, failed });
}
