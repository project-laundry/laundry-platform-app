import { describe, it, expect } from 'vitest';
import {
  PRICING,
  calculateOrderPrice,
  calculateCustomerEstimate,
  computeDiscountOre,
  estimatedGarments,
  oreToNok,
  nokToOre,
  formatKr,
  formatNok,
  formatNokWhole,
  getEmptyIroningDetails,
  type IroningDetails,
} from './pricing';
import type { OrderSelection } from '@/types/order-flow';

const emptySelection: OrderSelection = {
  bags: 0,
  beddingSets: 0,
  everydayItems: 0,
  formalItems: 0,
  ironBedding: false,
};

describe('oreToNok / nokToOre', () => {
  it('converts øre to NOK', () => {
    expect(oreToNok(22900)).toBe(229);
    expect(oreToNok(0)).toBe(0);
  });

  it('converts NOK to øre and rounds', () => {
    expect(nokToOre(229)).toBe(22900);
    expect(nokToOre(18.305)).toBe(1831); // rounds half up
    expect(nokToOre(18.301)).toBe(1830);
  });

  it('round-trips through øre', () => {
    expect(oreToNok(nokToOre(104))).toBe(104);
  });
});

describe('formatNok / formatNokWhole / formatKr', () => {
  it('formats with comma decimal separator', () => {
    expect(formatNok(22900)).toBe('229,00');
    expect(formatNok(1830)).toBe('18,30');
  });

  it('formats whole NOK without decimals', () => {
    expect(formatNokWhole(22900)).toBe('229');
    expect(formatNokWhole(22949)).toBe('229'); // rounds
    expect(formatNokWhole(22950)).toBe('230');
  });

  it('formats whole kroner with unit', () => {
    expect(formatKr(11900)).toBe('119 kr');
    expect(formatKr(50000)).toBe('500 kr');
  });
});

describe('getEmptyIroningDetails', () => {
  it('returns all groups set to 0', () => {
    const empty = getEmptyIroningDetails();
    expect(Object.values(empty).every((v) => v === 0)).toBe(true);
    expect(Object.keys(empty).sort()).toEqual(['bedding', 'everyday', 'shirts_dresses']);
  });
});

describe('calculateOrderPrice', () => {
  const noIroning: IroningDetails | null = null;

  it('applies the order minimum when the subtotal is below it', () => {
    // 1 load (22900) + pickup/delivery (10400) + service (1830) = 35130 < 50000
    const result = calculateOrderPrice({ wash_loads: 1, ironing_details: noIroning });

    expect(result.loads_subtotal_ore).toBe(22900);
    expect(result.subtotal_ore).toBe(35130);
    expect(result.minimum_applied).toBe(true);
    expect(result.total_ore).toBe(PRICING.minimum_order_ore);
  });

  it('uses the actual subtotal when it exceeds the minimum', () => {
    // 3 loads (68700) + 10400 + 1830 = 80930 >= 50000
    const result = calculateOrderPrice({ wash_loads: 3, ironing_details: noIroning });

    expect(result.loads_subtotal_ore).toBe(68700);
    expect(result.subtotal_ore).toBe(80930);
    expect(result.minimum_applied).toBe(false);
    expect(result.total_ore).toBe(80930);
  });

  it('includes ironing in the subtotal', () => {
    const ironing: IroningDetails = {
      everyday: 0,
      shirts_dresses: 2, // 2 * 4900 = 9800
      bedding: 1, // 8500
    };
    const result = calculateOrderPrice({ wash_loads: 0, ironing_details: ironing });

    expect(result.ironing_subtotal_ore).toBe(9800 + 8500);
  });

  it('ignores unknown ironing keys from legacy 7-category data', () => {
    const legacy = {
      kids_pillow: 3,
      tshirts_shorts: 2,
      business_shirts: 1,
    } as unknown as IroningDetails;
    const result = calculateOrderPrice({ wash_loads: 1, ironing_details: legacy });

    expect(result.ironing_subtotal_ore).toBe(0);
    expect(Number.isFinite(result.total_ore)).toBe(true);
  });

  it('splits total into a 70% cleaner payout and 30% platform share', () => {
    const result = calculateOrderPrice({ wash_loads: 3, ironing_details: noIroning });

    expect(result.cleaner_payout_ore).toBe(Math.round((80930 * 70) / 100)); // 56651
    expect(result.platform_share_ore).toBe(80930 - result.cleaner_payout_ore);
    expect(result.cleaner_payout_ore + result.platform_share_ore).toBe(result.total_ore);
  });
});

