import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/orders', () => ({ updateOrderStatusGuarded: vi.fn() }));
vi.mock('@/lib/payments/vipps/service', () => ({ createChargeForCompletedOrder: vi.fn() }));
vi.mock('@/lib/services/customer-emails', () => ({ sendPriceReceiptEmail: vi.fn() }));
vi.mock('@/lib/email/admin-mail', () => ({ sendToAdmins: vi.fn() }));
vi.mock('@/lib/services/error-alerts', () => ({ reportError: vi.fn() }));

import { updateOrderStatusGuarded } from '@/lib/database/orders';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';
import { sendPriceReceiptEmail } from '@/lib/services/customer-emails';
import { sendToAdmins } from '@/lib/email/admin-mail';
import { reportError } from '@/lib/services/error-alerts';
import { formatKrExact } from '@/lib/config/pricing';
import {
  buildPriceReviewEmail,
  markOrderReadyAndCharge,
  type ReadyOrderInput,
} from './ready-order';

const m = (fn: unknown) => fn as Mock;

const PRICED_ORDER: ReadyOrderInput = {
  id: 'ord-1',
  order_number: 'NC-1001',
  status: 'in_cleaning',
  wash_loads: 2,
  total_cost_ore: 50000,
  promo: null,
  customer_estimate: null,
  pricing_notes: null,
};

const ONE_BAG_ESTIMATE = {
  bags: 1,
  bedding_sets: 0,
  iron_everyday_items: 0,
  iron_formal_items: 0,
  iron_bedding: false,
  estimated_total_ore: 50000,
};

