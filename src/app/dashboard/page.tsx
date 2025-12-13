import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getSubscriptionWithPlanByCustomerId } from '@/lib/database/subscriptions';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard';
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

  // Get subscription
  const subscription = await getSubscriptionWithPlanByCustomerId(customer.id);

  const userName = user.user_metadata?.full_name || 'Bruker';

  return (
    <div className="min-h-screen bg-soft-gray flex flex-col">
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

      {/* Centered Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {subscription ? (
            <SubscriptionCard subscription={subscription} />
          ) : (
            <EmptySubscriptionState />
          )}
        </div>
      </div>
    </div>
  );
}
