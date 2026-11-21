import { redirect } from 'next/navigation';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { requireRole } from '@/lib/auth/require-role';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { getCompletedOrdersByCleanerId } from '@/lib/database/orders';
import { todayInOslo } from '@/lib/utils/date';
import { CleanerEarnings } from '../components/CleanerEarnings';
import { CleanerVatCard } from '../components/CleanerVatCard';

/** The cleaner's income: payout per month, the orders behind it and the VAT limit. */
export default async function CleanerEarningsPage() {
  const { authUserId } = await requireRole(['cleaner']);

  const cleaner = await getCleanerByUserId(authUserId);
  if (!cleaner) {
    redirect('/bli-renser/business');
  }
  // Only approved cleaners have orders; the dashboard explains every other status.
  if (cleaner.verification_status !== 'approved') {
    redirect('/dashboard/cleaner');
  }

  const orders = await getCompletedOrdersByCleanerId(cleaner.id);

  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      <AppHeader />

      <main className="mx-auto max-w-2xl space-y-4 px-5 pb-16 pt-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <BackLink href="/dashboard/cleaner" />
        <CleanerEarnings orders={orders} today={todayInOslo()} />
        <CleanerVatCard orders={orders} />
      </main>
    </div>
  );
}
