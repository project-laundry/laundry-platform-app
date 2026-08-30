import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { getAllPaymentsWithDetails } from '@/lib/database/payments';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANT } from '@/lib/utils/payment-status';
import { formatKr } from '@/lib/config/pricing';
import type { PaymentStatus } from '@/types/database';

const STATUS_KEYS: PaymentStatus[] = [
  'pending',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'cancelled',
];

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter = STATUS_KEYS.includes(status as PaymentStatus)
    ? (status as PaymentStatus)
    : undefined;

  const payments = await getAllPaymentsWithDetails({ status: statusFilter });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Admin</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Betalinger
      </h1>

      {/* Status filter chips */}
      <div className="-mx-5 mt-4 overflow-x-auto px-5">
        <div className="flex w-max gap-2 pb-1">
          <Link
            href="/admin/payments"
            className={`inline-flex items-center whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
              !statusFilter
                ? 'border-sea-green bg-sea-green/10 text-sea-green'
                : 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50'
            }`}
          >
            Alle
          </Link>
          {STATUS_KEYS.map((key) => (
            <Link
              key={key}
              href={`/admin/payments?status=${key}`}
              className={`inline-flex items-center whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                statusFilter === key
                  ? 'border-sea-green bg-sea-green/10 text-sea-green'
                  : 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50'
              }`}
            >
              {PAYMENT_STATUS_LABELS[key]}
            </Link>
          ))}
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur">
          <Inbox className="size-8 text-cream-dark" />
          <p className="text-medium-gray">Ingen betalinger i dette filteret</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
          <ul className="divide-y divide-cream-dark/60">
            {payments.map((payment) => (
              <li key={payment.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-serif text-base font-semibold tabular-nums text-dark-gray">
                        {formatKr(payment.amount_ore)}
                      </p>
                      <StatusBadge variant={PAYMENT_STATUS_VARIANT[payment.status]}>
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 truncate text-sm text-dark-gray">
                      {payment.customer.user.full_name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-medium-gray">
                      {payment.order ? `#${payment.order.order_number}` : '—'} ·{' '}
                      {payment.payment_provider} · {formatDateTime(payment.created_at)}
                    </p>
                    {payment.status === 'failed' && payment.failure_reason && (
                      <p className="mt-0.5 truncate text-sm text-red-700">
                        {payment.failure_reason}
                      </p>
                    )}
                    {payment.refund_amount_ore !== null && (
                      <p className="mt-0.5 text-sm text-medium-gray">
                        Refundert {formatKr(payment.refund_amount_ore)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
