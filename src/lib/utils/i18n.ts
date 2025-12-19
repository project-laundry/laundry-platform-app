import type { SubscriptionFrequency } from "@/types/database";

/**
 * Translate subscription frequency to Norwegian
 */
export function translateFrequency(frequency: SubscriptionFrequency): string {
  const translations: Record<SubscriptionFrequency, string> = {
    weekly: 'Ukentlig',
    biweekly: 'Annenhver uke',
    monthly: 'Månedlig',
    on_demand: 'På bestilling',
  };

  return translations[frequency];
}
