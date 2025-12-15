import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getSubscriptionWithPlanByCustomerId } from '@/lib/database/subscriptions';
import { getUpcomingOrdersByCustomerId, getCompletedOrdersByCustomerId } from '@/lib/database/orders';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { SubscriptionOverviewCard } from '@/components/dashboard/SubscriptionOverviewCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { LatestOrderCard } from '@/components/dashboard/LatestOrderCard';
import { EmptySubscriptionState } from '@/components/dashboard/EmptySubscriptionState';
import { OrderHistorySection } from '@/components/dashboard/OrderHistorySection';

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
  const subscription = await getSubscriptionWithPlanByCustomerId(customer.id);
  const upcomingOrders = await getUpcomingOrdersByCustomerId(customer.id);
  const nextOrder = upcomingOrders.length > 0 ? upcomingOrders[0] : null;
  const completedOrders = await getCompletedOrdersByCustomerId(customer.id);

  const userName = user.user_metadata?.full_name || 'Bruker';
  const firstName = userName.split(' ')[0];

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
              <span className="text-medium-gray">{userName}</span>
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
            Hei, {firstName}! 👋
          </h1>
          <p className="text-medium-gray">Her kan du se ditt abonnement og alle dine ordrer.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button className="px-4 py-2 rounded-lg bg-[hsl(var(--nordic-blue))] text-white font-medium">
            Oversikt
          </button>
          <button className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-medium-gray font-medium hover:border-nordic-blue transition-colors">
            Ordrehistorikk
          </button>
        </div>

        {subscription ? (
          <>
            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-[1fr_400px] gap-6 mb-8">
              {/* Left: Subscription Overview */}
              <SubscriptionOverviewCard
                subscription={subscription}
                nextOrder={nextOrder}
              />

              {/* Right: Quick Actions */}
              <QuickActionsCard
                subscriptionId={subscription.id}
                subscriptionStatus={subscription.status}
              />
            </div>

            {/* Latest Order */}
            {nextOrder && (
              <div className="mb-8">
                <LatestOrderCard order={nextOrder} />
              </div>
            )}

            {/* Order History (hidden by default, shown on tab click) */}
            {completedOrders.length > 0 && (
              <div className="hidden">
                <OrderHistorySection orders={completedOrders} />
              </div>
            )}
          </>
        ) : (
          <EmptySubscriptionState />
        )}
      </main>
    </div>
  );
}
