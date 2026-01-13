// NooraCare Pricing Configuration
// All prices are stored in øre (1 NOK = 100 øre)

// Ironing category keys
export type IroningCategory =
  | 'kids_pillow'
  | 'tshirts_shorts'
  | 'business_shirts'
  | 'single_bedding'
  | 'complex_dresses'
  | 'double_bedding'
  | 'king_bedding';

// Ironing quantities per category
export interface IroningDetails {
  kids_pillow: number;
  tshirts_shorts: number;
  business_shirts: number;
  single_bedding: number;
  complex_dresses: number;
  double_bedding: number;
  king_bedding: number;
}

// Complete laundry details for an order
export interface LaundryDetails {
  dark_loads: number;
  white_loads: number;
  ironing_details: IroningDetails | null;
}

// Price calculation breakdown
export interface PriceBreakdown {
  loads_subtotal_ore: number;
  ironing_subtotal_ore: number;
  pickup_delivery_ore: number;
  service_fee_ore: number;
  subtotal_ore: number;
  minimum_applied: boolean;
  total_ore: number;
  cleaner_payout_ore: number;
  platform_share_ore: number;
}

export const PRICING = {
  // Per-load pricing (5kg load)
  price_per_load_ore: 18595, // 185.95 NOK per 5kg load

  // Ironing prices by category (in øre)
  ironing: {
    kids_pillow: 1859, // 18.59 NOK - Kids clothes, pillow cases
    tshirts_shorts: 2306, // 23.06 NOK - T-shirts, shorts, skirts, jeans, trousers
    business_shirts: 2820, // 28.20 NOK - Business shirts, blouses, dresses
    single_bedding: 4611, // 46.11 NOK - Single bedding, tablecloths ≤1.5m x 1.5m
    complex_dresses: 5653, // 56.53 NOK - Complex dresses (maxi, puff sleeves, pleating)
    double_bedding: 6910, // 69.10 NOK - Double/queen bedding, tablecloths ≤1.8m x 1.8m
    king_bedding: 8330, // 83.30 NOK - King bedding, tablecloths ≤2.2m x 2.2m
  } as const,

  // Additional fees
  pickup_delivery_fee_ore: 8452, // 84.52 NOK (combined pickup + delivery)
  service_fee_ore: 1488, // 14.88 NOK
  minimum_order_ore: 50000, // 500 NOK minimum order

  // Cleaner payout percentage
  cleaner_payout_percent: 70,

  // Tax
  vat_rate_percent: 25, // Norwegian MVA
} as const;

// Ironing category labels (Norwegian)
export const IRONING_LABELS: Record<
  IroningCategory,
  { label: string; description: string }
> = {
  kids_pillow: {
    label: 'Barneklær, putevar',
    description: 'Små plagg og putevar',
  },
  tshirts_shorts: {
    label: 'T-skjorter, shorts, skjørt, jeans, bukser',
    description: 'Standard hverdagsplagg',
  },
  business_shirts: {
    label: 'Skjorter, bluser, kjoler',
    description: 'Formelle plagg',
  },
  single_bedding: {
    label: 'Enkelt sengetøy, duker (≤1.5m x 1.5m)',
    description: 'Laken, putevar, små duker',
  },
  complex_dresses: {
    label: 'Komplekse kjoler',
    description: 'Maxi, puffermer, plissé, volanger, sari',
  },
  double_bedding: {
    label: 'Dobbelt/queen sengetøy, duker (≤1.8m x 1.8m)',
    description: 'Mellomstore tekstiler',
  },
  king_bedding: {
    label: 'King sengetøy, duker (≤2.2m x 2.2m)',
    description: 'Store tekstiler',
  },
};

// Helper to convert øre to NOK for display
export function oreToNok(ore: number): number {
  return ore / 100;
}

// Helper to convert NOK to øre for storage
export function nokToOre(nok: number): number {
  return Math.round(nok * 100);
}

// Format øre as NOK string with comma decimal separator
export function formatNok(ore: number): string {
  return oreToNok(ore).toFixed(2).replace('.', ',');
}

// Format øre as NOK string without decimals
export function formatNokWhole(ore: number): string {
  return Math.round(oreToNok(ore)).toString();
}

/**
 * Get empty ironing details object with all categories set to 0
 */
export function getEmptyIroningDetails(): IroningDetails {
  return {
    kids_pillow: 0,
    tshirts_shorts: 0,
    business_shirts: 0,
    single_bedding: 0,
    complex_dresses: 0,
    double_bedding: 0,
    king_bedding: 0,
  };
}

/**
 * Calculate order price based on laundry details
 * Reusable for both cleaner pricing and customer price estimator
 *
 * @param details - Laundry details (loads and ironing)
 * @returns Complete price breakdown including cleaner payout
 */
export function calculateOrderPrice(details: LaundryDetails): PriceBreakdown {
  // Calculate loads subtotal
  const totalLoads = details.dark_loads + details.white_loads;
  const loads_subtotal_ore = totalLoads * PRICING.price_per_load_ore;

  // Calculate ironing subtotal
  let ironing_subtotal_ore = 0;
  if (details.ironing_details) {
    for (const [category, count] of Object.entries(details.ironing_details)) {
      if (count > 0) {
        ironing_subtotal_ore +=
          count * PRICING.ironing[category as IroningCategory];
      }
    }
  }

  // Add fees
  const pickup_delivery_ore = PRICING.pickup_delivery_fee_ore;
  const service_fee_ore = PRICING.service_fee_ore;

  // Calculate subtotal
  const subtotal_ore =
    loads_subtotal_ore + ironing_subtotal_ore + pickup_delivery_ore + service_fee_ore;

  // Apply minimum
  const minimum_applied = subtotal_ore < PRICING.minimum_order_ore;
  const total_ore = minimum_applied ? PRICING.minimum_order_ore : subtotal_ore;

  // Calculate cleaner payout (70% of total)
  const cleaner_payout_ore = Math.round(
    (total_ore * PRICING.cleaner_payout_percent) / 100
  );
  const platform_share_ore = total_ore - cleaner_payout_ore;

  return {
    loads_subtotal_ore,
    ironing_subtotal_ore,
    pickup_delivery_ore,
    service_fee_ore,
    subtotal_ore,
    minimum_applied,
    total_ore,
    cleaner_payout_ore,
    platform_share_ore,
  };
}

/**
 * Get price for a specific ironing category in øre
 */
export function getIroningPriceOre(category: IroningCategory): number {
  return PRICING.ironing[category];
}

/**
 * Validate ironing details structure
 */
export function isValidIroningDetails(details: unknown): details is IroningDetails {
  if (!details || typeof details !== 'object') return false;
  const requiredKeys: IroningCategory[] = [
    'kids_pillow',
    'tshirts_shorts',
    'business_shirts',
    'single_bedding',
    'complex_dresses',
    'double_bedding',
    'king_bedding',
  ];
  return requiredKeys.every(
    (key) =>
      key in details &&
      typeof (details as Record<string, unknown>)[key] === 'number' &&
      (details as Record<string, number>)[key] >= 0
  );
}
