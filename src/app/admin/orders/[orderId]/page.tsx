import { notFound } from 'next/navigation';
import { BackLink } from '@/components/layout/AppHeader';
import { getAdminOrderById } from '@/lib/database/orders';
import { getPaymentsByOrderId } from '@/lib/database/payments';
import { getAvailableCleanersForCity } from '@/lib/database/cleaners';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANT } from '@/lib/utils/payment-status';
import { formatKr } from '@/lib/config/pricing';
import { AssignCleanerControl, type CleanerOption } from '../AssignCleanerControl';
import { OrderEditForm, type OrderEditability } from './OrderEditForm';
import type { OrderStatus } from '@/types/database';

/** Statuses where the admin can still (re)assign the cleaner. */
const ASSIGNABLE_STATUSES: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
const TERMINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled'];

const cardClass =
  'rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await getAdminOrderById(orderId);
  if (!order) {
    notFound();
  }

  const payments = await getPaymentsByOrderId(order.id);

  const assignable = ASSIGNABLE_STATUSES.includes(order.status);
  const editability: OrderEditability = TERMINAL_STATUSES.includes(order.status)
    ? 'none'
    : assignable
      ? 'full'
      : 'partial';

  let cleaners: CleanerOption[] = [];
  if (assignable) {
    const available = await getAvailableCleanersForCity(order.city);
    cleaners = available.map((cleaner) => ({
      id: cleaner.id,
      display_name: cleaner.display_name,
    }));
  }

  // Audit-trail timeline (BUSINESS_LOGIC.md → Audit Trail (MVP)): only the
  // timestamps that have been set render. Labels mirror ORDER_STATUS_LABELS
  // where a timestamp maps 1:1 to a status.
  const timeline = [
    { label: 'Opprettet', at: order.created_at },
    { label: 'Renser tildelt', at: order.assigned_at },
    { label: 'Hentet', at: order.picked_up_at },
    { label: 'Vaskes', at: order.in_cleaning_at },
    { label: 'Klar for levering', at: order.ready_for_delivery_at },
    { label: 'Leveres', at: order.out_for_delivery_at },
    { label: 'Fullført', at: order.completed_at },
    { label: 'Kansellert', at: order.cancelled_at },
  ].filter((step): step is { label: string; at: string } => step.at !== null);

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="mb-4">
        <BackLink href="/admin/orders" label="Ordre" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
          #{order.order_number}
        </h1>
        <StatusBadge variant={getOrderStatusVariant(order.status)}>
          {getOrderStatusLabel(order.status)}
        </StatusBadge>
      </div>

      <div className={`mt-6 ${cardClass}`}>
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Kunde</h2>
        <p className="mt-2 text-dark-gray">{order.customer.user.full_name}</p>
        <p className="mt-0.5 text-sm text-medium-gray">
          {order.customer.user.phone} · {order.customer.user.email}
        </p>
      </div>

      <div className={`mt-4 ${cardClass}`}>
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Renser</h2>
        <p className="mt-2 text-dark-gray">
          {order.cleaner ? order.cleaner.display_name : 'Ingen renser tildelt'}
        </p>
        {assignable && (
          <div className="mt-3">
            <AssignCleanerControl
              orderId={order.id}
              currentCleanerId={order.cleaner_id}
              cleaners={cleaners}
            />
          </div>
        )}
      </div>

      <div className={`mt-4 ${cardClass}`}>
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Pris</h2>
        <p className="mt-2 text-dark-gray">
          {order.total_cost_ore !== null ? formatKr(order.total_cost_ore) : 'Ikke prissatt ennå'}
        </p>
        {order.pricing_notes && (
          <p className="mt-0.5 text-sm text-medium-gray">{order.pricing_notes}</p>
        )}
        <dl className="mt-3 space-y-1.5 text-sm">
          {order.customer_estimate && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-medium-gray">Kundens estimat</dt>
              <dd className="tabular-nums text-dark-gray">
                {formatKr(order.customer_estimate.estimated_total_ore)}
              </dd>
            </div>
          )}
          {order.actual_weight_kg !== null && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-medium-gray">Vekt</dt>
              <dd className="tabular-nums text-dark-gray">{order.actual_weight_kg} kg</dd>
            </div>
          )}
          {order.promo && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-medium-gray">Rabattkode {order.promo.code}</dt>
              <dd className="tabular-nums text-dark-gray">
                {order.promo.discount_ore !== undefined
                  ? `−${formatKr(order.promo.discount_ore)}`
                  : 'beregnes ved prising'}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className={`mt-4 ${cardClass}`}>
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
          Detaljer
        </h2>
        <div className="mt-3">
          <OrderEditForm
            orderId={order.id}
            editability={editability}
            initial={{
              scheduled_date: order.scheduled_date,
              delivery_date: order.delivery_date,
              street: order.street,
              postal_code: order.postal_code,
            }}
          />
        </div>
      </div>

      <div className={`mt-4 ${cardClass}`}>
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
          Instruksjoner fra kunden
        </h2>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div>
            <dt className="text-medium-gray">Adressedetaljer</dt>
            <dd className="text-dark-gray">{order.special_instructions_address || '—'}</dd>
          </div>
          <div>
            <dt className="text-medium-gray">Hentedetaljer</dt>
            <dd className="text-dark-gray">{order.special_instructions || '—'}</dd>
          </div>
          <div>
            <dt className="text-medium-gray">Stryking</dt>
            <dd className="text-dark-gray">{order.needs_ironing ? 'Ja' : 'Nei'}</dd>
          </div>
          {order.customer_estimate && (
            <div>
              <dt className="text-medium-gray">Bestilling (kundens valg)</dt>
              <dd className="text-dark-gray">
                {order.customer_estimate.bags} poser · {order.customer_estimate.bedding_sets}{' '}
                sengetøysett
                {order.customer_estimate.iron_everyday_items > 0 &&
                  ` · ${order.customer_estimate.iron_everyday_items} hverdagsplagg strykes`}
                {order.customer_estimate.iron_formal_items > 0 &&
                  ` · ${order.customer_estimate.iron_formal_items} skjorter/kjoler strykes`}
                {order.customer_estimate.iron_bedding && ' · sengetøy strykes'}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className={`mt-4 ${cardClass}`}>
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
          Tidslinje
        </h2>
        <ol className="mt-2 space-y-1.5 text-sm">
          {timeline.map((step) => (
            <li key={step.label} className="flex items-center justify-between gap-3">
              <span className="text-dark-gray">{step.label}</span>
              <span className="tabular-nums text-medium-gray">{formatDateTime(step.at)}</span>
            </li>
          ))}
        </ol>
        {order.cancellation_reason && (
          <p className="mt-2 text-sm text-medium-gray">Årsak: {order.cancellation_reason}</p>
        )}
      </div>

      <div className={`mt-4 ${cardClass}`}>
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
          Betalinger
        </h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-medium-gray">Ingen betalinger ennå</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {payments.map((payment) => (
              <li key={payment.id} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge variant={PAYMENT_STATUS_VARIANT[payment.status]}>
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </StatusBadge>
                  <span className="font-medium tabular-nums text-dark-gray">
                    {formatKr(payment.amount_ore)}
                  </span>
                  <span className="text-medium-gray">
                    · {payment.payment_provider} · {formatDateTime(payment.created_at)}
                  </span>
                </div>
                {payment.provider_reference && (
                  <p className="mt-0.5 font-mono text-xs text-medium-gray">
                    {payment.provider_reference}
                  </p>
                )}
                {payment.failure_reason && (
                  <p className="mt-0.5 text-xs text-red-700">{payment.failure_reason}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-sm text-medium-gray">
        {order.city} · Opprettet{' '}
        {new Date(order.created_at).toLocaleDateString('no-NO', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}
