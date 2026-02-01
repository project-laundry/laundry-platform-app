import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getActiveSubscriptionByCustomerId } from '@/lib/database/subscriptions';
import { getUpcomingOrdersByCustomerId, getCompletedOrdersByCustomerId } from '@/lib/database/orders';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { DashboardTabs } from '@/components/dashboard/DashboardTabs';
import { EmptySubscriptionState } from '@/components/dashboard/EmptySubscriptionState';
import { Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-aurora relative overflow-hidden">
      {/* Decorative floating blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 left-10 w-80 h-80 bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-[hsl(var(--sea-green))]/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-card/95 backdrop-blur-md shadow-soft border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="inline-block group">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-serif font-semibold text-[hsl(var(--nordic-blue))] group-hover:text-gradient transition-all">NooraCare</h1>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground font-medium">{userName}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Greeting */}
        <div className="mb-10 animate-fade-in opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <h1 className="font-serif text-4xl md:text-5xl font-light text-foreground mb-3">
            Hei, <span className="text-gradient font-medium">{firstName}</span>
          </h1>
          <p className="text-muted-foreground text-lg">Her kan du se ditt abonnement og alle dine ordre.</p>
        </div>

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
      </main>
    </div>
  );
}
