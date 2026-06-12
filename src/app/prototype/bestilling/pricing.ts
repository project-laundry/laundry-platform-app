// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — pricing for the "what do you want washed?" order flow.
//
// Self-contained on purpose: the prototype owns its own tentative numbers so it
// can be deleted in one folder without touching production pricing. Values are
// rough customer-facing estimates that mirror the real model in
// src/lib/config/pricing.ts (a real 5 kg "vask" is 229 kr). The cleaner sets the
// binding price after pickup — this screen only sets expectations.
// ─────────────────────────────────────────────────────────────────────────────

// All amounts in øre (1 kr = 100 øre).
export const PROTO_PRICING = {
  // A grocery bag of clothes is roughly half a 5 kg load.
  per_bag_ore: 11900, // 119 kr / pose
  // Bedding is washed on its own — one set ≈ one full load.
  per_bedding_set_ore: 22900, // 229 kr / sett
  // Ironing is priced per *garment* in the real model (~28–35 kr each for
  // everyday clothes). The customer only picks bags, so we estimate the number
  // of garments in a bag and price from that.
  garments_per_bag: 10, // rough count for a standard grocery bag
  iron_per_garment_ore: 2990, // 29.90 kr — everyday-garment average
  iron_bedding_per_set_ore: 8500, // 85 kr / sett
  // Flat fees, matched to the production model.
  pickup_delivery_ore: 10400, // 104 kr
  service_fee_ore: 1830, // 18 kr
  // Minimum order value.
  minimum_ore: 50000, // 500 kr
} as const;

export interface Selection {
  bags: number;
  beddingSets: number;
  ironClothes: boolean;
  ironBedding: boolean;
}

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

/** Whole-krone formatting — tentative estimates read cleaner without decimals. */
export function formatKr(ore: number): string {
  return `${Math.round(ore / 100).toLocaleString('nb-NO')} kr`;
}

/** Estimated number of garments to iron for a given number of bags. */
export function estimatedGarments(bags: number): number {
  return bags * PROTO_PRICING.garments_per_bag;
}

/** Estimated ironing cost (øre) for a bag of clothes. */
export function ironClothesPerBagOre(): number {
  return PROTO_PRICING.garments_per_bag * PROTO_PRICING.iron_per_garment_ore;
}

export function calculatePrice(sel: Selection): PriceResult {
  const lines: PriceLine[] = [];

  if (sel.bags > 0) {
    lines.push({
      key: 'wash',
      label: 'Vask av klær',
      detail: `${sel.bags} ${sel.bags === 1 ? 'pose' : 'poser'}`,
      amountOre: sel.bags * PROTO_PRICING.per_bag_ore,
    });
  }

  if (sel.beddingSets > 0) {
    lines.push({
      key: 'bedding',
      label: 'Sengetøy',
      detail: `${sel.beddingSets} ${sel.beddingSets === 1 ? 'sett' : 'sett'} · egen vask`,
      amountOre: sel.beddingSets * PROTO_PRICING.per_bedding_set_ore,
    });
  }

  if (sel.bags > 0 && sel.ironClothes) {
    const garments = estimatedGarments(sel.bags);
    lines.push({
      key: 'iron-clothes',
      label: 'Stryking av klær',
      detail: `ca. ${garments} plagg`,
      amountOre: garments * PROTO_PRICING.iron_per_garment_ore,
    });
  }

  if (sel.beddingSets > 0 && sel.ironBedding) {
    lines.push({
      key: 'iron-bedding',
      label: 'Stryking av sengetøy',
      detail: `${sel.beddingSets} ${sel.beddingSets === 1 ? 'sett' : 'sett'}`,
      amountOre: sel.beddingSets * PROTO_PRICING.iron_bedding_per_set_ore,
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
    amountOre: PROTO_PRICING.pickup_delivery_ore,
  });
  lines.push({
    key: 'service',
    label: 'Servicegebyr',
    detail: '',
    amountOre: PROTO_PRICING.service_fee_ore,
  });

  const feesOre = PROTO_PRICING.pickup_delivery_ore + PROTO_PRICING.service_fee_ore;
  const subtotalOre = itemsSubtotalOre + feesOre;
  const minimumApplied = subtotalOre < PROTO_PRICING.minimum_ore;
  const totalOre = minimumApplied ? PROTO_PRICING.minimum_ore : subtotalOre;

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
