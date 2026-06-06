export interface OrderData {
  // City - derived from postal code (replaces location)
  city: 'Bergen' | 'Oslo' | null;

  // Frequency
  isRecurring: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly' | null;

  // Date
  firstPickupDate: string; // ISO date

  // Ironing preference (default for all orders)
  needsIroning: boolean;

  // Address (city is derived from postalCode, not stored here)
  address: {
    street: string;
    postalCode: string;
    specialInstructions: string;
  };

  // Instructions
  specialInstructions?: string;

  // Promo code (validated at checkout, applied to the first order)
  promoCode?: string;
}
