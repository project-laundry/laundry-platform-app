import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getSubscriptionWithPlanByCustomerId } from '@/lib/database/subscriptions';
import { getUpcomingOrdersByCustomerId, getCompletedOrdersByCustomerId } from '@/lib/database/orders';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard';
import { EmptySubscriptionState } from '@/components/dashboard/EmptySubscriptionState';
import { UpcomingOrdersList } from '@/components/dashboard/UpcomingOrdersList';
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
  const completedOrders = await getCompletedOrdersByCustomerId(customer.id);

  const userName = user.user_metadata?.full_name || 'Bruker';

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscription Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-dark-gray mb-4">Min abonnement</h2>
          {subscription ? (
            <SubscriptionCard subscription={subscription} />
          ) : (
            <EmptySubscriptionState />
          )}
        </section>

        {/* Upcoming Orders Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-dark-gray mb-4">Kommende vasker</h2>
          <UpcomingOrdersList orders={upcomingOrders} />
        </section>

        {/* Order History Section */}
        {completedOrders.length > 0 && (
          <section>
            <OrderHistorySection orders={completedOrders} />
          </section>
        )}
      </main>
    </div>
  );
}
