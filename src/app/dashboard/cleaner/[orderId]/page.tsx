import { redirect, notFound } from 'next/navigation';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { CalendarDays, ClipboardList, MapPin, Navigation, Phone, Shirt, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { getUsersById } from '@/lib/database/users';
import { getCleanerOrderDetails } from '../actions';
import { getPaymentsByOrderId } from '@/lib/database/payments';
import { hasLivePayment } from '@/lib/utils/payment-status';
import { LaundryDetailsForm } from '../components/LaundryDetailsForm';
import { OrderActions } from './OrderActions';
import { IRONING_OFFERED, formatKr } from '@/lib/config/pricing';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import { buildSingleDestinationUrl } from '@/lib/utils/route';
import { todayInOslo } from '@/lib/utils/date';
import type { OrderStatus } from '@/types/database';

interface OrderDetailsPageProps {
  params: Promise<{ orderId: string }>;
}

// Status display configuration — badge tints per brandbook §4.
const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending_assignment: { label: 'Venter på tildeling', className: 'bg-amber-50 text-amber-800' },
  pickup_scheduled: { label: 'Skal hentes', className: 'bg-nordic-blue/10 text-nordic-blue' },
  picked_up: { label: 'Hentet', className: 'bg-nordic-blue/10 text-nordic-blue' },
  in_cleaning: { label: 'Vaskes', className: 'bg-nordic-blue/10 text-nordic-blue' },
  ready_for_delivery: { label: 'Klar til levering', className: 'bg-sea-green/10 text-sea-green' },
  out_for_delivery: { label: 'Leveres', className: 'bg-sea-green/10 text-sea-green' },
  completed: { label: 'Fullfort', className: 'bg-cream-dark/60 text-medium-gray' },
  cancelled: { label: 'Kansellert', className: 'bg-red-50 text-red-700' },
};

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('no-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
          {icon}
        </span>
        <div>
          <h2 className="font-serif text-lg font-semibold leading-none text-dark-gray">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-medium-gray">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { orderId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Role check
  const dbUser = await getUsersById(user.id);
  if (!dbUser || dbUser.role !== 'cleaner') {
    redirect('/dashboard');
  }

  // Get cleaner profile
  const cleaner = await getCleanerByUserId(user.id);
  if (!cleaner) {
    redirect('/bli-renser/business');
  }

  // Get order details
  const order = await getCleanerOrderDetails(orderId);
  if (!order) {
    notFound();
  }

  const statusConfig = STATUS_CONFIG[order.status];
  const customerName = order.customer.user.full_name;

  // Editable only while washing — marking the order ready charges the customer
  // at the saved price, so the price is locked from ready_for_delivery on
  const isEditable = order.status === 'in_cleaning';

  // The cleaner runs pickup and delivery, so they need the customer's door
  // while the order is active — hidden once it is completed or cancelled.
  const showLogistics = order.status !== 'completed' && order.status !== 'cancelled';
  const customerPhone = order.customer.user.phone || null;
  const mapsUrl =
    order.latitude !== null && order.longitude !== null
      ? buildSingleDestinationUrl({ latitude: order.latitude, longitude: order.longitude })
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${order.street}, ${order.postal_code} ${order.city}`
        )}`;
  const pickupDue = order.scheduled_date <= todayInOslo();
  // Buttons first, except while washing: then the details form is the work
  // and «Marker som klar» belongs below it.
  const actionsFirst = order.status !== 'in_cleaning';
  // Nothing to register before the laundry is picked up.
  // Orders created before ironing was hidden can still carry needs_ironing.
  const needsIroning = IRONING_OFFERED && order.needs_ironing;

  const showLaundryForm =
    order.status !== 'pending_assignment' && order.status !== 'pickup_scheduled';

  // After «Bekreft og belast» the charge can fail at Vipps: the order still
  // moves on, but the cleaner must not be told the customer paid. Only orders
  // that should carry a charge are checked (0-total promo orders never do).
  const chargeExpected =
    (order.status === 'ready_for_delivery' || order.status === 'out_for_delivery') &&
    order.total_cost_ore !== null &&
    order.total_cost_ore > 0;
  const chargeFailed = chargeExpected && !hasLivePayment(await getPaymentsByOrderId(order.id));

  const orderActions = (
    <OrderActions
      orderId={order.id}
      orderNumber={order.order_number}
      currentStatus={order.status}
      needsIroning={needsIroning}
      hasLaundryDetails={order.wash_loads > 0}
      hasPrice={order.total_cost_ore !== null}
      totalCostOre={order.total_cost_ore}
      pickupDue={pickupDue}
      chargeFailed={chargeFailed}
    />
  );

  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      {/* Header */}
      <AppHeader
        right={
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate font-serif text-lg font-semibold text-dark-gray">
              Ordre #{order.order_number}
            </h1>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
          </div>
        }
      />

      {/* Main Content */}
      <main className="mx-auto max-w-2xl space-y-6 px-5 pb-16 pt-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div>
          <BackLink href="/dashboard/cleaner" />
        </div>

        {/* Customer & Delivery Info */}
        <SectionCard icon={<ClipboardList className="size-5" />} title="Ordreinformasjon">
          <div className="space-y-4">
            {/* Customer */}
            <div>
              <div className="text-sm text-medium-gray">Kunde</div>
              <div className="font-medium text-dark-gray">{customerName}</div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-medium-gray">Hentedato</div>
                <div className="font-medium tabular-nums text-dark-gray">
                  {formatDate(order.scheduled_date)}
                </div>
                <div className="text-sm tabular-nums text-medium-gray">
                  kl. {getPickupTimeRangeLabel()}
                </div>
              </div>
              <div>
                <div className="text-sm text-medium-gray">Estimert levering</div>
                <div className="font-medium tabular-nums text-dark-gray">
                  {formatDate(order.delivery_date)}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Pickup & delivery — the cleaner goes to the customer's door */}
        {showLogistics && (
          <SectionCard icon={<MapPin className="size-5" />} title="Henting og levering">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-medium-gray">Adresse</div>
                <div className="font-medium text-dark-gray">
                  {order.street}
                  <br />
                  {order.postal_code} {order.city}
                </div>
              </div>

              <div>
                <div className="text-sm text-medium-gray">Henteinstruksjoner</div>
                {order.special_instructions_address ? (
                  <div className="text-dark-gray">{order.special_instructions_address}</div>
                ) : (
                  <div className="text-sm text-medium-gray">Ingen henteinstruksjoner</div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green"
                >
                  <Navigation className="size-4" />
                  Veibeskrivelse
                </a>
                {customerPhone && (
                  <a
                    href={`tel:${customerPhone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green"
                  >
                    <Phone className="size-4" />
                    Ring {customerPhone}
                  </a>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {actionsFirst && orderActions}

        {/* Washing Instructions */}
        <SectionCard icon={<Shirt className="size-5" />} title="Vaskeinstruksjoner">
          <div className="space-y-4">
            {/* Ironing and Frequency badges */}
            <div className="flex items-center gap-2">
              {needsIroning && (
                <span className="inline-flex items-center rounded-full bg-nordic-blue/10 px-2.5 py-0.5 text-xs font-medium text-nordic-blue">
                  Stryking inkludert
                </span>
              )}
              {order.subscription && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cream-dark/60 px-2.5 py-0.5 text-xs font-medium text-medium-gray">
                  <CalendarDays className="size-3" />
                  {order.subscription.frequency === 'weekly' && 'Ukentlig'}
                  {order.subscription.frequency === 'biweekly' && 'Annenhver uke'}
                  {order.subscription.frequency === 'monthly' && 'Månedlig'}
                </span>
              )}
            </div>

            {/* Special instructions */}
            {order.special_instructions ? (
              <div>
                <div className="text-sm text-medium-gray">Fra kunden</div>
                <div className="text-dark-gray">{order.special_instructions}</div>
              </div>
            ) : (
              <div className="text-sm text-medium-gray">Ingen vaskeinstruksjoner fra kunden</div>
            )}
          </div>
        </SectionCard>

        {/* Customer's own estimate from checkout (informational) */}
        {order.customer_estimate && (
          <SectionCard
            icon={<ShoppingBag className="size-5" />}
            title="Kundens anslag"
            subtitle="Hva kunden oppga ved bestilling. Du setter den endelige prisen under."
          >
            <ul className="space-y-1 text-dark-gray">
              {order.customer_estimate.bags > 0 && (
                <li>{order.customer_estimate.bags} {order.customer_estimate.bags === 1 ? 'pose' : 'poser'} klær</li>
              )}
              {order.customer_estimate.bedding_sets > 0 && (
                <li>{order.customer_estimate.bedding_sets} sett sengetøy</li>
              )}
              {IRONING_OFFERED && (
                <>
                  {order.customer_estimate.iron_everyday_items > 0 && (
                    <li>{order.customer_estimate.iron_everyday_items} vanlige plagg til stryking</li>
                  )}
                  {order.customer_estimate.iron_formal_items > 0 && (
                    <li>{order.customer_estimate.iron_formal_items} skjorter/kjoler til stryking</li>
                  )}
                  {order.customer_estimate.iron_bedding && <li>Stryking av sengetøy</li>}
                </>
              )}
            </ul>
            <p className="mt-3 text-sm text-medium-gray">
              Estimert pris vist til kunden:{' '}
              <span className="font-medium tabular-nums text-dark-gray">
                ca. {formatKr(order.customer_estimate.estimated_total_ore)}
              </span>
            </p>
          </SectionCard>
        )}

        {/* Laundry Details Form */}
        {showLaundryForm && (
          <LaundryDetailsForm
            orderId={order.id}
            needsIroning={needsIroning}
            initialWashLoads={order.wash_loads || 0}
            initialIroningDetails={order.ironing_details}
            initialNotes={order.pricing_notes}
            isEditable={isEditable}
            promo={order.promo}
            cleanerPayoutOre={order.cleaner_payout_ore}
          />
        )}

        {!actionsFirst && orderActions}
      </main>
    </div>
  );
}
