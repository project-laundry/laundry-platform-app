import { createClient } from '@supabase/supabase-js';

/**
 * Service role client - BYPASSES ALL RLS POLICIES
 *
 * Use ONLY in trusted server-side code:
 * - API routes (/app/api/*)
 * - Database helpers (/lib/database/*)
 * - Server actions (actions.ts)
 *
 * NEVER use in client components or browser code.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'Get it from: Supabase Dashboard > Project Settings > API > service_role key'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
