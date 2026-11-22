// API Route: daily admin digest
// GET /api/cron/admin-digest
//
// Called by the Vercel cron declared in vercel.json (06:00 UTC daily, Production
// only). Vercel sends `Authorization: Bearer <CRON_SECRET>`; anything else is 401.
// Builds the same attention lists as /admin and e-mails them as plain text to
// every admin user, one message each (lib/email/admin-mail.ts).
// Sent even when there is nothing to follow up, so a missing e-mail means the
// cron or the sender is broken.
//
// Response codes: 401 bad/missing secret; 500 missing configuration or no
// recipients; 502 when any admin's copy was rejected ({ sent, failed });
// 200 { sent: <recipient count> }.

import { NextResponse } from 'next/server';
import { getAdminAttention } from '@/lib/database/admin-attention';
import { buildAdminDigest } from '@/lib/services/admin-digest';
import { sendToAdmins } from '@/lib/email/admin-mail';

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !appUrl) {
    console.error('[Admin Digest] RESEND_API_KEY and NEXT_PUBLIC_APP_URL must be set');
    return NextResponse.json({ error: 'Digest is not configured' }, { status: 500 });
  }

  const attention = await getAdminAttention();
  const { subject, text } = buildAdminDigest(attention, { appUrl, now: new Date() });

  const { recipients, sent } = await sendToAdmins({ subject, text });
  if (recipients === 0) {
    console.error('[Admin Digest] No admin users to send to');
    return NextResponse.json({ error: 'No recipients' }, { status: 500 });
  }
  if (sent < recipients) {
    console.error(`[Admin Digest] Only ${sent} of ${recipients} admin(s) reached: ${subject}`);
    return NextResponse.json({ error: 'Send failed', sent, failed: recipients - sent }, { status: 502 });
  }

  console.log(`[Admin Digest] Sent to ${recipients} admin(s): ${subject}`);
  return NextResponse.json({ sent });
}
