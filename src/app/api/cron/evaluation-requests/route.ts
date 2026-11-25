// API Route: evaluation requests
// GET /api/cron/evaluation-requests
//
// Called by the Vercel cron declared in vercel.json (09:00 UTC daily = 10:00
// in Oslo in winter, 11:00 in summer; Production only). Vercel sends
// `Authorization: Bearer <CRON_SECRET>`; anything else is 401.
// E-mails every customer whose order was delivered YESTERDAY (Europe/Oslo,
// status completed) and is not evaluated yet: «Hvordan var vasken?» with the
// first question as link buttons.
//
// Safe to call again the same day: each send carries the Resend
// Idempotency-Key evaluation-request/<order.id>, so a repeat does not send a
// second e-mail, and a send that failed is retried. Sends go one at a time:
// one failing send never stops the rest.
//
// Response codes: 401 bad/missing secret; 500 missing configuration or a
// query failed; 502 { date, sent, skipped, failed } when at least one send
// failed; 200 { date, sent, skipped, failed: 0 } otherwise (also when there
// was nothing to send). `skipped` = orders that already have an evaluation.

import { NextResponse } from 'next/server';
import { getEvaluatedOrderIds } from '@/lib/database/evaluations';
import { getOrdersDeliveredOn } from '@/lib/database/orders';
import { sendEvaluationRequestEmail } from '@/lib/services/customer-emails';
import { yesterdayInOslo } from '@/lib/utils/date';

// Sends are sequential (well under a second each).
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.NEXT_PUBLIC_APP_URL) {
    console.error('[Evaluation Requests] RESEND_API_KEY and NEXT_PUBLIC_APP_URL must be set');
    return NextResponse.json({ error: 'Evaluation requests are not configured' }, { status: 500 });
  }

  const date = yesterdayInOslo();
  const orders = await getOrdersDeliveredOn(date);
  if (orders === null) {
    return NextResponse.json({ error: 'Could not load orders' }, { status: 500 });
  }

  const evaluated = await getEvaluatedOrderIds(orders.map((order) => order.id));
  if (evaluated === null) {
    return NextResponse.json({ error: 'Could not load evaluations' }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const order of orders) {
    if (evaluated.has(order.id)) {
      skipped += 1;
    } else if (await sendEvaluationRequestEmail(order)) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  if (failed > 0) {
    console.error(`[Evaluation Requests] ${date}: ${sent} sent, ${skipped} skipped, ${failed} failed`);
    return NextResponse.json({ date, sent, skipped, failed }, { status: 502 });
  }

  console.log(`[Evaluation Requests] ${date}: ${sent} sent, ${skipped} skipped`);
  return NextResponse.json({ date, sent, skipped, failed });
}
