import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getActiveSubscriptionByCustomerId } from '@/lib/database/subscriptions';
import { getUpcomingOrdersByCustomerId, getCompletedOrdersByCustomerId } from '@/lib/database/orders';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { DashboardTabs } from '@/components/dashboard/DashboardTabs';
import { EmptySubscriptionState } from '@/components/dashboard/EmptySubscriptionState';

export default async function DashboardPage() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get customer
  const customer = await getCustomerByUserId(user.id);
  if (!customer) {
    redirect('/auth/signup');
  }

  // Get subscription and orders
  const subscription = await getActiveSubscriptionByCustomerId(customer.id);
  const upcomingOrders = await getUpcomingOrdersByCustomerId(customer.id);
  const nextOrder = upcomingOrders.length > 0 ? upcomingOrders[0] : null;
  const completedOrders = await getCompletedOrdersByCustomerId(customer.id);

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
        maxWidth="max-w-5xl"
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
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8">
        {/* Greeting */}
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Hei, {firstName}
          </h1>
          <p className="mt-3 max-w-md text-medium-gray">
            Her kan du se ditt abonnement og alle dine ordre.
          </p>
        </div>

        <div className="mt-8">
          {hasNoActivity ? (
            <EmptySubscriptionState />
          ) : (
            <DashboardTabs
              subscription={subscription}
              nextOrder={nextOrder}
              completedOrders={completedOrders}
              upcomingOrders={upcomingOrders}
            />
          )}
        </div>
      </main>
    </div>
  );
}
