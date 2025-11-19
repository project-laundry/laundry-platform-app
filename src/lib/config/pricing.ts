// NooraCare Pricing Configuration
// All prices are in øre (1 NOK = 100 øre)

export const PRICING = {
  // Add-on service prices
  ironing_price_ore: 4000, // 40 NOK per order
  delicate_item_price_ore: 7500, // 75 NOK per item
  extra_kg_price_ore: 1000, // 10 NOK per kg

  // Tax
  vat_rate_percent: 25, // Norwegian MVA
} as const;

// NOK display values (for UI components)
export const IRONING_PRICE_NOK = PRICING.ironing_price_ore / 100;
export const DELICATE_PRICE_NOK = PRICING.delicate_item_price_ore / 100;
export const EXTRA_KG_PRICE_NOK = PRICING.extra_kg_price_ore / 100;

// Helper to convert øre to NOK for display
export function oreToNok(ore: number): number {
  return ore / 100;
}

// Helper to convert NOK to øre for storage
export function nokToOre(nok: number): number {
  return Math.round(nok * 100);
}

// Calculate billing cost for a subscription
export function calculateBillingCostOre(
  planPriceOre: number,
  options: {
    needsIroning?: boolean;
    delicateItemsCount?: number;
    extraKg?: number;
  }
): number {
  let total = planPriceOre;

  if (options.needsIroning) {
    total += PRICING.ironing_price_ore;
  }

  if (options.delicateItemsCount && options.delicateItemsCount > 0) {
    total += options.delicateItemsCount * PRICING.delicate_item_price_ore;
  }

  if (options.extraKg && options.extraKg > 0) {
    total += options.extraKg * PRICING.extra_kg_price_ore;
  }

  return total;
}