// 15 washes (460730 øre) against a one-bag estimate of 50000 øre.
const FAR_ABOVE_ORDER: ReadyOrderInput = {
  ...PRICED_ORDER,
  wash_loads: 15,
  total_cost_ore: 460730,
  customer_estimate: ONE_BAG_ESTIMATE,
  pricing_notes: '  Mye sengetøy  ',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://nooracare.no');
  m(updateOrderStatusGuarded).mockResolvedValue({ id: 'ord-1' });
  m(createChargeForCompletedOrder).mockResolvedValue('pay-1');
  m(sendToAdmins).mockResolvedValue({ recipients: 2, sent: 2 });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('markOrderReadyAndCharge', () => {
  it('moves the order to ready_for_delivery and charges the locked price', async () => {
    const result = await markOrderReadyAndCharge(PRICED_ORDER);

    expect(result).toEqual({ success: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith('ord-1', 'in_cleaning', 'ready_for_delivery');
    expect(createChargeForCompletedOrder).toHaveBeenCalledWith('ord-1', 50000, 'NooraCare vask #NC-1001');
    expect(sendPriceReceiptEmail).toHaveBeenCalledWith('ord-1', 'pay-1');
  });

  it('reports chargeFailed when the Vipps charge throws, keeping the transition', async () => {
    m(createChargeForCompletedOrder).mockRejectedValue(new Error('Vipps create charge failed (500): boom'));

    const result = await markOrderReadyAndCharge(PRICED_ORDER);

    expect(result).toEqual({ success: true, chargeFailed: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledTimes(1);
    expect(sendPriceReceiptEmail).not.toHaveBeenCalled();
  });

  it('skips the charge for a 0-total order', async () => {
    const result = await markOrderReadyAndCharge({ ...PRICED_ORDER, total_cost_ore: 0 });

    expect(result).toEqual({ success: true });
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
    expect(sendPriceReceiptEmail).toHaveBeenCalledWith('ord-1', null);
  });

  it('rejects an order that is not in_cleaning without writing or charging', async () => {
    const result = await markOrderReadyAndCharge({ ...PRICED_ORDER, status: 'ready_for_delivery' });

    expect(result.success).toBe(false);
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });

  it('rejects an order without wash details', async () => {
    const result = await markOrderReadyAndCharge({ ...PRICED_ORDER, wash_loads: 0 });

    expect(result).toEqual({
      success: false,
      error: 'Vaskdetaljer må registreres før ordren kan gjøres klar',
    });
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
  });

  it('rejects an unpriced order', async () => {
    const result = await markOrderReadyAndCharge({ ...PRICED_ORDER, total_cost_ore: null });

    expect(result).toEqual({ success: false, error: 'Pris må beregnes før ordren kan gjøres klar' });
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
  });

  it('fails when the guarded transition does not apply (concurrent change)', async () => {
    m(updateOrderStatusGuarded).mockResolvedValue(null);

    const result = await markOrderReadyAndCharge(PRICED_ORDER);

    expect(result).toEqual({ success: false, error: 'Kunne ikke oppdatere status' });
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
    expect(sendPriceReceiptEmail).not.toHaveBeenCalled();
  });
});


describe('markOrderReadyAndCharge — price guard', () => {
  it('holds the charge when the price is more than twice the estimate', async () => {
    const result = await markOrderReadyAndCharge(FAR_ABOVE_ORDER);

    expect(result).toEqual({ success: true, chargeHeld: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith('ord-1', 'in_cleaning', 'ready_for_delivery');
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
    expect(sendPriceReceiptEmail).not.toHaveBeenCalled();
  });

  it('e-mails the admins once per order with the figures and both ways out', async () => {
    await markOrderReadyAndCharge(FAR_ABOVE_ORDER);

    expect(sendToAdmins).toHaveBeenCalledTimes(1);
    const message = m(sendToAdmins).mock.calls[0][0];
    expect(message.idempotencyKey).toBe('price-review/ord-1');
    expect(message.subject).toContain('#NC-1001');
    expect(message.text).toContain(`Kundens estimat: ${formatKrExact(50000)}`);
    expect(message.text).toContain('Kunden oppga: 1 pose, 0 sett sengetøy');
    expect(message.text).toContain(`Renserens pris: ${formatKrExact(460730)} (15 vask)`);
    expect(message.text).toContain('Renserens notat om prisen: Mye sengetøy');
    expect(message.text).toContain('https://nooracare.no/admin/orders/ord-1');
    expect(message.text).toContain('«Belast på nytt»');
    expect(message.text).toContain('endre antall vask under Pris');
    expect(reportError).not.toHaveBeenCalled();
  });

  it('charges as normal at exactly twice the estimate', async () => {
    const result = await markOrderReadyAndCharge({ ...FAR_ABOVE_ORDER, total_cost_ore: 100000 });

    expect(result).toEqual({ success: true });
    expect(createChargeForCompletedOrder).toHaveBeenCalledWith('ord-1', 100000, 'NooraCare vask #NC-1001');
    expect(sendPriceReceiptEmail).toHaveBeenCalledWith('ord-1', 'pay-1');
    expect(sendToAdmins).not.toHaveBeenCalled();
  });

  it('never holds an order without an estimate', async () => {
    const result = await markOrderReadyAndCharge({ ...FAR_ABOVE_ORDER, customer_estimate: null });

    expect(result).toEqual({ success: true });
    expect(createChargeForCompletedOrder).toHaveBeenCalledWith('ord-1', 460730, 'NooraCare vask #NC-1001');
    expect(sendToAdmins).not.toHaveBeenCalled();
  });

  it('measures the full price before the promo discount', async () => {
    // Charged 60000 after a 60000 discount → full price 120000 > 2 × 50000.
    const result = await markOrderReadyAndCharge({
      ...FAR_ABOVE_ORDER,
      total_cost_ore: 60000,
      promo: {
        promo_code_id: 'pc-1',
        code: 'HALV',
        discount_type: 'percentage',
        discount_value: 50,
        max_discount_ore: null,
        discount_ore: 60000,
      },
    });

    expect(result).toEqual({ success: true, chargeHeld: true });
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
    const message = m(sendToAdmins).mock.calls[0][0];
    expect(message.text).toContain(`Renserens pris: ${formatKrExact(120000)} (15 vask)`);
    expect(message.text).toContain(`Rabatt (HALV): −${formatKrExact(60000)}`);
    expect(message.text).toContain(`Kunden skal betale: ${formatKrExact(60000)}`);
  });

  it('does not hold a 0-total order (nothing would be charged)', async () => {
    const result = await markOrderReadyAndCharge({
      ...FAR_ABOVE_ORDER,
      total_cost_ore: 0,
      promo: {
        promo_code_id: 'pc-1',
        code: 'GRATIS',
        discount_type: 'percentage',
        discount_value: 100,
        max_discount_ore: null,
        discount_ore: 460730,
      },
    });

    expect(result).toEqual({ success: true });
    expect(sendToAdmins).not.toHaveBeenCalled();
    expect(sendPriceReceiptEmail).toHaveBeenCalledWith('ord-1', null);
  });

  it('does not alert when the guarded transition does not apply', async () => {
    m(updateOrderStatusGuarded).mockResolvedValue(null);

    const result = await markOrderReadyAndCharge(FAR_ABOVE_ORDER);

    expect(result).toEqual({ success: false, error: 'Kunne ikke oppdatere status' });
    expect(sendToAdmins).not.toHaveBeenCalled();
  });

  it('still holds and succeeds when the admin e-mail throws, and reports it', async () => {
    m(sendToAdmins).mockRejectedValue(new Error('resend down'));

    const result = await markOrderReadyAndCharge(FAR_ABOVE_ORDER);

    expect(result).toEqual({ success: true, chargeHeld: true });
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith(
      'Varsel om tilbakeholdt belastning feilet',
      expect.any(Error),
      { ordre: 'NC-1001' }
    );
  });

  it('reports it when the e-mail reached no admin', async () => {
    m(sendToAdmins).mockResolvedValue({ recipients: 0, sent: 0 });

    const result = await markOrderReadyAndCharge(FAR_ABOVE_ORDER);

    expect(result).toEqual({ success: true, chargeHeld: true });
    expect(reportError).toHaveBeenCalledWith(
      'Varsel om tilbakeholdt belastning nådde ingen admin',
      expect.any(Error),
      { ordre: 'NC-1001' }
    );
  });
});

describe('buildPriceReviewEmail', () => {
  it('tolerates a trailing slash on the app URL and a missing note', () => {
    const email = buildPriceReviewEmail(
      { ...FAR_ABOVE_ORDER, pricing_notes: null },
      'https://nooracare.no/'
    );

    expect(email.text).toContain('\nhttps://nooracare.no/admin/orders/ord-1\n');
    expect(email.text).toContain('Renserens notat om prisen: ingen');
    expect(email.subject).toBe(
      `Pris må godkjennes – ordre #NC-1001: ${formatKrExact(460730)} mot estimat ${formatKrExact(50000)}`
    );
  });
});
