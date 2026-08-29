import { redirect, notFound } from 'next/navigation';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { CalendarDays, ClipboardList, Shirt, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { getUsersById } from '@/lib/database/users';
import { getCleanerOrderDetails } from '../actions';
import { LaundryDetailsForm } from '../components/LaundryDetailsForm';
import { OrderActions } from './OrderActions';
import { formatKr } from '@/lib/config/pricing';
import type { OrderStatus } from '@/types/database';

interface OrderDetailsPageProps {
  params: Promise<{ orderId: string }>;
}

// Status display configuration — badge tints per brandbook §4.
const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending_assignment: { label: 'Venter på tildeling', className: 'bg-amber-50 text-amber-800' },
  pickup_scheduled: { label: 'Henting planlagt', className: 'bg-nordic-blue/10 text-nordic-blue' },
  picked_up: { label: 'Under arbeid', className: 'bg-nordic-blue/10 text-nordic-blue' },
  in_cleaning: { label: 'Vaskes', className: 'bg-nordic-blue/10 text-nordic-blue' },
  ready_for_delivery: { label: 'Klar for levering', className: 'bg-sea-green/10 text-sea-green' },
  out_for_delivery: { label: 'Ut for levering', className: 'bg-sea-green/10 text-sea-green' },
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

  // Determine if order is editable (not completed or cancelled)
  const isEditable = order.status !== 'completed' && order.status !== 'cancelled';

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
              </div>
              <div>
                <div className="text-sm text-medium-gray">Leveringsdato</div>
                <div className="font-medium tabular-nums text-dark-gray">
                  {formatDate(order.delivery_date)}
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <div className="text-sm text-medium-gray">Adresse</div>
              <div className="font-medium text-dark-gray">
                {order.street}, {order.postal_code} {order.city}
              </div>
              {order.special_instructions_address && (
                <div className="mt-1 text-sm text-medium-gray">
                  {order.special_instructions_address}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Washing Instructions */}
        <SectionCard icon={<Shirt className="size-5" />} title="Vaskeinstruksjoner">
          <div className="space-y-4">
            {/* Ironing and Frequency badges */}
            <div className="flex items-center gap-2">
              {order.needs_ironing ? (
                <span className="inline-flex items-center rounded-full bg-nordic-blue/10 px-2.5 py-0.5 text-xs font-medium text-nordic-blue">
                  Stryking inkludert
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-cream-dark/60 px-2.5 py-0.5 text-xs font-medium text-medium-gray">
                  Ingen stryking
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
                <div className="text-sm text-medium-gray">Spesielle instruksjoner</div>
                <div className="text-dark-gray">{order.special_instructions}</div>
              </div>
            ) : (
              <div className="text-sm text-medium-gray">Ingen spesielle instruksjoner</div>
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
              {order.customer_estimate.iron_everyday_items > 0 && (
                <li>{order.customer_estimate.iron_everyday_items} vanlige plagg til stryking</li>
              )}
              {order.customer_estimate.iron_formal_items > 0 && (
                <li>{order.customer_estimate.iron_formal_items} skjorter/kjoler til stryking</li>
              )}
              {order.customer_estimate.iron_bedding && <li>Stryking av sengetøy</li>}
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
        <LaundryDetailsForm
          orderId={order.id}
          needsIroning={order.needs_ironing}
          initialDarkLoads={order.dark_loads || 0}
          initialWhiteLoads={order.white_loads || 0}
          initialIroningDetails={order.ironing_details}
          initialNotes={order.pricing_notes}
          isEditable={isEditable}
          promo={order.promo}
        />

        {/* Order Actions (Status changes, decline, finish) */}
        <OrderActions
          orderId={order.id}
          orderNumber={order.order_number}
          currentStatus={order.status}
          needsIroning={order.needs_ironing}
          hasLaundryDetails={order.dark_loads > 0 || order.white_loads > 0}
          hasPrice={order.total_cost_ore !== null}
        />
      </main>
    </div>
  );
}
