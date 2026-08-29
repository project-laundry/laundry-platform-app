'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar as CalendarIcon, Check, Loader2 } from 'lucide-react';
import { PickupCalendar } from '@/components/ui/PickupCalendar';
import { updateOrderPickupDateAction } from '@/app/orders/actions';
import { addDays, toISODateString } from '@/lib/utils/date';
import { DAYS_PICKUP_TO_DELIVERY } from '@/lib/config/order-timing';
import type { Weekday } from '@/types/database';

interface RescheduleFormProps {
  orderId: string;
  currentPickupDate: string;
  availableWeekdays: Weekday[];
}

export function RescheduleForm({
  orderId,
  currentPickupDate,
  availableWeekdays,
}: RescheduleFormProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(currentPickupDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasDateChanged = selectedDate !== currentPickupDate;

  // Calculate new delivery date based on selected pickup date
  const getNewDeliveryDate = (pickupDate: string) => {
    return toISODateString(addDays(new Date(pickupDate), DAYS_PICKUP_TO_DELIVERY));
  };

  const newDeliveryDate = hasDateChanged ? getNewDeliveryDate(selectedDate) : null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const handleSubmit = async () => {
    if (!hasDateChanged) {
      setError('Vennligst velg en ny dato');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await updateOrderPickupDateAction(orderId, selectedDate);

      if (!result.success) {
        setError(result.error || 'Kunne ikke oppdatere hentedato');
        return;
      }

      // Show success message
      let message = 'Hentedato er oppdatert!';
      if (result.cleanerChanged && result.newCleanerName) {
        message += ` Ny renser: ${result.newCleanerName}`;
      }
      setSuccessMessage(message);

      // Redirect back to order details after a short delay
      setTimeout(() => {
        router.push(`/orders/details/${orderId}`);
        router.refresh();
      }, 1500);
    } catch {
      setError('En feil oppstod. Vennligst prøv igjen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Section */}
      <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
            <CalendarIcon className="size-5" />
          </span>
          <h3 className="font-serif text-lg font-semibold text-dark-gray">
            Velg ny hentedato
          </h3>
        </div>

        <div className="mt-4">
          <PickupCalendar
            availableWeekdays={availableWeekdays}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </div>

        {/* New dates preview */}
        {hasDateChanged && newDeliveryDate && (
          <div className="mt-4 rounded-2xl border border-dashed border-sea-green/40 bg-sea-green/5 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <h4 className="text-sm font-medium text-dark-gray">Nye datoer</h4>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-medium-gray">Henting</p>
                <p className="font-medium capitalize text-dark-gray">
                  {formatDate(selectedDate)}
                </p>
              </div>
              <div>
                <p className="text-medium-gray">Levering</p>
                <p className="font-medium capitalize text-dark-gray">
                  {formatDate(newDeliveryDate)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-start gap-2 rounded-2xl bg-sea-green/10 px-3.5 py-2.5 text-sm text-sea-green">
          <Check className="mt-0.5 size-4 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!hasDateChanged || isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Oppdaterer...
          </>
        ) : (
          'Bekreft ny dato'
        )}
      </button>

      {/* Info text */}
      <p className="text-center text-xs text-medium-gray">
        Levering skjer 2 dager etter henting. Ved endring kan renser bli byttet ut hvis nåværende renser ikke er tilgjengelig.
      </p>
    </div>
  );
}
