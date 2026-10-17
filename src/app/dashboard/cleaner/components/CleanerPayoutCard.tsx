import { Landmark } from 'lucide-react';
import { CLEANER_PAYOUT_TERMS, CLEANER_PAYOUT_TERMS_TEXT, formatNok } from '@/lib/config/pricing';
import {
  monthKeyInOslo,
  monthLabel,
  nextMonthKey,
  previousMonthKey,
  sumCleanerPayoutOreForMonth,
} from '@/lib/utils/payout';
import type { OrderWithCustomer } from '@/lib/database/orders';

interface CleanerPayoutCardProps {
  /** The cleaner's completed/cancelled orders (the dashboard's history list). */
  orders: OrderWithCustomer[];
}

/** Server component: what the cleaner has earned (stamped payout per order)
 *  in the previous and the current month, and when it is paid out. */
export function CleanerPayoutCard({ orders }: CleanerPayoutCardProps) {
  const thisMonth = monthKeyInOslo();
  const lastMonth = previousMonthKey(thisMonth);
  const payDay = CLEANER_PAYOUT_TERMS.paid_by_day_of_month;

  const figures = [
    {
      key: lastMonth,
      earned: sumCleanerPayoutOreForMonth(orders, lastMonth),
      paidBy: `${payDay}. ${monthLabel(thisMonth)}`,
    },
    {
      key: thisMonth,
      earned: sumCleanerPayoutOreForMonth(orders, thisMonth),
      paidBy: `${payDay}. ${monthLabel(nextMonthKey(thisMonth))}`,
    },
  ];

  return (
    <section className="mb-5 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
          <Landmark className="size-5" />
        </span>
        <h2 className="font-serif text-lg font-semibold leading-none text-dark-gray">Utbetaling</h2>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {figures.map((figure) => (
          <div key={figure.key}>
            <p className="text-medium-gray">Fullført i {monthLabel(figure.key)}</p>
            <p className="font-serif text-xl font-semibold tabular-nums text-dark-gray">
              {formatNok(figure.earned)} kr
            </p>
            <p className="text-xs text-medium-gray">Utbetales innen {figure.paidBy}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm text-medium-gray">{CLEANER_PAYOUT_TERMS_TEXT}</p>
    </section>
  );
}
