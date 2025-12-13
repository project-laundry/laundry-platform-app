import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function EmptySubscriptionState() {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-8 text-center">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-dark-gray mb-3">
            Trenger du klesvask?
          </h2>
          <p className="text-medium-gray">
            Bestill henting og levering
          </p>
        </div>
        <Link href="/orders/plans">
          <Button size="lg" className="w-full">
            Kom i gang
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
