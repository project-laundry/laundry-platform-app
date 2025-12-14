import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function EmptySubscriptionState() {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="mb-6 flex flex-col items-center">
          {/* Laundry basket icon */}
          <svg
            className="w-20 h-20 mb-6 text-nordic-blue"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="5" y="6" width="14" height="4" rx="1" strokeWidth="1.5" />
            <rect x="4" y="10" width="16" height="10" rx="2" strokeWidth="1.5" />
            <circle cx="12" cy="15" r="1.5" fill="currentColor" />
          </svg>

          <p className="text-medium-gray text-lg mb-4">
            Bestill din første klesvask i dag
          </p>
        </div>
        <Link href="/orders/plans">
          <Button size="lg" className="w-full uppercase tracking-wide">
            Bestill klesvask
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
