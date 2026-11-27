import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { Ban, ChevronRight, Hourglass, Mail, Phone, Settings, Star, Wallet, XCircle } from 'lucide-react';
import { requireViewer } from '@/lib/auth/view-as';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { getOrdersByCleanerId, getCompletedOrdersByCleanerId } from '@/lib/database/orders';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { CleanerOrderList } from './components/CleanerOrderList';
import { todayInOslo } from '@/lib/utils/date';
import { formatKrExact } from '@/lib/config/pricing';
import { monthLabel, payoutDueDate, summarizeCleanerMonth } from '@/lib/utils/payout';
import { COMPANY, phoneHref } from '@/lib/config/company';
import { getCleanerRating } from '@/lib/database/evaluations';
import { SATISFACTION_QUESTION, formatRating, isCleanerRatingShown } from '@/lib/config/evaluation';

/** NooraCare's contact details for the rejected / suspended screens — from
 *  lib/config/company.ts, like /kontakt and /bli-renser/success. */
function ContactDetails() {
  return (
    <ul className="mt-1 space-y-2 text-sm text-dark-gray">
      <li className="flex items-center justify-center gap-2">
        <Mail className="size-4 text-sea-green" />
        <a href={`mailto:${COMPANY.email}`} className="transition-colors hover:text-nordic-blue">
          {COMPANY.email}
        </a>
      </li>
      <li className="flex items-center justify-center gap-2">
        <Phone className="size-4 text-sea-green" />
        <a href={phoneHref()} className="transition-colors hover:text-nordic-blue">
          {COMPANY.phoneDisplay}
        </a>
      </li>
    </ul>
  );
}

export default async function CleanerDashboardPage() {
  // Cleaners only (or an admin viewing one, see lib/auth/view-as.ts)
  const viewer = await requireViewer(['cleaner']);

  // Get cleaner profile
  const cleaner = await getCleanerByUserId(viewer.userId);

  if (!cleaner) {
    // No profile - redirect to onboarding
    redirect('/bli-renser/business');
  }

  const displayName = cleaner.display_name || viewer.dbUser.full_name || 'Renser';
  const firstName = displayName.split(' ')[0];
  const isPending = cleaner.verification_status === 'pending';
  const isApproved = cleaner.verification_status === 'approved';
  const isRejected = cleaner.verification_status === 'rejected';
  const isSuspended = cleaner.verification_status === 'suspended';

  // Get orders for approved cleaners
  const activeOrders = isApproved ? await getOrdersByCleanerId(cleaner.id) : [];
  const historyOrders = isApproved ? await getCompletedOrdersByCleanerId(cleaner.id) : [];
  // Null when the read failed — the rating row is then left out.
  const rating = isApproved ? await getCleanerRating(cleaner.id) : null;
  const today = todayInOslo();
  const currentMonth = today.slice(0, 7);
  const monthSummary = summarizeCleanerMonth(historyOrders, currentMonth);
  const payoutDue = payoutDueDate(currentMonth);

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
        right={
          <div className="flex items-center gap-4">
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
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        {/* Greeting + availability (approved cleaners only) */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <h1 className="min-w-0 break-words font-serif text-3xl font-semibold text-dark-gray">
            Hei, {firstName}
          </h1>
          {isApproved && (
            <Link
              href="/dashboard/cleaner/settings"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cream-dark bg-white py-1.5 pl-3 pr-2 text-sm font-medium text-dark-gray transition-colors hover:border-sea-green/50"
            >
              <span
                aria-hidden
                className={`size-2 rounded-full ${
                  cleaner.is_accepting_orders ? 'bg-sea-green' : 'bg-amber-500'
                }`}
              />
              {cleaner.is_accepting_orders ? 'Tar imot oppdrag' : 'Tar ikke imot oppdrag'}
              <ChevronRight className="size-4 text-medium-gray" />
            </Link>
          )}
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
                Profilen din venter på godkjenning
              </h2>
              <p className="max-w-md text-medium-gray">
                Vi gjennomgår søknaden din. Du ser status her i dashbordet når den er behandlet –
                det tar vanligvis 1–2 virkedager.
              </p>
            </div>
          )}

          {isRejected && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur">
              <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <XCircle className="size-6" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Søknaden din ble avvist
              </h2>
              <p className="max-w-md text-medium-gray">
                Dessverre ble søknaden din ikke godkjent.
              </p>
              {cleaner.rejection_reason && (
                <div className="w-full max-w-md rounded-2xl bg-cream/60 px-4 py-3 text-left">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-medium-gray">
                    Begrunnelse
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-dark-gray">
                    {cleaner.rejection_reason}
                  </p>
                </div>
              )}
              <p className="max-w-md text-sm text-medium-gray">
                Har du spørsmål, eller mener du dette er feil? Ta kontakt med oss.
              </p>
              <ContactDetails />
            </div>
          )}

          {isSuspended && (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur">
              <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Ban className="size-6" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Kontoen din er deaktivert
              </h2>
              <p className="max-w-md text-medium-gray">
                Du får ingen nye oppdrag før kontoen er aktivert igjen. Ta kontakt med oss for mer
                informasjon.
              </p>
              <ContactDetails />
            </div>
          )}

          {isApproved && (
            <>
              {/* The work first — the cleaner opens this on the phone at the door. */}
              <CleanerOrderList
                orders={activeOrders}
                today={today}
                home={{
                  latitude: cleaner.latitude,
                  longitude: cleaner.longitude,
                  address: `${cleaner.base_street}, ${cleaner.base_postal_code} ${cleaner.base_city}`,
                }}
              />

              {/* This month's income in one line; the rest lives on its own page. */}
              <Link
                href="/dashboard/cleaner/earnings"
                className="mt-6 flex items-center gap-3 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-4 shadow-[var(--shadow-card)] backdrop-blur transition-colors hover:border-sea-green/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <Wallet className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-dark-gray">
                    Opptjent i {monthLabel(currentMonth)}
                  </span>
                  <span className="block truncate text-sm text-medium-gray">
                    {monthSummary.orderCount} fullførte oppdrag · utbetales innen{' '}
                    {Number(payoutDue.slice(8, 10))}. {monthLabel(payoutDue.slice(0, 7))}
                  </span>
                </span>
                <span className="shrink-0 font-serif text-xl font-semibold tabular-nums text-dark-gray">
                  {formatKrExact(monthSummary.payoutOre)}
                </span>
                <ChevronRight className="size-4 shrink-0 text-medium-gray" />
              </Link>

              {/* Mean customer rating — a number only from CLEANER_RATING_MIN_COUNT ratings. */}
              {rating && (
                <div className="mt-3 flex items-center gap-3 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-4 shadow-[var(--shadow-card)] backdrop-blur">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                    <Star className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-dark-gray">Din vurdering</span>
                    <span className="block text-sm text-medium-gray">
                      {isCleanerRatingShown(rating)
                        ? `Snitt av ${rating.count} kundevurderinger`
                        : rating.count === 0
                          ? 'Ingen vurderinger ennå'
                          : 'For få vurderinger ennå – vises fra 3'}
                    </span>
                  </span>
                  {isCleanerRatingShown(rating) && (
                    <span className="shrink-0 font-serif text-xl font-semibold tabular-nums text-dark-gray">
                      {formatRating(rating.average)} av {SATISFACTION_QUESTION.to}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
