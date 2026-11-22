import { describe, it, expect } from 'vitest';
import {
  PRICING,
  calculateOrderPrice,
  calculateCustomerEstimate,
  computeDiscountOre,
  applyPromoDiscount,
  estimateAfterPromo,
  estimatedGarments,
  withoutUnofferedIroning,
  oreToNok,
  nokToOre,
  formatKr,
  formatKrExact,
  formatNok,
  formatNokWhole,
  getEmptyIroningDetails,
  PRICE_REVIEW_ESTIMATE_FACTOR,
  isPriceFarAboveEstimate,
  orderPriceNeedsReview,
  isChargeHeldForPriceReview,
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

  it('keeps the øre only when there are any', () => {
    expect(formatKrExact(35000)).toBe('350 kr');
    expect(formatKrExact(56651)).toBe('566,51 kr');
    expect(formatKrExact(0)).toBe('0 kr');
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
    // 1 load (29900) + pickup/delivery (10400) + service (1830) = 42130 < 50000
    const result = calculateOrderPrice({ wash_loads: 1, ironing_details: noIroning });

    expect(result.loads_subtotal_ore).toBe(29900);
    expect(result.subtotal_ore).toBe(42130);
    expect(result.minimum_applied).toBe(true);
    expect(result.total_ore).toBe(PRICING.minimum_order_ore);
  });

  it('uses the actual subtotal when it exceeds the minimum', () => {
    // 3 loads (89700) + 10400 + 1830 = 101930 >= 50000
    const result = calculateOrderPrice({ wash_loads: 3, ironing_details: noIroning });

    expect(result.loads_subtotal_ore).toBe(89700);
    expect(result.subtotal_ore).toBe(101930);
    expect(result.minimum_applied).toBe(false);
    expect(result.total_ore).toBe(101930);
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

    expect(result.cleaner_payout_ore).toBe(Math.round((101930 * 70) / 100)); // 71351
    expect(result.platform_share_ore).toBe(101930 - result.cleaner_payout_ore);
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
    // 1 bag (29900) + pickup/delivery (10400) + service (1830) = 42130 < 50000
    const result = calculateCustomerEstimate({ ...emptySelection, bags: 1 });

    expect(result.itemsSubtotalOre).toBe(29900);
    expect(result.subtotalOre).toBe(42130);
    expect(result.minimumApplied).toBe(true);
    expect(result.totalOre).toBe(PRICING.minimum_order_ore);
  });

  it('sums bags, bedding and ironing above the minimum', () => {
    // 3 bags (89700) + 2 sets (59800) + 5 formal (24500) + ironed bedding (17000)
    const result = calculateCustomerEstimate({
      bags: 3,
      beddingSets: 2,
      everydayItems: 0,
      formalItems: 5,
      ironBedding: true,
    });

    expect(result.itemsSubtotalOre).toBe(89700 + 59800 + 24500 + 17000);
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

describe('withoutUnofferedIroning', () => {
  it('zeroes ironing and keeps bags and bedding while ironing is not offered', () => {
    const stale = { bags: 1, beddingSets: 1, everydayItems: 2, formalItems: 2, ironBedding: true };
    expect(withoutUnofferedIroning(stale)).toEqual({
      bags: 1,
      beddingSets: 1,
      everydayItems: 0,
      formalItems: 0,
      ironBedding: false,
    });
    const lines = calculateCustomerEstimate(withoutUnofferedIroning(stale)).lines;
    expect(lines.some((l) => l.key.startsWith('iron'))).toBe(false);
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

describe('applyPromoDiscount', () => {
  const promo = {
    promo_code_id: 'pc-1',
    code: 'HALV',
    discount_type: 'percentage' as const,
    discount_value: 50,
    max_discount_ore: null,
  };

  it('leaves the total untouched without a promo', () => {
    expect(applyPromoDiscount(80930, null)).toEqual({ total_cost_ore: 80930, promo: null });
  });

  it('reduces the total and fills in discount_ore on the snapshot', () => {
    expect(applyPromoDiscount(80930, promo)).toEqual({
      total_cost_ore: 40465,
      promo: { ...promo, discount_ore: 40465 },
    });
  });

  it('can reach a 0 total with a full discount', () => {
    expect(applyPromoDiscount(50000, { ...promo, discount_value: 100 })).toEqual({
      total_cost_ore: 0,
      promo: { ...promo, discount_value: 100, discount_ore: 50000 },
    });
  });
});

describe('estimateAfterPromo', () => {
  it('returns the estimate unchanged without a promo', () => {
    expect(estimateAfterPromo(72000, null)).toEqual({ discountOre: 0, totalOre: 72000 });
    expect(estimateAfterPromo(72000, undefined)).toEqual({ discountOre: 0, totalOre: 72000 });
  });

  it('subtracts a fixed discount', () => {
    expect(
      estimateAfterPromo(72000, { discount_type: 'fixed', discount_value: 40000, max_discount_ore: null })
    ).toEqual({ discountOre: 40000, totalOre: 32000 });
  });

  it('subtracts a capped percentage discount', () => {
    expect(
      estimateAfterPromo(72000, { discount_type: 'percentage', discount_value: 50, max_discount_ore: 20000 })
    ).toEqual({ discountOre: 20000, totalOre: 52000 });
  });

  it('never goes below 0', () => {
    expect(
      estimateAfterPromo(50000, { discount_type: 'fixed', discount_value: 90000, max_discount_ore: null })
    ).toEqual({ discountOre: 50000, totalOre: 0 });
  });
});


describe('price guard', () => {
  const estimate = (estimated_total_ore: number) => ({
    bags: 1,
    bedding_sets: 0,
    iron_everyday_items: 0,
    iron_formal_items: 0,
    iron_bedding: false,
    estimated_total_ore,
  });
  const promo = {
    promo_code_id: 'pc-1',
    code: 'HALV',
    discount_type: 'percentage' as const,
    discount_value: 50,
    max_discount_ore: null,
  };

  it('uses a factor of 2', () => {
    expect(PRICE_REVIEW_ESTIMATE_FACTOR).toBe(2);
  });

  describe('isPriceFarAboveEstimate', () => {
    it('is true only above the factor times the estimate', () => {
      expect(isPriceFarAboveEstimate(100001, 50000)).toBe(true);
      expect(isPriceFarAboveEstimate(100000, 50000)).toBe(false);
      expect(isPriceFarAboveEstimate(50000, 50000)).toBe(false);
    });

    it('is never true without an estimate', () => {
      expect(isPriceFarAboveEstimate(460730, null)).toBe(false);
      expect(isPriceFarAboveEstimate(460730, undefined)).toBe(false);
      expect(isPriceFarAboveEstimate(460730, 0)).toBe(false);
    });

    it('holds 15 washes against a one-bag estimate, but not 2 washes', () => {
      const oneBag = calculateCustomerEstimate({ ...emptySelection, bags: 1 }).totalOre;
      expect(oneBag).toBe(50000);
      const fifteen = calculateOrderPrice({ wash_loads: 15, ironing_details: null }).total_ore;
      const two = calculateOrderPrice({ wash_loads: 2, ironing_details: null }).total_ore;
      expect(fifteen).toBe(460730);
      expect(isPriceFarAboveEstimate(fifteen, oneBag)).toBe(true);
      expect(isPriceFarAboveEstimate(two, oneBag)).toBe(false);
    });
  });

  describe('orderPriceNeedsReview', () => {
    it('is true for a price above twice the estimate', () => {
      expect(
        orderPriceNeedsReview({ total_cost_ore: 460730, promo: null, customer_estimate: estimate(50000) })
      ).toBe(true);
    });

    it('is false at exactly twice the estimate', () => {
      expect(
        orderPriceNeedsReview({ total_cost_ore: 100000, promo: null, customer_estimate: estimate(50000) })
      ).toBe(false);
    });

    it('is false without an estimate', () => {
      expect(
        orderPriceNeedsReview({ total_cost_ore: 460730, promo: null, customer_estimate: null })
      ).toBe(false);
    });

    it('is false for an unpriced order and for a 0 total', () => {
      expect(
        orderPriceNeedsReview({ total_cost_ore: null, promo: null, customer_estimate: estimate(50000) })
      ).toBe(false);
      expect(
        orderPriceNeedsReview({
          total_cost_ore: 0,
          promo: { ...promo, discount_value: 100, discount_ore: 460730 },
          customer_estimate: estimate(50000),
        })
      ).toBe(false);
    });

    it('compares the full price before the promo discount', () => {
      // Charged 60000 after a 60000 discount → full price 120000 > 2 × 50000.
      expect(
        orderPriceNeedsReview({
          total_cost_ore: 60000,
          promo: { ...promo, discount_ore: 60000 },
          customer_estimate: estimate(50000),
        })
      ).toBe(true);
      // The same charge without a discount is under the limit.
      expect(
        orderPriceNeedsReview({ total_cost_ore: 60000, promo: null, customer_estimate: estimate(50000) })
      ).toBe(false);
    });
  });

  describe('isChargeHeldForPriceReview', () => {
    const held = {
      status: 'ready_for_delivery' as const,
      total_cost_ore: 460730,
      promo: null,
      customer_estimate: estimate(50000),
    };

    it('is true for a ready or completed order with no payment rows', () => {
      expect(isChargeHeldForPriceReview(held, 0)).toBe(true);
      expect(isChargeHeldForPriceReview({ ...held, status: 'completed' }, 0)).toBe(true);
    });

    it('is false once the order has any payment row', () => {
      expect(isChargeHeldForPriceReview(held, 1)).toBe(false);
    });

    it('is false before the ready step and for a cancelled order', () => {
      expect(isChargeHeldForPriceReview({ ...held, status: 'in_cleaning' }, 0)).toBe(false);
      expect(isChargeHeldForPriceReview({ ...held, status: 'cancelled' }, 0)).toBe(false);
    });

    it('is false when the price is within the limit or there is no estimate', () => {
      expect(isChargeHeldForPriceReview({ ...held, total_cost_ore: 100000 }, 0)).toBe(false);
      expect(isChargeHeldForPriceReview({ ...held, customer_estimate: null }, 0)).toBe(false);
    });
  });
});
