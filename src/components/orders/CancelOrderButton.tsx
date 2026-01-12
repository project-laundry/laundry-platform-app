import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { OrderStatus } from '@/types/database';

interface CancelOrderButtonProps {
  orderId: string;
  orderStatus: OrderStatus;
}

export function CancelOrderButton({
  orderId,
  orderStatus,
}: CancelOrderButtonProps) {
  // Only show button for cancellable statuses
  const cancellableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
  if (!cancellableStatuses.includes(orderStatus)) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-dark-gray mb-2">Kanseller bestilling</h3>
        <p className="text-sm text-medium-gray mb-4">
          Du kan kansellere denne bestillingen før den er hentet.
        </p>
        <Button
          asChild
          variant="destructive"
          className="w-full"
        >
          <Link href={`/orders/${orderId}/cancel`}>
            Kanseller bestilling
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
