import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getSubscriptionWithPlanByCustomerId } from '@/lib/database/subscriptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { oreToNok } from '@/lib/config/pricing';
import {
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
  getSubscriptionFrequencyLabel,
} from '@/lib/utils/subscription-status';
import { cancelSubscriptionAction } from '../actions';

export default async function ManageSubscriptionPage() {
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

  // Redirect to dashboard if no subscription
  if (!subscription) {
    redirect('/dashboard');
  }

  const { plan, status } = subscription as any;
  const canCancel = status !== 'cancelled';

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
            </Link>
            <Link href="/dashboard" className="text-medium-gray hover:text-dark-gray">
              Tilbake
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-dark-gray mb-8">Administrer abonnement</h2>

        {/* Current Subscription Details */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ditt abonnement</CardTitle>
              <Badge variant={getSubscriptionStatusVariant(status)}>
                {getSubscriptionStatusLabel(status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-medium-gray mb-1">Plan</p>
                <p className="font-semibold text-dark-gray text-lg">{plan?.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-medium-gray mb-1">Frekvens</p>
                  <p className="font-medium text-dark-gray">
                    {plan?.frequency ? getSubscriptionFrequencyLabel(plan.frequency as any) : 'Månedlig'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-medium-gray mb-1">Pris/måned</p>
                  <p className="font-medium text-dark-gray">
                    {oreToNok(subscription.billing_cost_ore)} kr
                  </p>
                </div>
                <div>
                  <p className="text-sm text-medium-gray mb-1">Inkludert vekt</p>
                  <p className="font-medium text-dark-gray">
                    {plan?.included_kg || 0} kg
                  </p>
                </div>
                {subscription.recurring_weekday && (
                  <div>
                    <p className="text-sm text-medium-gray mb-1">Hentedag</p>
                    <p className="font-medium text-dark-gray capitalize">
                      {subscription.recurring_weekday}
                    </p>
                  </div>
                )}
              </div>
              {subscription.next_billing_date && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-medium-gray mb-1">Neste faktura</p>
                  <p className="font-medium text-dark-gray">
                    {new Date(subscription.next_billing_date).toLocaleDateString('no-NO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="space-y-4">
          {/* Cancel Action */}
          <Card className={!canCancel ? 'opacity-50' : ''}>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Kanseller abonnement
              </h3>
              <p className="text-medium-gray text-sm mb-4">
                Dette vil permanent kansellere abonnementet ditt og stoppe Vipps-avtalen.
                Du vil ikke bli fakturert igjen.
              </p>
              <form
                action={async () => {
                  'use server';
                  if (confirm('Er du sikker på at du vil kansellere abonnementet? Dette kan ikke angres.')) {
                    await cancelSubscriptionAction(subscription.id);
                  }
                }}
              >
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={!canCancel}
                  className="w-full"
                >
                  {status === 'cancelled' ? 'Allerede kansellert' : 'Kanseller abonnement'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-medium-gray hover:text-dark-gray transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Tilbake til dashbord
          </Link>
        </div>
      </div>
    </div>
  );
}
