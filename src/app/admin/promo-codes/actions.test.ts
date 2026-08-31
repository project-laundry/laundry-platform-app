import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ assertRole: vi.fn() }));
vi.mock('@/lib/database/promo-codes', () => ({
  createPromoCode: vi.fn(),
  updatePromoCode: vi.fn(),
}));

import { assertRole } from '@/lib/auth/require-role';
import { createPromoCode, updatePromoCode } from '@/lib/database/promo-codes';
import {
  createPromoCodeAction,
  updatePromoCodeAction,
  type PromoCodeFormInput,
} from './actions';

const m = (fn: unknown) => fn as Mock;

const BASE_INPUT: PromoCodeFormInput = {
  code: 'velkommen10',
  discount_type: 'percentage',
  discount_value: '10',
  max_discount_kr: '',
  valid_from: '',
  valid_until: '',
  max_redemptions: '',
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  m(assertRole).mockResolvedValue({ auth: { authUserId: 'admin-1' }, error: null });
  m(createPromoCode).mockResolvedValue({ promoCode: { id: 'promo-1' }, error: null });
  m(updatePromoCode).mockResolvedValue({ promoCode: { id: 'promo-1' }, error: null });
});

describe('createPromoCodeAction', () => {
  it('rejects when the caller is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await createPromoCodeAction(BASE_INPUT);

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(createPromoCode).not.toHaveBeenCalled();
  });

  it('normalizes the code to uppercase and builds the percentage payload', async () => {
    const result = await createPromoCodeAction({ ...BASE_INPUT, max_discount_kr: '200' });

    expect(result).toEqual({ success: true });
    expect(createPromoCode).toHaveBeenCalledWith({
      code: 'VELKOMMEN10',
      discount_type: 'percentage',
      discount_value: 10,
      max_discount_ore: 20000,
      active: true,
      valid_from: null,
      valid_until: null,
      max_redemptions: null,
    });
  });

  it('converts a fixed discount from kroner to øre and drops the cap', async () => {
    const result = await createPromoCodeAction({
      ...BASE_INPUT,
      discount_type: 'fixed',
      discount_value: '150',
      max_discount_kr: '200',
    });

    expect(result).toEqual({ success: true });
    expect(createPromoCode).toHaveBeenCalledWith(
      expect.objectContaining({
        discount_type: 'fixed',
        discount_value: 15000,
        max_discount_ore: null,
      })
    );
  });

  it('converts the validity window to UTC day boundaries', async () => {
    await createPromoCodeAction({
      ...BASE_INPUT,
      valid_from: '2026-09-01',
      valid_until: '2026-09-30',
    });

    expect(createPromoCode).toHaveBeenCalledWith(
      expect.objectContaining({
        valid_from: '2026-09-01T00:00:00.000Z',
        valid_until: '2026-09-30T23:59:59.999Z',
      })
    );
  });

  it('rejects a percentage above 100', async () => {
    const result = await createPromoCodeAction({ ...BASE_INPUT, discount_value: '150' });

    expect(result.success).toBe(false);
    expect(createPromoCode).not.toHaveBeenCalled();
  });

  it('rejects a code with spaces or special characters', async () => {
    const result = await createPromoCodeAction({ ...BASE_INPUT, code: 'a b!' });

    expect(result.success).toBe(false);
    expect(createPromoCode).not.toHaveBeenCalled();
  });

  it('rejects a from-date after the until-date', async () => {
    const result = await createPromoCodeAction({
      ...BASE_INPUT,
      valid_from: '2026-10-01',
      valid_until: '2026-09-01',
    });

    expect(result.success).toBe(false);
    expect(createPromoCode).not.toHaveBeenCalled();
  });

  it('propagates a duplicate-code error', async () => {
    m(createPromoCode).mockResolvedValue({ promoCode: null, error: 'Koden finnes allerede' });

    const result = await createPromoCodeAction(BASE_INPUT);

    expect(result).toEqual({ success: false, error: 'Koden finnes allerede' });
  });
});

describe('updatePromoCodeAction', () => {
  it('updates with the built payload', async () => {
    const result = await updatePromoCodeAction('promo-1', { ...BASE_INPUT, active: false });

    expect(result).toEqual({ success: true });
    expect(updatePromoCode).toHaveBeenCalledWith(
      'promo-1',
      expect.objectContaining({ code: 'VELKOMMEN10', active: false })
    );
  });

  it('rejects when the caller is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await updatePromoCodeAction('promo-1', BASE_INPUT);

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(updatePromoCode).not.toHaveBeenCalled();
  });

  it('propagates a not-found error', async () => {
    m(updatePromoCode).mockResolvedValue({
      promoCode: null,
      error: 'Rabattkoden ble ikke funnet',
    });

    const result = await updatePromoCodeAction('promo-x', BASE_INPUT);

    expect(result).toEqual({ success: false, error: 'Rabattkoden ble ikke funnet' });
  });
});
