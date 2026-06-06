import { describe, it, expect } from 'vitest';
import {
  PRICING,
  calculateOrderPrice,
  computeDiscountOre,
  oreToNok,
  nokToOre,
  formatNok,
  formatNokWhole,
  getEmptyIroningDetails,
  getIroningPriceOre,
  isValidIroningDetails,
  type IroningDetails,
} from './pricing';

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

describe('formatNok / formatNokWhole', () => {
  it('formats with comma decimal separator', () => {
    expect(formatNok(22900)).toBe('229,00');
    expect(formatNok(1830)).toBe('18,30');
  });

  it('formats whole NOK without decimals', () => {
    expect(formatNokWhole(22900)).toBe('229');
    expect(formatNokWhole(22949)).toBe('229'); // rounds
    expect(formatNokWhole(22950)).toBe('230');
  });
});

describe('getEmptyIroningDetails', () => {
  it('returns all categories set to 0', () => {
    const empty = getEmptyIroningDetails();
    expect(Object.values(empty).every((v) => v === 0)).toBe(true);
    expect(Object.keys(empty)).toHaveLength(7);
  });
});

describe('getIroningPriceOre', () => {
  it('returns the configured price for a category', () => {
    expect(getIroningPriceOre('business_shirts')).toBe(PRICING.ironing.business_shirts);
    expect(getIroningPriceOre('king_bedding')).toBe(10260);
  });
});

describe('calculateOrderPrice', () => {
  const noIroning: IroningDetails | null = null;

  it('applies the order minimum when the subtotal is below it', () => {
    // 1 load (22900) + pickup/delivery (10400) + service (1830) = 35130 < 50000
    const result = calculateOrderPrice({ dark_loads: 1, white_loads: 0, ironing_details: noIroning });

    expect(result.loads_subtotal_ore).toBe(22900);
    expect(result.subtotal_ore).toBe(35130);
    expect(result.minimum_applied).toBe(true);
    expect(result.total_ore).toBe(PRICING.minimum_order_ore);
  });

  it('uses the actual subtotal when it exceeds the minimum', () => {
    // 3 loads (68700) + 10400 + 1830 = 80930 >= 50000
    const result = calculateOrderPrice({ dark_loads: 2, white_loads: 1, ironing_details: noIroning });

    expect(result.loads_subtotal_ore).toBe(68700);
    expect(result.subtotal_ore).toBe(80930);
    expect(result.minimum_applied).toBe(false);
    expect(result.total_ore).toBe(80930);
  });

  it('includes ironing in the subtotal', () => {
    const ironing: IroningDetails = {
      ...getEmptyIroningDetails(),
      business_shirts: 2, // 2 * 3470 = 6940
      single_bedding: 1, // 5680
    };
    const result = calculateOrderPrice({ dark_loads: 0, white_loads: 0, ironing_details: ironing });

    expect(result.ironing_subtotal_ore).toBe(6940 + 5680);
  });

  it('splits total into a 70% cleaner payout and 30% platform share', () => {
    const result = calculateOrderPrice({ dark_loads: 2, white_loads: 1, ironing_details: noIroning });

    expect(result.cleaner_payout_ore).toBe(Math.round((80930 * 70) / 100)); // 56651
    expect(result.platform_share_ore).toBe(80930 - result.cleaner_payout_ore);
    expect(result.cleaner_payout_ore + result.platform_share_ore).toBe(result.total_ore);
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

describe('isValidIroningDetails', () => {
  it('accepts a complete, non-negative object', () => {
    expect(isValidIroningDetails(getEmptyIroningDetails())).toBe(true);
  });

  it('rejects a missing category', () => {
    const { king_bedding, ...partial } = getEmptyIroningDetails();
    void king_bedding;
    expect(isValidIroningDetails(partial)).toBe(false);
  });

  it('rejects negative counts', () => {
    expect(isValidIroningDetails({ ...getEmptyIroningDetails(), kids_pillow: -1 })).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(isValidIroningDetails(null)).toBe(false);
    expect(isValidIroningDetails('nope')).toBe(false);
    expect(isValidIroningDetails(42)).toBe(false);
  });
});
