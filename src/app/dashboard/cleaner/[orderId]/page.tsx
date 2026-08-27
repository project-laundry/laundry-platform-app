import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { getUsersById } from '@/lib/database/users';
import { getCleanerOrderDetails } from '../actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LaundryDetailsForm } from '../components/LaundryDetailsForm';
import { OrderActions } from './OrderActions';
import { formatKr } from '@/lib/config/pricing';
import type { OrderStatus } from '@/types/database';

interface OrderDetailsPageProps {
  params: Promise<{ orderId: string }>;
}

// Status display configuration
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: 'info' | 'success' | 'warning' | 'neutral' | 'destructive' }
> = {
  pending_assignment: { label: 'Venter på tildeling', variant: 'warning' },
  pickup_scheduled: { label: 'Henting planlagt', variant: 'info' },
  picked_up: { label: 'Under arbeid', variant: 'info' },
  in_cleaning: { label: 'Vaskes', variant: 'info' },
  ready_for_delivery: { label: 'Klar for levering', variant: 'success' },
  out_for_delivery: { label: 'Ut for levering', variant: 'success' },
  completed: { label: 'Fullfort', variant: 'neutral' },
  cancelled: { label: 'Kansellert', variant: 'destructive' },
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
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/cleaner"
              className="text-medium-gray hover:text-dark-gray transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-dark-gray">
                Ordre #{order.order_number}
              </h1>
            </div>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Customer & Delivery Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ordreinformasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer */}
            <div>
              <div className="text-sm text-medium-gray">Kunde</div>
              <div className="font-medium text-dark-gray">{customerName}</div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-medium-gray">Hentedato</div>
                <div className="font-medium text-dark-gray">
                  {formatDate(order.scheduled_date)}
                </div>
              </div>
              <div>
                <div className="text-sm text-medium-gray">Leveringsdato</div>
                <div className="font-medium text-dark-gray">
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
                <div className="text-sm text-medium-gray mt-1">
                  {order.special_instructions_address}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Washing Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vaskeinstruksjoner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ironing and Frequency badges */}
            <div className="flex items-center gap-2">
              {order.needs_ironing ? (
                <Badge variant="info">Stryking inkludert</Badge>
              ) : (
                <Badge variant="neutral">Ingen stryking</Badge>
              )}
              {order.subscription && (
                <Badge variant="neutral">
                  {order.subscription.frequency === 'weekly' && 'Ukentlig'}
                  {order.subscription.frequency === 'biweekly' && 'Annenhver uke'}
                  {order.subscription.frequency === 'monthly' && 'Månedlig'}
                </Badge>
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
          </CardContent>
        </Card>

        {/* Customer's own estimate from checkout (informational) */}
        {order.customer_estimate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kundens anslag</CardTitle>
              <p className="text-sm text-medium-gray">
                Hva kunden oppga ved bestilling. Du setter den endelige prisen
                under.
              </p>
            </CardHeader>
            <CardContent>
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
                <span className="font-medium text-dark-gray">
                  ca. {formatKr(order.customer_estimate.estimated_total_ore)}
                </span>
              </p>
            </CardContent>
          </Card>
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
