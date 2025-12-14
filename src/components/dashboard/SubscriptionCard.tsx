import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { oreToNok } from '@/lib/config/pricing';
import {
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
  getSubscriptionFrequencyLabel,
} from '@/lib/utils/subscription-status';
import type { Subscription } from '@/types/database';

interface SubscriptionCardProps {
  subscription: Subscription & {
    plan?: {
      name: string;
      frequency: string;
      included_kg: number;
    } | null;
  };
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const { plan, status, billing_cost_ore, next_billing_date, recurring_weekday } = subscription;

  return (
    <div className="space-y-4">
      {/* Subscription Details Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-dark-gray">
              {plan?.name}
            </h3>
            <Badge variant={getSubscriptionStatusVariant(status)}>
              {getSubscriptionStatusLabel(status)}
            </Badge>
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
                {oreToNok(billing_cost_ore)} kr
              </p>
            </div>
            <div>
              <p className="text-sm text-medium-gray mb-1">Inkludert vekt</p>
              <p className="font-medium text-dark-gray">
                {plan?.included_kg || 0} kg
              </p>
            </div>
            {recurring_weekday && (
              <div>
                <p className="text-sm text-medium-gray mb-1">Hentedag</p>
                <p className="font-medium text-dark-gray capitalize">
                  {recurring_weekday}
                </p>
              </div>
            )}
            {next_billing_date && (
              <div className="col-span-2">
                <p className="text-sm text-medium-gray mb-1">Neste faktura</p>
                <p className="font-medium text-dark-gray">
                  {new Date(next_billing_date).toLocaleDateString('no-NO', {
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

      {/* Manage Subscription Button */}
      <div>
        <Link href="/dashboard/subscription/manage">
          <Button variant="outline" size="lg" className="w-full">
            Administrer abonnement
          </Button>
        </Link>
      </div>
    </div>
  );
}
