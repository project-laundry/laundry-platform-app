'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon } from 'lucide-react';
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center mb-4">
          <CalendarIcon className="w-5 h-5 text-teal-600 mr-2" />
          <h3 className="text-lg font-medium text-slate-900">Velg ny hentedato</h3>
        </div>

        <PickupCalendar
          availableWeekdays={availableWeekdays}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        {/* New dates preview */}
        {hasDateChanged && newDeliveryDate && (
          <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
            <h4 className="text-sm font-medium text-teal-800 mb-2">Nye datoer</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-teal-600">Henting</p>
                <p className="font-medium text-teal-900 capitalize">{formatDate(selectedDate)}</p>
              </div>
              <div>
                <p className="text-teal-600">Levering</p>
                <p className="font-medium text-teal-900 capitalize">{formatDate(newDeliveryDate)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-700 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!hasDateChanged || isSubmitting}
        className={`w-full py-4 rounded-xl font-medium transition-all duration-200 ${
          hasDateChanged && !isSubmitting
            ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Oppdaterer...
          </span>
        ) : (
          'Bekreft ny dato'
        )}
      </button>

      {/* Info text */}
      <p className="text-center text-xs text-slate-400">
        Levering skjer 2 dager etter henting. Ved endring kan renser bli byttet ut hvis nåværende renser ikke er tilgjengelig.
      </p>
    </div>
  );
}
