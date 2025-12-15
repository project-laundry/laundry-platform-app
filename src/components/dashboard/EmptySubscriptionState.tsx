import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function EmptySubscriptionState() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-12 text-center">
        <div className="mb-8 flex flex-col items-center">
          {/* Laundry basket icon */}
          <svg
            className="w-24 h-24 mb-6 text-nordic-blue"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="5" y="6" width="14" height="4" rx="1" strokeWidth="1.5" />
            <rect x="4" y="10" width="16" height="10" rx="2" strokeWidth="1.5" />
            <circle cx="12" cy="15" r="1.5" fill="currentColor" />
          </svg>

          <h3 className="text-2xl font-bold text-dark-gray mb-3">
            Bestill din første klesvask
          </h3>
          <p className="text-medium-gray text-base">
            Velg en plan som passer best for deg
          </p>
        </div>
        <Link href="/orders/plans">
          <Button
            size="lg"
            className="w-full bg-nordic-blue text-white font-semibold py-6 text-base"
          >
            Bestill klesvask
          </Button>
        </Link>        
      </CardContent>
    </Card>
  );
}
