// What the customer says they'll send — drives the price estimate and is
// persisted as the order's customer_estimate.
export interface OrderSelection {
  bags: number; // 0–12
  beddingSets: number; // 0–12
  everydayItems: number; // 0–120, ironing count
  formalItems: number; // 0–120, ironing count
  ironBedding: boolean;
}

export interface OrderData {
  // What the customer wants washed (step 1)
  selection: OrderSelection;

  // City - derived from postal code
  city: 'Bergen' | 'Oslo' | null;

  // Frequency
  isRecurring: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly' | null;

  // Date
  firstPickupDate: string; // ISO date

  // Address (city is derived from postalCode, not stored here)
  address: {
    street: string;
    postalCode: string;
    specialInstructions: string;
  };

  // Promo code (validated at checkout, applied to the first order)
  promoCode?: string;
}
