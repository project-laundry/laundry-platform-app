'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { formatKr, formatKrExact } from '@/lib/config/pricing';
import {
  historyMonthKey,
  monthLabel,
  nextMonthKey,
  payoutDueDate,
  payoutPhase,
  previousMonthKey,
  summarizeCleanerMonth,
  type PayoutPhase,
} from '@/lib/utils/payout';
import type { OrderWithCustomer } from '../actions';

interface CleanerEarningsProps {
  /** The cleaner's completed/cancelled orders, newest first. */
  orders: OrderWithCustomer[];
  /** Today's date in Oslo ('YYYY-MM-DD'), from the server so both renders agree. */
  today: string;
}

const OSLO = 'Europe/Oslo';
const ROWS_COLLAPSED = 5;

const STATUS_PILL: Record<PayoutPhase, string> = {
  open: 'bg-sno/15 text-sno',
  closed: 'bg-sol/15 text-sol',
  due: 'bg-frost/20 text-frost',
};

const NAV_BUTTON =
  'flex size-9 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue shadow-sm transition-all hover:border-sea-green hover:text-sea-green active:scale-90 disabled:cursor-not-allowed disabled:text-cream-dark disabled:shadow-none disabled:hover:border-cream-dark disabled:active:scale-100';

/** '15. desember' for an ISO date. */
function dayAndMonth(isoDate: string): string {
  return `${Number(isoDate.slice(8, 10))}. ${monthLabel(isoDate.slice(0, 7))}`;
}

/** Last calendar day of a 'YYYY-MM' month. */
function lastDayOfMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function payoutCopy(monthKey: string, phase: PayoutPhase) {
  const month = monthLabel(monthKey);
  const due = dayAndMonth(payoutDueDate(monthKey));
  if (phase === 'open') {
    return {
      label: `Opptjent så langt i ${month}`,
      status: 'Måneden pågår',
      text: `Alt du fullfører til og med ${lastDayOfMonth(monthKey)}. ${month} utbetales samlet innen ${due}.`,
    };
  }
  if (phase === 'closed') {
    return {
      label: `Utbetaling for ${month}`,
      status: `Utbetales innen ${due}`,
      text: `Måneden er avsluttet. Pengene er på kontoen din senest ${due}.`,
    };
  }
  return {
    label: `Utbetaling for ${month}`,
    status: 'Avsluttet',
    text: `Skal være utbetalt til kontonummeret ditt senest ${due}.`,
  };
}

/** The cleaner's income, one month at a time: the payout and the orders
 *  finished that month. */
export function CleanerEarnings({ orders, today }: CleanerEarningsProps) {
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [showAll, setShowAll] = useState(false);

  // Browse back to the month of the oldest finished order, never past today.
  const firstMonth = orders.reduce((first, order) => {
    const key = historyMonthKey(order);
    return key && key < first ? key : first;
  }, currentMonth);

  const goTo = (monthKey: string) => {
    setMonth(monthKey);
    setShowAll(false);
  };

  const summary = summarizeCleanerMonth(orders, month);
  const phase = payoutPhase(month, today);
  const copy = payoutCopy(month, phase);
  const monthOrders = orders.filter((order) => historyMonthKey(order) === month);
  const visibleOrders = showAll ? monthOrders : monthOrders.slice(0, ROWS_COLLAPSED);
  const year = month.slice(0, 4);

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-semibold text-dark-gray">Inntekt</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Forrige måned"
            disabled={month <= firstMonth}
            onClick={() => goTo(previousMonthKey(month))}
            className={NAV_BUTTON}
          >
            <ChevronLeft className="size-4" />
          </button>
          <p
            aria-live="polite"
            className="min-w-[7.5rem] text-center text-sm font-medium capitalize tabular-nums text-dark-gray"
          >
            {monthLabel(month)} {year}
          </p>
          <button
            type="button"
            aria-label="Neste måned"
            disabled={month >= currentMonth}
            onClick={() => goTo(nextMonthKey(month))}
            className={NAV_BUTTON}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
          {/* Payout — the screen's one Fjord block. */}
          <div className="relative overflow-hidden rounded-3xl bg-fjord p-5 text-sno shadow-[var(--shadow-card)]">
            <span
              aria-hidden
              className="absolute right-5 top-6 size-7 rounded-full border-[3px] border-sol"
            />
            <span
              aria-hidden
              className="absolute right-12 top-3.5 size-3.5 rounded-full border-2 border-sol"
            />
            <p className="pr-16 text-xs font-medium uppercase tracking-[0.14em] text-frost">
              {copy.label}
            </p>
            <p className="mt-3 font-serif text-[2.5rem] font-semibold leading-none tabular-nums">
              {formatKrExact(summary.payoutOre)}
            </p>
            <span
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${STATUS_PILL[phase]}`}
            >
              <span aria-hidden className="size-2 rounded-full bg-current" />
              {copy.status}
            </span>
            <p className="mt-3 max-w-md text-sm text-sno/80">{copy.text}</p>
            {summary.orderCount > 0 && (
              <p className="mt-4 border-t border-sno/15 pt-3 text-sm tabular-nums text-sno/80">
                {summary.orderCount} oppdrag · {summary.washLoads} vask · snitt{' '}
                {formatKr(summary.payoutOre / summary.orderCount)} per oppdrag
              </p>
            )}
          </div>

        {/* Orders finished this month */}
        <div className="overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
          <h3 className="px-5 pt-5 font-serif text-lg font-semibold text-dark-gray">
            Oppdrag i {monthLabel(month)}
          </h3>

          {monthOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
              <ClipboardList className="size-8 text-cream-dark" />
              <p className="text-medium-gray">
                {phase === 'open'
                  ? 'Ingen fullførte oppdrag denne måneden ennå.'
                  : 'Ingen oppdrag denne måneden.'}
              </p>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-cream-dark/60">
              {visibleOrders.map((order) => {
                const finishedAt = new Date((order.completed_at ?? order.cancelled_at)!);
                const cancelled = order.status === 'cancelled';
                return (
                  <li key={order.id}>
                    <Link
                      href={`/dashboard/cleaner/${order.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-cream/50"
                    >
                      <span className="w-12 shrink-0 rounded-xl bg-cream-dark/50 py-1.5 text-center leading-tight">
                        <span className="block font-serif text-lg font-semibold tabular-nums text-dark-gray">
                          {finishedAt.toLocaleDateString('no-NO', { day: 'numeric', timeZone: OSLO }).replace('.', '')}
                        </span>
                        <span className="block text-[11px] uppercase tracking-[0.08em] text-medium-gray">
                          {finishedAt
                            .toLocaleDateString('no-NO', { month: 'short', timeZone: OSLO })
                            .replace('.', '')}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-dark-gray">
                          {cancelled ? (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                              Kansellert
                            </span>
                          ) : (
                            `${order.wash_loads} vask`
                          )}
                        </span>
                        <span className="block truncate text-sm text-medium-gray">
                          {order.customer.user.full_name} · #{order.order_number}
                        </span>
                      </span>
                      {!cancelled && order.cleaner_payout_ore !== null && (
                        <span className="shrink-0 text-right">
                          <span className="block font-semibold tabular-nums text-dark-gray">
                            {formatKrExact(order.cleaner_payout_ore)}
                          </span>
                          <span className="block text-xs text-medium-gray">Din andel</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {monthOrders.length > ROWS_COLLAPSED && (
            <div className="border-t border-cream-dark/60 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="font-medium text-sea-green underline-offset-2 hover:underline"
              >
                {showAll ? 'Vis færre' : `Vis alle ${monthOrders.length} oppdrag`}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
