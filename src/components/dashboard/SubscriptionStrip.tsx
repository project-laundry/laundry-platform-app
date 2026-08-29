import { Repeat } from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  getSubscriptionFrequencyLabel,
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
} from '@/lib/utils/subscription-status';
import type { Subscription } from '@/types/database';

// Compact one-row summary of the customer's subscription.
export function SubscriptionStrip({ subscription }: { subscription: Subscription }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-cream-dark/80 bg-warm-white/80 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
          <Repeat className="size-5" />
        </span>
        <span className="text-sm font-medium text-dark-gray">
          {getSubscriptionFrequencyLabel(subscription.frequency)} abonnement
        </span>
      </div>
      <StatusBadge variant={getSubscriptionStatusVariant(subscription.status)}>
        {getSubscriptionStatusLabel(subscription.status)}
      </StatusBadge>
    </div>
  );
}
