// NooraCare Pricing Configuration
// All prices are stored in øre (1 NOK = 100 øre)

import type { OrderSelection } from '@/types/order-flow';

// Ironing groups (cleaner-binding pricing and customer estimate share these)
export type IroningGroup = 'everyday' | 'shirts_dresses' | 'bedding';

// Ironing quantities per group (bedding is counted in sets)
export interface IroningDetails {
  everyday: number;
  shirts_dresses: number;
  bedding: number;
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
  // Cleaner-binding pricing: per-load (5kg load)
  price_per_load_ore: 22900, // 229.00 NOK per 5kg load

  // Ironing prices by group (in øre) — shared by cleaner pricing and estimate
  ironing: {
    everyday: 2900, // 29 NOK - Vanlige plagg, per piece
    shirts_dresses: 4900, // 49 NOK - Skjorter & kjoler, per piece
    bedding: 8500, // 85 NOK - Sengetøy, per set
  } as const,

  // Customer-estimate pricing (order flow / price calculator)
  per_bag_ore: 11900, // 119 NOK - a grocery bag of clothes ≈ half a load
  per_bedding_set_ore: 22900, // one bedding set is washed on its own ≈ one full load
  garments_per_bag: 10, // rough garment count used to seed the ironing estimate

  // Additional fees
  pickup_delivery_fee_ore: 10400, // 104.00 NOK (combined pickup + delivery)
  service_fee_ore: 1830, // 18.30 NOK
  minimum_order_ore: 50000, // 500 NOK minimum order

  // Cleaner payout percentage
  cleaner_payout_percent: 70,

  // Tax
  vat_rate_percent: 25, // Norwegian MVA
} as const;

// Ironing group labels (Norwegian)
export const IRONING_LABELS: Record<
  IroningGroup,
  { label: string; description: string }
