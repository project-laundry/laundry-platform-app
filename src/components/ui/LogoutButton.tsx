'use client';

import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // A full page load drops every page the browser prefetched while signed
    // in, so no link replays a signed-in page after logout.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the full reload is the point
    window.location.assign('/auth/login');
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
    >
      Logg ut
    </button>
  );
}
