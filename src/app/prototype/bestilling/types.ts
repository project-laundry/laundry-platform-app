// Shared types for the bestilling prototype flow.
import type { SupportedCity } from '@/lib/config/postal-codes';

export interface Address {
  street: string;
  postalCode: string;
  city: SupportedCity | null;
  instructions: string;
}

export type Frequency = 'weekly' | 'biweekly' | 'monthly';

export interface Schedule {
  pickupDate: string; // ISO yyyy-mm-dd, '' when unset
  isRecurring: boolean;
  frequency: Frequency;
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Ukentlig',
  biweekly: 'Annenhver uke',
  monthly: 'Månedlig',
};
