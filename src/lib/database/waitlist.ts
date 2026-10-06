// Pre-launch waitlist (coming-soon pages). One row per email per audience;
// signing up again is a no-op so the form never reveals whether an email
// is already on the list.

import { createAdminClient } from '@/lib/supabase/admin';
import type { WaitlistAudience, WaitlistCity } from '@/types/database';

export async function addWaitlistSignup(input: {
  email: string;
  audience: WaitlistAudience;
  city: WaitlistCity;
}): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('waitlist_signups')
    .upsert(input, { onConflict: 'email,audience', ignoreDuplicates: true });

  if (error) {
    console.error('Error adding waitlist signup:', error);
    return false;
  }
  return true;
}

/** Number of signups for an audience, or null if the count can't be read. */
export async function getWaitlistCount(audience: WaitlistAudience): Promise<number | null> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('waitlist_signups')
    .select('*', { count: 'exact', head: true })
    .eq('audience', audience);

  if (error) {
    console.error('Error counting waitlist signups:', error);
    return null;
  }
  return count;
}
