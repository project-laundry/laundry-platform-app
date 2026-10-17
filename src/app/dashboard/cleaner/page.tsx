import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { Ban, ChevronRight, Hourglass, Settings, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { getUsersById } from '@/lib/database/users';
import { getOrdersByCleanerId, getCompletedOrdersByCleanerId } from '@/lib/database/orders';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { CleanerDashboardTabs } from './components/CleanerDashboardTabs';
import { formatActiveDays } from '@/lib/config/cleaner-options';

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

  // Availability summary for the dashboard strip (approved cleaners only).
  const activeDaysLabel = formatActiveDays(cleaner.weekly_schedule);

  // Get orders for approved cleaners
  const activeOrders = isApproved ? await getOrdersByCleanerId(cleaner.id) : [];
  const historyOrders = isApproved ? await getCompletedOrdersByCleanerId(cleaner.id) : [];

  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      {/* Header */}
      <AppHeader
        maxWidth="max-w-5xl"
        right={
          <div className="flex items-center gap-4">
            <span className="text-sm text-medium-gray">{displayName}</span>
            <Link
              href="/dashboard/cleaner/settings"
              aria-label="Innstillinger"
              className="text-medium-gray transition-colors hover:text-nordic-blue"
            >
              <Settings className="size-5" />
            </Link>
            <LogoutButton />
          </div>
        }
      />

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8">
        {/* Greeting */}
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Renser
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Hei, {firstName}!
          </h1>
        </div>

        {/* Status-based content */}
        <div
          className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '60ms' }}
        >
          {isPending && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur">
              <span className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-800">
                <Hourglass className="size-6" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Profilen din venter pa godkjenning
              </h2>
              <p className="max-w-md text-medium-gray">
                Vi gjennomgar soknaden din og gir deg beskjed via e-post nar den er behandlet.
                Dette tar vanligvis 1-2 virkedager.
              </p>
            </div>
          )}

          {isRejected && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur">
              <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <XCircle className="size-6" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Soknaden din ble avvist
              </h2>
              <p className="max-w-md text-medium-gray">
                Dessverre ble soknaden din ikke godkjent. Ta kontakt med oss for mer informasjon.
              </p>
            </div>
          )}

          {isSuspended && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur">
              <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Ban className="size-6" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Kontoen din er suspendert
              </h2>
              <p className="max-w-md text-medium-gray">
                Ta kontakt med NooraCare for mer informasjon.
              </p>
            </div>
          )}

          {isApproved && (
            <>
              <Link
                href="/dashboard/cleaner/settings"
                className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-cream-dark bg-white px-4 py-3 transition-colors hover:border-sea-green/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${
                      cleaner.is_accepting_orders ? 'bg-sea-green' : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-dark-gray">
                      {cleaner.is_accepting_orders
                        ? 'Tar imot nye oppdrag'
                        : 'Tar ikke imot nye oppdrag'}
                    </p>
                    <p className="text-sm text-medium-gray">{activeDaysLabel}</p>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-medium-gray" />
              </Link>
              <CleanerDashboardTabs
                activeOrders={activeOrders}
                historyOrders={historyOrders}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
