import { redirect } from 'next/navigation';
import Link from 'next/link';
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

        {subscription ? (
          <DashboardTabs
            subscription={subscription}
            nextOrder={nextOrder}
            completedOrders={completedOrders}
          />
        ) : (
          <EmptySubscriptionState />
        )}
      </main>
    </div>
  );
}
