'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Calendar as CalendarIcon, Package, Truck, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/Calendar';
import {
  getOrderDetailsForRescheduleAction,
  getAvailableWeekdaysAction,
  rescheduleOrderAction,
  type OrderDetailsForReschedule,
} from '@/app/orders/actions';
import { DAYS_PICKUP_TO_DELIVERY, HOURS_BEFORE_PICKUP_RESCHEDULE_CUTOFF } from '@/lib/config/order-timing';
import { addDays, toISODateString } from '@/lib/utils/date';
import type { Weekday } from '@/types/database';

interface ReschedulePageProps {
  params: Promise<{ orderId: string }>;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('no-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function canReschedule(scheduledDate: string): boolean {
  const now = new Date();
  const pickupDate = new Date(scheduledDate);
  const hoursUntilPickup = (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilPickup > HOURS_BEFORE_PICKUP_RESCHEDULE_CUTOFF;
}

export default function ReschedulePage({ params }: ReschedulePageProps) {
  const { orderId } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetailsForReschedule | null>(null);
  const [availableWeekdays, setAvailableWeekdays] = useState<Weekday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch order details and available weekdays
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const orderResult = await getOrderDetailsForRescheduleAction(orderId);

      if (orderResult.error || !orderResult.data) {
        setError(orderResult.error || 'Kunne ikke laste ordredetaljer');
        setIsLoading(false);
        return;
      }

      const orderData = orderResult.data;

      // Check if order is editable
      const editableStatuses = ['pending_assignment', 'pickup_scheduled'];
      if (!editableStatuses.includes(orderData.status)) {
        setError('Kan ikke endre dato etter at hentedag er passert');
        setIsLoading(false);
        return;
      }

      // Check 24-hour cutoff
      if (!canReschedule(orderData.scheduledDate)) {
        setError('Kan ikke endre dato mindre enn 24 timer før henting');
        setIsLoading(false);
        return;
      }

      setOrder(orderData);

      // Fetch available weekdays for the order's city
      const weekdays = await getAvailableWeekdaysAction(orderData.city);
      setAvailableWeekdays(weekdays);
      setIsLoading(false);
    };

    fetchData();
  }, [orderId]);

  // Calculate new delivery date when pickup date changes
  const calculatedDeliveryDate = selectedDate
    ? toISODateString(addDays(new Date(selectedDate), DAYS_PICKUP_TO_DELIVERY))
    : null;

  const handleSubmit = async () => {
    if (!selectedDate || !order) return;

    setIsSubmitting(true);
    setError(null);

    const result = await rescheduleOrderAction(orderId, selectedDate);

    if (!result.success) {
      setError(result.error || 'Kunne ikke oppdatere dato');
      setIsSubmitting(false);
      return;
    }

    // Redirect back to order details
    router.push(`/orders/details/${orderId}`);
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--cream))] via-white to-[hsl(var(--cream-dark)/30%)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--nordic-blue))] mx-auto mb-4" />
          <p className="text-gray-500">Laster...</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--cream))] via-white to-[hsl(var(--cream-dark)/30%)]">
        {/* Header */}
        <header className="relative z-20 bg-white/80 backdrop-blur-xl border-b border-[hsl(var(--nordic-blue)/10%)]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="group flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-serif text-xl font-semibold text-[hsl(var(--nordic-blue))] hidden sm:block">NooraCare</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href={`/orders/details/${orderId}`}
              className="inline-flex items-center gap-2 text-[hsl(var(--nordic-blue))] hover:text-[hsl(var(--nordic-blue)/80%)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Tilbake til ordredetaljer
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--cream))] via-white to-[hsl(var(--cream-dark)/30%)]">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[hsl(var(--nordic-blue)/5%)] rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-[hsl(var(--sea-green)/8%)] rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-20 bg-white/80 backdrop-blur-xl border-b border-[hsl(var(--nordic-blue)/10%)] sticky top-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="group flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] flex items-center justify-center shadow-lg shadow-[hsl(var(--nordic-blue)/20%)] group-hover:shadow-[hsl(var(--nordic-blue)/30%)] transition-shadow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-serif text-xl font-semibold text-[hsl(var(--nordic-blue))] hidden sm:block">NooraCare</span>
            </Link>
            <Link
              href={`/orders/details/${orderId}`}
              className="flex items-center gap-2 text-sm text-[hsl(var(--nordic-blue)/70%)] hover:text-[hsl(var(--nordic-blue))] transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Tilbake</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Page Header */}
        <div className="text-center mb-8">
          <p className="text-[hsl(var(--nordic-blue)/60%)] text-sm font-medium tracking-wide uppercase mb-2">
            Bestilling #{order?.orderNumber}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-light text-[hsl(var(--nordic-blue))] mb-2">
            Endre hentedato
          </h1>
          <p className="text-gray-500">Velg en ny dato for henting</p>
        </div>

        {/* Current Dates Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[hsl(var(--nordic-blue)/8%)] p-6 mb-6">
          <h3 className="font-serif text-lg text-[hsl(var(--nordic-blue))] mb-4">Nåværende datoer</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue)/8%)] flex items-center justify-center">
                <Package className="w-5 h-5 text-[hsl(var(--nordic-blue))]" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Henting</p>
                <p className="font-medium text-gray-900 capitalize">
                  {order && formatDate(order.scheduledDate)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--sea-green)/10%)] flex items-center justify-center">
                <Truck className="w-5 h-5 text-[hsl(var(--sea-green))]" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Levering</p>
                <p className="font-medium text-gray-900 capitalize">
                  {order && formatDate(order.deliveryDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-[hsl(var(--nordic-blue)/8%)] p-6 mb-6">
          <div className="flex items-center mb-4">
            <CalendarIcon className="w-5 h-5 text-[hsl(var(--nordic-blue))] mr-2" />
            <h3 className="font-serif text-lg text-[hsl(var(--nordic-blue))]">Velg ny hentedato</h3>
          </div>

          <Calendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            availableWeekdays={availableWeekdays}
            minDaysNotice={2}
          />

          {/* New Dates Preview */}
          {selectedDate && calculatedDeliveryDate && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Nye datoer</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Henting</p>
                    <p className="font-medium text-teal-600 capitalize">
                      {formatDate(selectedDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Levering</p>
                    <p className="font-medium text-teal-600 capitalize">
                      {formatDate(calculatedDeliveryDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Link
            href={`/orders/details/${orderId}`}
            className="flex items-center text-[hsl(var(--nordic-blue)/70%)] hover:text-[hsl(var(--nordic-blue))] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Avbryt
          </Link>

          <button
            onClick={handleSubmit}
            disabled={!selectedDate || isSubmitting}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-sm flex items-center gap-2 ${
              selectedDate && !isSubmitting
                ? 'bg-gradient-to-r from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] text-white hover:shadow-lg hover:shadow-[hsl(var(--nordic-blue)/20%)]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Lagrer...' : 'Bekreft ny dato'}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-400">Renhet. Omtanke. NooraCare.</p>
        </div>
      </main>
    </div>
  );
}
