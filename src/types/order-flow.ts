import type { DeliveryIfAbsent } from '@/types/database';

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

  // What the customer wrote about the laundry itself (step 1, optional) —
  // becomes orders.special_instructions
  washInstructions?: string;

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

  // Delivery (step 2): what the cleaner does when nobody is home (required)
  // and an optional delivery note
  deliveryIfAbsent: DeliveryIfAbsent;
  deliveryInstructions: string;

  // Promo code (validated at checkout, applied to the first order)
  promoCode?: string;
  // Discount terms of the validated code — only used to preview the discount
  // on the confirm step. The server re-validates the code at checkout.
  promoTerms?: {
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_discount_ore: number | null;
  };
}