describe('calculateCustomerEstimate', () => {
  it('returns an empty result with no fees for an empty selection', () => {
    const result = calculateCustomerEstimate(emptySelection);

    expect(result.hasItems).toBe(false);
    expect(result.lines).toHaveLength(0);
    expect(result.feesOre).toBe(0);
    expect(result.totalOre).toBe(0);
  });

  it('applies the minimum for a single bag', () => {
    // 1 bag (11900) + pickup/delivery (10400) + service (1830) = 24130 < 50000
    const result = calculateCustomerEstimate({ ...emptySelection, bags: 1 });

    expect(result.itemsSubtotalOre).toBe(11900);
    expect(result.subtotalOre).toBe(24130);
    expect(result.minimumApplied).toBe(true);
    expect(result.totalOre).toBe(PRICING.minimum_order_ore);
  });

  it('sums bags, bedding and ironing above the minimum', () => {
    // 3 bags (35700) + 2 sets (45800) + 5 formal (24500) + ironed bedding (17000)
    const result = calculateCustomerEstimate({
      bags: 3,
      beddingSets: 2,
      everydayItems: 0,
      formalItems: 5,
      ironBedding: true,
    });

    expect(result.itemsSubtotalOre).toBe(35700 + 45800 + 24500 + 17000);
    expect(result.subtotalOre).toBe(result.itemsSubtotalOre + 10400 + 1830);
    expect(result.minimumApplied).toBe(false);
    expect(result.totalOre).toBe(result.subtotalOre);
  });

  it('only prices bedding ironing when bedding sets are selected', () => {
    const result = calculateCustomerEstimate({
      ...emptySelection,
      bags: 1,
      ironBedding: true,
    });

    expect(result.lines.some((l) => l.key === 'iron-bedding')).toBe(false);
  });

  it('adds the flat fee lines exactly once', () => {
    const result = calculateCustomerEstimate({ ...emptySelection, bags: 2, everydayItems: 4 });

    expect(result.lines.filter((l) => l.key === 'pickup')).toHaveLength(1);
    expect(result.lines.filter((l) => l.key === 'service')).toHaveLength(1);
    expect(result.feesOre).toBe(10400 + 1830);
  });
});

describe('estimatedGarments', () => {
  it('scales with the bag count', () => {
    expect(estimatedGarments(0)).toBe(0);
    expect(estimatedGarments(2)).toBe(2 * PRICING.garments_per_bag);
  });
});

describe('computeDiscountOre', () => {
  it('computes a percentage discount', () => {
    expect(computeDiscountOre(50000, { discount_type: 'percentage', discount_value: 20, max_discount_ore: null })).toBe(10000);
  });

  it('caps a percentage discount at max_discount_ore', () => {
    expect(computeDiscountOre(50000, { discount_type: 'percentage', discount_value: 50, max_discount_ore: 10000 })).toBe(10000);
  });

  it('applies a fixed discount', () => {
    expect(computeDiscountOre(50000, { discount_type: 'fixed', discount_value: 15000, max_discount_ore: null })).toBe(15000);
  });

  it('never discounts more than the total', () => {
    expect(computeDiscountOre(50000, { discount_type: 'fixed', discount_value: 60000, max_discount_ore: null })).toBe(50000);
  });

  it('returns 0 for a non-positive total', () => {
    expect(computeDiscountOre(0, { discount_type: 'percentage', discount_value: 20, max_discount_ore: null })).toBe(0);
    expect(computeDiscountOre(-100, { discount_type: 'fixed', discount_value: 50, max_discount_ore: null })).toBe(0);
  });
});
