// Rate limiting for server actions that answer a yes/no question an attacker
// could ask in bulk (is this e-mail registered? is this promo code valid?).
// A fixed-window counter in Postgres (rate_limit_hit, see the migration
// 20261122160000_add_rate_limit_hits.sql) — no extra service.
//
// Fails OPEN: if the counter cannot be read, the action runs as before. A
// database hiccup must never lock customers out of signing up or ordering.
// Callers decide what a limited call returns; it should reveal nothing.

import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export interface RateLimit {
  /** Calls allowed per window. */
  limit: number;
  windowSeconds: number;
}

/** 10 attempts per 10 minutes — far above what a person typing in a form needs. */
export const PRECHECK_RATE_LIMIT: RateLimit = { limit: 10, windowSeconds: 600 };

/** Key for the counter. The subject (IP address or user id) is hashed, never stored raw. */
export function rateLimitKey(action: string, subject: string): string {
  return `${action}:${createHash('sha256').update(subject).digest('hex').slice(0, 32)}`;
}

/** The caller's IP as Vercel reports it, or 'unknown' (all unknown callers share one bucket). */
export async function clientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || requestHeaders.get('x-real-ip') || 'unknown';
}

/** Counts this call and says whether `subject` is over the limit for `action`. */
export async function isRateLimited(
  action: string,
  subject: string,
  { limit, windowSeconds }: RateLimit = PRECHECK_RATE_LIMIT
): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc('rate_limit_hit', {
      p_key: rateLimitKey(action, subject),
      p_window_seconds: windowSeconds,
    });
    if (error || typeof data !== 'number') {
      console.error(`[Rate limit] Could not count ${action}:`, error);
      return false;
    }
    if (data > limit) {
      console.warn(`[Rate limit] ${action} limited (${data} calls in ${windowSeconds}s)`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[Rate limit] Could not count ${action}:`, error);
    return false;
  }
}
