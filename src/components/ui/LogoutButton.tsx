'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-soft-gray text-dark-gray px-4 py-2 rounded-lg hover:bg-gray-200"
    >
      Logg ut
    </button>
  );
}
