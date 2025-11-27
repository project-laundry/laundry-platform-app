import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing required environment variables:\n' +
      '  - NEXT_PUBLIC_SUPABASE_URL\n' +
      '  - SUPABASE_SERVICE_ROLE_KEY\n\n' +
      'Get your service role key from:\n' +
      'Supabase Dashboard → Project Settings → API → service_role (secret)'
    );
  }

  if (supabaseServiceKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY appears to be the anon key.\n' +
      'You need the SERVICE ROLE key from:\n' +
      'Supabase Dashboard → Project Settings → API → service_role (secret)'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