> = {
  everyday: {
    label: 'Vanlige plagg',
    description: 'T-skjorter, bukser, gensere og lignende',
  },
  shirts_dresses: {
    label: 'Skjorter & kjoler',
    description: 'Presses enkeltvis',
  },
  bedding: {
    label: 'Sengetøy (per sett)',
    description: 'Dynetrekk, laken og putevar',
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

/** Whole-krone formatting with unit — estimates read cleaner without decimals. */
export function formatKr(ore: number): string {
  return `${Math.round(ore / 100).toLocaleString('nb-NO')} kr`;
}

/**
 * Get empty ironing details object with all groups set to 0
 */
export function getEmptyIroningDetails(): IroningDetails {
  return {
    everyday: 0,
    shirts_dresses: 0,
    bedding: 0,
  };
}

/**
 * Calculate order price based on laundry details (cleaner-binding pricing)
 *
 * @param details - Laundry details (loads and ironing)
 * @returns Complete price breakdown including cleaner payout
 */
export function calculateOrderPrice(details: LaundryDetails): PriceBreakdown {
  // Calculate loads subtotal
  const totalLoads = details.dark_loads + details.white_loads;
  const loads_subtotal_ore = totalLoads * PRICING.price_per_load_ore;

  // Calculate ironing subtotal. Iterate the configured groups (not the stored
  // keys) so legacy ironing_details blobs with unknown keys price as 0, not NaN.
  let ironing_subtotal_ore = 0;
  if (details.ironing_details) {
    for (const group of Object.keys(PRICING.ironing) as IroningGroup[]) {
      const count = details.ironing_details[group];
      if (typeof count === 'number' && count > 0) {
        ironing_subtotal_ore += count * PRICING.ironing[group];
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

// ─── Customer price estimate (order flow / price calculator) ─────────────────
// The customer picks bags/sets/pieces; the cleaner still sets the binding price
// after pickup. These lines only set expectations.

export interface PriceLine {
  key: string;
  label: string;
  detail: string;
  amountOre: number;
}

export interface PriceResult {
  lines: PriceLine[];
  hasItems: boolean;
  itemsSubtotalOre: number; // washing + ironing, before flat fees
  feesOre: number; // pickup/delivery + service fee
  subtotalOre: number; // everything before the minimum kicks in
  minimumApplied: boolean;
  totalOre: number;
}

/** Estimated number of garments to iron for a given number of bags. Used to
 *  seed the everyday-clothes count so the customer rarely has to count by hand. */
export function estimatedGarments(bags: number): number {
  return bags * PRICING.garments_per_bag;
}

export function calculateCustomerEstimate(sel: OrderSelection): PriceResult {
  const lines: PriceLine[] = [];

  if (sel.bags > 0) {
    lines.push({
      key: 'wash',
      label: 'Vask av klær',
      detail: `${sel.bags} ${sel.bags === 1 ? 'pose' : 'poser'}`,
      amountOre: sel.bags * PRICING.per_bag_ore,
    });
  }

  if (sel.beddingSets > 0) {
    lines.push({
      key: 'bedding',
      label: 'Sengetøy',
      detail: `${sel.beddingSets} sett · egen vask`,
      amountOre: sel.beddingSets * PRICING.per_bedding_set_ore,
    });
  }

  if (sel.everydayItems > 0) {
    lines.push({
      key: 'iron-everyday',
      label: 'Stryking av vanlige plagg',
      detail: `${sel.everydayItems} plagg`,
      amountOre: sel.everydayItems * PRICING.ironing.everyday,
    });
  }

  if (sel.formalItems > 0) {
    lines.push({
      key: 'iron-formal',
      label: 'Stryking av skjorter & kjoler',
      detail: `${sel.formalItems} plagg · per stykk`,
      amountOre: sel.formalItems * PRICING.ironing.shirts_dresses,
    });
  }

  if (sel.beddingSets > 0 && sel.ironBedding) {
    lines.push({
      key: 'iron-bedding',
      label: 'Stryking av sengetøy',
      detail: `${sel.beddingSets} sett`,
      amountOre: sel.beddingSets * PRICING.ironing.bedding,
    });
  }

  const hasItems = lines.length > 0;
  const itemsSubtotalOre = lines.reduce((sum, l) => sum + l.amountOre, 0);

  if (!hasItems) {
    return {
      lines,
      hasItems: false,
      itemsSubtotalOre: 0,
      feesOre: 0,
      subtotalOre: 0,
      minimumApplied: false,
      totalOre: 0,
    };
  }

  // Flat fees only appear once there's something to pick up.
  lines.push({
    key: 'pickup',
    label: 'Henting & levering',
    detail: 'Til døren',
    amountOre: PRICING.pickup_delivery_fee_ore,
  });
  lines.push({
    key: 'service',
    label: 'Servicegebyr',
    detail: '',
    amountOre: PRICING.service_fee_ore,
  });

  const feesOre = PRICING.pickup_delivery_fee_ore + PRICING.service_fee_ore;
  const subtotalOre = itemsSubtotalOre + feesOre;
  const minimumApplied = subtotalOre < PRICING.minimum_order_ore;
  const totalOre = minimumApplied ? PRICING.minimum_order_ore : subtotalOre;

  return {
    lines,
    hasItems,
    itemsSubtotalOre,
    feesOre,
    subtotalOre,
    minimumApplied,
    totalOre,
  };
}

/**
 * Compute the promo discount amount (in øre) for a given total.
 * - percentage: discount_value% of total, optionally capped at max_discount_ore
 * - fixed: discount_value øre
 * Always clamped to [0, totalOre] so the charged amount never goes negative.
 *
 * The discount applies AFTER the order minimum (the minimum is the service-price floor;
 * the promo is a real reduction on top, so the charged amount can fall below the minimum).
 */
export function computeDiscountOre(
  totalOre: number,
  promo: {
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_discount_ore: number | null;
  }
): number {
  if (totalOre <= 0) return 0;

  let discount: number;
  if (promo.discount_type === 'percentage') {
    discount = Math.round((totalOre * promo.discount_value) / 100);
    if (promo.max_discount_ore != null) {
      discount = Math.min(discount, promo.max_discount_ore);
    }
  } else {
    discount = promo.discount_value;
  }

  return Math.max(0, Math.min(discount, totalOre));
}
