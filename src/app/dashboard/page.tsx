import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, CalendarPlus } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getUsersById } from '@/lib/database/users';
import { getActiveSubscriptionByCustomerId } from '@/lib/database/subscriptions';
import { getUpcomingOrdersByCustomerId, getCompletedOrdersByCustomerId } from '@/lib/database/orders';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { EmptySubscriptionState } from '@/components/dashboard/EmptySubscriptionState';
import { NextPickupCard } from '@/components/dashboard/NextPickupCard';
import { SubscriptionStrip } from '@/components/dashboard/SubscriptionStrip';
import { OrderRow } from '@/components/dashboard/OrderRow';
import { HistorySection } from '@/components/dashboard/HistorySection';

export default async function DashboardPage() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Non-customer roles have their own dashboards
  const dbUser = await getUsersById(user.id);
  if (dbUser?.role === 'cleaner') {
    redirect('/dashboard/cleaner');
  }
  if (dbUser?.role === 'driver') {
    redirect('/dashboard/driver');
  }
  if (dbUser?.role === 'admin') {
    redirect('/admin/orders');
  }

  // Get customer
  const customer = await getCustomerByUserId(user.id);
  if (!customer) {
    redirect('/auth/signup');
  }

  // Get subscription and orders
  const [subscription, upcomingOrders, completedOrders] = await Promise.all([
    getActiveSubscriptionByCustomerId(customer.id),
    getUpcomingOrdersByCustomerId(customer.id),
    getCompletedOrdersByCustomerId(customer.id),
  ]);
  const nextOrder = upcomingOrders.length > 0 ? upcomingOrders[0] : null;
  const laterOrders = upcomingOrders.slice(1);

  const userName = user.user_metadata?.full_name || 'Bruker';
  const firstName = userName.split(' ')[0];

  // Show empty state only if no subscription AND no orders
  const hasNoActivity = !subscription && upcomingOrders.length === 0 && completedOrders.length === 0;

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
            <span className="hidden text-sm font-medium text-medium-gray sm:block">
              {userName}
            </span>
            <LogoutButton />
          </div>
        }
      />

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        {/* Greeting row */}
        <div className="flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <h1 className="font-serif text-2xl font-semibold text-dark-gray">
            Hei, {firstName}
          </h1>
          {nextOrder && (
            <Link
              href="/orders/wash"
              className="inline-flex items-center gap-1.5 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
            >
              <Plus className="size-4" />
              Bestill ny vask
            </Link>
          )}
        </div>

        {hasNoActivity ? (
          <div className="mt-6">
            <EmptySubscriptionState />
          </div>
        ) : (
          <>
            {/* Next pickup */}
            <div
              className="mt-4 animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: '60ms' }}
            >
              {nextOrder ? (
                <NextPickupCard order={nextOrder} />
              ) : (
                <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 text-center shadow-[var(--shadow-card)] backdrop-blur">
                  <p className="text-medium-gray">Ingen kommende henting planlagt</p>
                  <Link
                    href="/orders/wash"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
                  >
                    <CalendarPlus className="size-4" />
                    Bestill ny vask
                  </Link>
                </div>
              )}
            </div>

            {/* Subscription strip */}
            {subscription && (
              <div
                className="mt-4 animate-in fade-in slide-in-from-bottom-3 duration-500"
                style={{ animationDelay: '120ms' }}
              >
                <SubscriptionStrip subscription={subscription} />
              </div>
            )}

            {/* Further upcoming pickups */}
            {laterOrders.length > 0 && (
              <div
                className="mt-4 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500"
                style={{ animationDelay: '180ms' }}
              >
                <h2 className="px-5 pb-3 pt-4 font-serif text-lg font-semibold text-dark-gray">
                  Flere hentinger
                </h2>
                <ul className="divide-y divide-cream-dark/60 border-t border-cream-dark/60">
                  {laterOrders.map((order) => (
                    <li key={order.id}>
                      <OrderRow order={order} context="upcoming" />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* History */}
            <div
              className="mt-4 animate-in fade-in slide-in-from-bottom-3 duration-500"
              style={{ animationDelay: '240ms' }}
            >
              <HistorySection orders={completedOrders} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
