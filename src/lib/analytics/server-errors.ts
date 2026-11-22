// Server-side half of PostHog error tracking: reportError() (the e-mail
// alert, lib/services/error-alerts.ts) also sends the error here, so server
// failures sit next to the browser errors, funnels and recordings in PostHog.
// Runs only where NEXT_PUBLIC_POSTHOG_KEY is set (production). Never throws.

import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

export async function captureServerException(
  source: string,
  error: unknown,
  details: Record<string, string | number | null | undefined> = {}
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  try {
    // flushAt 1 / flushInterval 0: a serverless function may be frozen right
    // after the response, so nothing may wait in a queue.
    client ??= new PostHog(key, {
      host: 'https://eu.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
      disableGeoip: true,
    });
    await client.captureExceptionImmediate(error instanceof Error ? error : new Error(String(error)), {
      // One fixed id: server errors belong to no visitor and create no person.
      distinctId: 'server',
      properties: { ...details, source, $process_person_profile: false },
    });
  } catch (captureError) {
    console.error('[Error tracking] Could not send the error to PostHog:', captureError);
  }
}
