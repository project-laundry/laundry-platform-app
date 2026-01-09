import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { getUsersById } from '@/lib/database/users';
import { LogoutButton } from '@/components/ui/LogoutButton';

export default async function CleanerDashboardPage() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Role check
  const dbUser = await getUsersById(user.id);
  if (!dbUser || dbUser.role !== 'cleaner') {
    redirect('/dashboard');
  }

  // Get cleaner profile
  const cleaner = await getCleanerByUserId(user.id);

  if (!cleaner) {
    // No profile - redirect to onboarding
    redirect('/bli-renser/business');
  }

  const displayName = cleaner.display_name || user.user_metadata?.full_name || 'Renser';
  const firstName = displayName.split(' ')[0];
  const isPending = cleaner.verification_status === 'pending';
  const isApproved = cleaner.verification_status === 'approved';
  const isRejected = cleaner.verification_status === 'rejected';
  const isSuspended = cleaner.verification_status === 'suspended';

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-medium-gray">{displayName}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-gray mb-2">
            Hei, {firstName}!
          </h1>
          <p className="text-medium-gray">Velkommen til renserdashboardet.</p>
        </div>

        {/* Status-based content */}
        {isPending && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">&#8987;</div>
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">
              Profilen din venter på godkjenning
            </h2>
            <p className="text-yellow-700">
              Vi gjennomgår søknaden din og gir deg beskjed via e-post når den er behandlet.
              Dette tar vanligvis 1-2 virkedager.
            </p>
          </div>
        )}

        {isRejected && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">&#10060;</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Søknaden din ble avvist
            </h2>
            <p className="text-red-700">
              Dessverre ble søknaden din ikke godkjent. Ta kontakt med oss for mer informasjon.
            </p>
          </div>
        )}

        {isSuspended && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">&#128683;</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Kontoen din er suspendert
            </h2>
            <p className="text-red-700">
              Ta kontakt med NooraCare for mer informasjon.
            </p>
          </div>
        )}

        {isApproved && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-semibold text-dark-gray mb-4">
              Dine oppdrag
            </h2>
            <p className="text-medium-gray">
              Du har ingen aktive oppdrag for øyeblikket.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
