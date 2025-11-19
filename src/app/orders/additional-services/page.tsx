import { getSubscriptionPlanBySlug } from '@/lib/database/subscriptions';
import { AdditionalServicesForm } from './AdditionalServicesForm';

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function AdditionalServicesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const planSlug = params.plan || 'single';

  // Fetch plan from database
  const plan = await getSubscriptionPlanBySlug(planSlug);

  if (!plan) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-gray mb-2">Plan ikke funnet</h1>
          <p className="text-medium-gray">Kunne ikke finne den valgte planen.</p>
        </div>
      </div>
    );
  }

  return (
    <AdditionalServicesForm
      planSlug={plan.slug}
      planName={plan.name}
      planPriceOre={plan.price_ore}
      planFrequency={plan.frequency}
    />
  );
}
