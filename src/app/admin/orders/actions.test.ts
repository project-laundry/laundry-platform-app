import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ assertRole: vi.fn() }));
vi.mock('@/lib/database/orders', () => ({
  getOrderById: vi.fn(),
  assignCleanerToOrder: vi.fn(),
  updateOrderAdminFields: vi.fn(),
  updateOrderStatusGuarded: vi.fn(),
  updateOrderPricingByAdmin: vi.fn(),
  updateOrderAdminNotes: vi.fn(),
}));
vi.mock('@/lib/services/complete-order', () => ({ completeDeliveredOrder: vi.fn() }));
vi.mock('@/lib/services/ready-order', () => ({ markOrderReadyAndCharge: vi.fn() }));
vi.mock('@/lib/services/order-generation', () => ({ checkAndGenerateNextOrders: vi.fn() }));
vi.mock('@/lib/database/cleaners', () => ({ getAvailableCleanersForCity: vi.fn() }));
vi.mock('@/lib/database/payments', () => ({ getPaymentsByOrderId: vi.fn() }));
vi.mock('@/lib/database/payment-agreements', () => ({ getPaymentAgreementById: vi.fn() }));
vi.mock('@/lib/database/subscriptions', () => ({ getSubscriptionById: vi.fn() }));
vi.mock('@/lib/payments/vipps/service', () => ({ createChargeForCompletedOrder: vi.fn() }));
vi.mock('@/lib/maps/geocoding', () => ({ geocodeAddress: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import {
  getOrderById,
  assignCleanerToOrder,
  updateOrderAdminFields,
  updateOrderStatusGuarded,
  updateOrderPricingByAdmin,
  updateOrderAdminNotes,
} from '@/lib/database/orders';
import { completeDeliveredOrder } from '@/lib/services/complete-order';
import { markOrderReadyAndCharge } from '@/lib/services/ready-order';
import { checkAndGenerateNextOrders } from '@/lib/services/order-generation';
import { getAvailableCleanersForCity } from '@/lib/database/cleaners';
import { getPaymentsByOrderId } from '@/lib/database/payments';
import { getPaymentAgreementById } from '@/lib/database/payment-agreements';
import { getSubscriptionById } from '@/lib/database/subscriptions';
import { createChargeForCompletedOrder } from '@/lib/payments/vipps/service';
import { geocodeAddress } from '@/lib/maps/geocoding';
import {
  assignCleanerAction,
  updateOrderDetailsAction,
  adminMarkPickedUpAction,
  adminMarkDeliveredAction,
  retryChargeAction,
  cancelOrderAdminAction,
  overrideOrderPriceAction,
  adminMarkReadyAction,
  updateAdminNotesAction,
  type UpdateOrderDetailsInput,
} from './actions';

const m = (fn: unknown) => fn as Mock;

const ORDER = {
  id: 'ord-1',
  status: 'pending_assignment',
  city: 'Bergen',
  cleaner_id: null,
};

function happyPathMocks() {
  m(assertRole).mockResolvedValue({ auth: { authUserId: 'admin-1' }, error: null });
  m(getOrderById).mockResolvedValue(ORDER);
  m(getAvailableCleanersForCity).mockResolvedValue([{ id: 'cl-1' }, { id: 'cl-2' }]);
  m(assignCleanerToOrder).mockResolvedValue({ id: 'ord-1' });
}

beforeEach(() => {
  vi.clearAllMocks();
  happyPathMocks();
});

describe('assignCleanerAction', () => {
  it('rejects when the caller is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await assignCleanerAction('ord-1', 'cl-1');

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(assignCleanerToOrder).not.toHaveBeenCalled();
  });

  it('errors when the order does not exist', async () => {
    m(getOrderById).mockResolvedValue(null);

    const result = await assignCleanerAction('ord-x', 'cl-1');

    expect(result).toEqual({ success: false, error: 'Ordren ble ikke funnet' });
  });

  it('rejects orders that are already picked up', async () => {
    m(getOrderById).mockResolvedValue({ ...ORDER, status: 'picked_up' });

    const result = await assignCleanerAction('ord-1', 'cl-1');

    expect(result.success).toBe(false);
    expect(assignCleanerToOrder).not.toHaveBeenCalled();
  });

  it('allows reassignment of a pickup_scheduled order', async () => {
    m(getOrderById).mockResolvedValue({ ...ORDER, status: 'pickup_scheduled', cleaner_id: 'cl-2' });

    const result = await assignCleanerAction('ord-1', 'cl-1');

    expect(result).toEqual({ success: true });
    expect(assignCleanerToOrder).toHaveBeenCalledWith('ord-1', 'cl-1');
  });

  it('rejects reassigning to the cleaner who already has the order', async () => {
    m(getOrderById).mockResolvedValue({ ...ORDER, status: 'pickup_scheduled', cleaner_id: 'cl-1' });

    const result = await assignCleanerAction('ord-1', 'cl-1');

    expect(result.success).toBe(false);
    expect(assignCleanerToOrder).not.toHaveBeenCalled();
  });

  it('rejects a cleaner who is not available in the order city', async () => {
    const result = await assignCleanerAction('ord-1', 'cl-other-city');

    expect(result).toEqual({
      success: false,
      error: 'Renseren er ikke tilgjengelig i denne byen',
    });
    expect(getAvailableCleanersForCity).toHaveBeenCalledWith('Bergen');
    expect(assignCleanerToOrder).not.toHaveBeenCalled();
  });

  it('assigns and revalidates on success', async () => {
    const result = await assignCleanerAction('ord-1', 'cl-1');

    expect(result).toEqual({ success: true });
    expect(assignCleanerToOrder).toHaveBeenCalledWith('ord-1', 'cl-1');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders/ord-1');
  });

  it('errors when the assignment write fails', async () => {
    m(assignCleanerToOrder).mockResolvedValue(null);

    const result = await assignCleanerAction('ord-1', 'cl-1');

    expect(result).toEqual({ success: false, error: 'Kunne ikke tildele renser' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

const EDITABLE_ORDER = {
  id: 'ord-1',
  status: 'pending_assignment',
  city: 'Bergen',
  country: 'Norway',
  cleaner_id: null,
  street: 'Strandgaten 1',
  postal_code: '5004',
  scheduled_date: '2026-09-10',
  delivery_date: '2026-09-12',
};

const VALID_INPUT: UpdateOrderDetailsInput = {
  scheduled_date: '2026-09-10',
  delivery_date: '2026-09-12',
  street: 'Strandgaten 1',
  postal_code: '5004',
};

/** The update payload for VALID_INPUT when the address did not change (no coords). */
const EXPECTED_BASE_UPDATE = {
  scheduled_date: '2026-09-10',
  delivery_date: '2026-09-12',
  street: 'Strandgaten 1',
  postal_code: '5004',
};

describe('updateOrderDetailsAction', () => {
  beforeEach(() => {
    m(getOrderById).mockResolvedValue(EDITABLE_ORDER);
    m(updateOrderAdminFields).mockResolvedValue({ id: 'ord-1' });
    m(geocodeAddress).mockResolvedValue(null);
  });

  it('rejects when the caller is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await updateOrderDetailsAction('ord-1', VALID_INPUT);

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(updateOrderAdminFields).not.toHaveBeenCalled();
  });

  it('errors when the order does not exist', async () => {
    m(getOrderById).mockResolvedValue(null);

    const result = await updateOrderDetailsAction('ord-x', VALID_INPUT);

    expect(result).toEqual({ success: false, error: 'Ordren ble ikke funnet' });
  });

  it('rejects completed and cancelled orders', async () => {
    m(getOrderById).mockResolvedValue({ ...EDITABLE_ORDER, status: 'completed' });

    const result = await updateOrderDetailsAction('ord-1', VALID_INPUT);

    expect(result.success).toBe(false);
    expect(updateOrderAdminFields).not.toHaveBeenCalled();
  });

  it('rejects a pickup-date change after the order is picked up', async () => {
    m(getOrderById).mockResolvedValue({ ...EDITABLE_ORDER, status: 'picked_up' });

    const result = await updateOrderDetailsAction('ord-1', {
      ...VALID_INPUT,
      scheduled_date: '2026-09-11',
    });

    expect(result.success).toBe(false);
    expect(updateOrderAdminFields).not.toHaveBeenCalled();
  });

  it('allows a delivery-date edit on an in-progress order', async () => {
    m(getOrderById).mockResolvedValue({ ...EDITABLE_ORDER, status: 'out_for_delivery' });

    const result = await updateOrderDetailsAction('ord-1', {
      ...VALID_INPUT,
      delivery_date: '2026-09-15',
    });

    expect(result).toEqual({ success: true });
    expect(updateOrderAdminFields).toHaveBeenCalledWith('ord-1', {
      ...EXPECTED_BASE_UPDATE,
      delivery_date: '2026-09-15',
    });
  });

  it('rejects a delivery date before the pickup date', async () => {
    const result = await updateOrderDetailsAction('ord-1', {
      ...VALID_INPUT,
      delivery_date: '2026-09-09',
    });

    expect(result).toEqual({
      success: false,
      error: 'Leveringsdato kan ikke være før hentedato',
    });
    expect(updateOrderAdminFields).not.toHaveBeenCalled();
  });

  it('rejects an invalid postal code', async () => {
    const result = await updateOrderDetailsAction('ord-1', {
      ...VALID_INPUT,
      postal_code: '50',
    });

    expect(result).toEqual({ success: false, error: 'Ugyldig postnummer (4 sifre)' });
    expect(updateOrderAdminFields).not.toHaveBeenCalled();
  });

  it('saves without geocoding when the address is unchanged', async () => {
    const result = await updateOrderDetailsAction('ord-1', VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(updateOrderAdminFields).toHaveBeenCalledWith('ord-1', EXPECTED_BASE_UPDATE);
  });

  it('re-geocodes and stores coordinates when the address changed', async () => {
    m(geocodeAddress).mockResolvedValue({ latitude: 60.39, longitude: 5.32 });

    const result = await updateOrderDetailsAction('ord-1', {
      ...VALID_INPUT,
      street: 'Nygårdsgaten 5',
    });

    expect(result).toEqual({ success: true });
    expect(geocodeAddress).toHaveBeenCalledWith({
      street: 'Nygårdsgaten 5',
      postal_code: '5004',
      city: 'Bergen',
      country: 'Norway',
    });
    expect(updateOrderAdminFields).toHaveBeenCalledWith('ord-1', {
      ...EXPECTED_BASE_UPDATE,
      street: 'Nygårdsgaten 5',
      latitude: 60.39,
      longitude: 5.32,
    });
  });

  it('saves with NULL coordinates when geocoding an address change fails', async () => {
    m(geocodeAddress).mockResolvedValue(null);

    const result = await updateOrderDetailsAction('ord-1', {
      ...VALID_INPUT,
      postal_code: '5008',
    });

    expect(result).toEqual({ success: true });
    expect(updateOrderAdminFields).toHaveBeenCalledWith('ord-1', {
      ...EXPECTED_BASE_UPDATE,
      postal_code: '5008',
      latitude: null,
      longitude: null,
    });
  });

  it('errors when the write fails', async () => {
    m(updateOrderAdminFields).mockResolvedValue(null);

    const result = await updateOrderDetailsAction('ord-1', VALID_INPUT);

    expect(result).toEqual({ success: false, error: 'Kunne ikke lagre endringene' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('revalidates the list and the detail page on success', async () => {
    const result = await updateOrderDetailsAction('ord-1', VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders/ord-1');
  });
});

describe('adminMarkPickedUpAction', () => {
  it('rejects non-admins', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await adminMarkPickedUpAction('ord-1');

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
  });

  it('moves pickup_scheduled to in_cleaning with picked_up_at', async () => {
    m(updateOrderStatusGuarded).mockResolvedValue({ id: 'ord-1' });

    const result = await adminMarkPickedUpAction('ord-1');

    expect(result).toEqual({ success: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith(
      'ord-1',
      'pickup_scheduled',
      'in_cleaning',
      { picked_up_at: expect.any(String) }
    );
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders/ord-1');
  });

  it('errors when the order is no longer waiting for pickup', async () => {
    m(updateOrderStatusGuarded).mockResolvedValue(null);

    const result = await adminMarkPickedUpAction('ord-1');

    expect(result.success).toBe(false);
  });
});

describe('adminMarkDeliveredAction', () => {
  it('rejects non-admins', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await adminMarkDeliveredAction('ord-1');

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(completeDeliveredOrder).not.toHaveBeenCalled();
  });

  it('completes from ready_for_delivery', async () => {
    m(completeDeliveredOrder).mockResolvedValue({ success: true });

    const result = await adminMarkDeliveredAction('ord-1');

    expect(result).toEqual({ success: true });
    expect(completeDeliveredOrder).toHaveBeenCalledWith('ord-1', 'ready_for_delivery');
  });

  it('passes through a completion failure', async () => {
    m(completeDeliveredOrder).mockResolvedValue({ success: false, error: 'feil' });

    const result = await adminMarkDeliveredAction('ord-1');

    expect(result).toEqual({ success: false, error: 'feil' });
  });
});

describe('retryChargeAction', () => {
  const CHARGED_ORDER = {
    id: 'ord-1',
    order_number: 'NC-1001',
    status: 'ready_for_delivery',
    total_cost_ore: 50000,
    payment_agreement_id: 'pa-1',
    subscription_id: null,
  };
  const FAILED_PAYMENT = {
    status: 'failed',
    provider_reference: null,
    created_at: '2026-10-16T10:00:00.000Z',
  };

  beforeEach(() => {
    m(getOrderById).mockResolvedValue(CHARGED_ORDER);
    m(getPaymentsByOrderId).mockResolvedValue([FAILED_PAYMENT]);
    m(getPaymentAgreementById).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(createChargeForCompletedOrder).mockResolvedValue('pay-2');
  });

  it('rejects non-admins', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await retryChargeAction('ord-1');

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });

  it('errors when the order does not exist', async () => {
    m(getOrderById).mockResolvedValue(null);

    const result = await retryChargeAction('ord-x');

    expect(result).toEqual({ success: false, error: 'Ordren ble ikke funnet' });
  });

  it('rejects an order that has not been marked ready yet', async () => {
    m(getOrderById).mockResolvedValue({ ...CHARGED_ORDER, status: 'in_cleaning' });

    const result = await retryChargeAction('ord-1');

    expect(result.success).toBe(false);
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });

  it('rejects an order without a positive price', async () => {
    m(getOrderById).mockResolvedValue({ ...CHARGED_ORDER, total_cost_ore: 0 });

    const result = await retryChargeAction('ord-1');

    expect(result).toEqual({ success: false, error: 'Ordren har ingen pris å belaste' });
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });

  it('rejects when a captured payment already exists', async () => {
    m(getPaymentsByOrderId).mockResolvedValue([
      FAILED_PAYMENT,
      { status: 'captured', provider_reference: 'chr-1', created_at: '2026-10-16T10:05:00.000Z' },
    ]);

    const result = await retryChargeAction('ord-1');

    expect(result.success).toBe(false);
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });

  it('rejects while a charge is still pending at Vipps (has a provider_reference)', async () => {
    m(getPaymentsByOrderId).mockResolvedValue([
      { status: 'pending', provider_reference: 'chr-1', created_at: '2000-01-01T00:00:00.000Z' },
    ]);

    const result = await retryChargeAction('ord-1');

    expect(result.success).toBe(false);
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });

  it('allows a retry when the only pending row is an old orphan', async () => {
    m(getPaymentsByOrderId).mockResolvedValue([
      { status: 'pending', provider_reference: null, created_at: '2000-01-01T00:00:00.000Z' },
    ]);

    const result = await retryChargeAction('ord-1');

    expect(result).toEqual({ success: true });
    expect(createChargeForCompletedOrder).toHaveBeenCalledWith('ord-1', 50000, 'NooraCare vask #NC-1001');
  });

  it('rejects when the Vipps agreement is no longer active', async () => {
    m(getPaymentAgreementById).mockResolvedValue({ id: 'pa-1', status: 'stopped' });

    const result = await retryChargeAction('ord-1');

    expect(result).toEqual({
      success: false,
      error: 'Vipps-avtalen er ikke aktiv lenger — kunden kan ikke belastes via Vipps',
    });
    expect(createChargeForCompletedOrder).not.toHaveBeenCalled();
  });

  it("resolves a rolling-window order's agreement through its subscription", async () => {
    m(getOrderById).mockResolvedValue({
      ...CHARGED_ORDER,
      status: 'completed',
      payment_agreement_id: null,
      subscription_id: 'sub-1',
    });
    m(getSubscriptionById).mockResolvedValue({ id: 'sub-1', payment_agreement_id: 'pa-9' });
    m(getPaymentAgreementById).mockResolvedValue({ id: 'pa-9', status: 'active' });

    const result = await retryChargeAction('ord-1');

    expect(result).toEqual({ success: true });
    expect(getSubscriptionById).toHaveBeenCalledWith('sub-1');
    expect(getPaymentAgreementById).toHaveBeenCalledWith('pa-9');
    expect(createChargeForCompletedOrder).toHaveBeenCalledWith('ord-1', 50000, 'NooraCare vask #NC-1001');
  });

  it('creates the charge with no payment rows at all and revalidates', async () => {
    m(getPaymentsByOrderId).mockResolvedValue([]);

    const result = await retryChargeAction('ord-1');

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders/ord-1');
  });

  it('returns the Vipps error when charge creation fails', async () => {
    m(createChargeForCompletedOrder).mockRejectedValue(
      new Error('Vipps create charge failed (500): boom')
    );

    const result = await retryChargeAction('ord-1');

    expect(result).toEqual({
      success: false,
      error: 'Belastningen feilet: Vipps create charge failed (500): boom',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders/ord-1');
  });
});

describe('cancelOrderAdminAction', () => {
  const CANCELLABLE_ORDER = {
    id: 'ord-1',
    status: 'pickup_scheduled',
    subscription_id: 'sub-1',
    scheduled_date: '2000-01-01', // in the past: proves the 24 h rule does not apply to admins
  };

  beforeEach(() => {
    m(getOrderById).mockResolvedValue(CANCELLABLE_ORDER);
    m(updateOrderStatusGuarded).mockResolvedValue({ id: 'ord-1', status: 'cancelled' });
    m(getSubscriptionById).mockResolvedValue({ id: 'sub-1', status: 'active' });
    m(checkAndGenerateNextOrders).mockResolvedValue(undefined);
  });

  it('rejects non-admins', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await cancelOrderAdminAction('ord-1', 'Duplikat');

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
  });

  it('requires a reason', async () => {
    const result = await cancelOrderAdminAction('ord-1', '   ');

    expect(result).toEqual({ success: false, error: 'Oppgi en årsak til kanselleringen' });
    expect(getOrderById).not.toHaveBeenCalled();
  });

  it('rejects a reason over 500 characters', async () => {
    const result = await cancelOrderAdminAction('ord-1', 'x'.repeat(501));

    expect(result.success).toBe(false);
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
  });

  it('errors when the order does not exist', async () => {
    m(getOrderById).mockResolvedValue(null);

    const result = await cancelOrderAdminAction('ord-x', 'Duplikat');

    expect(result).toEqual({ success: false, error: 'Ordren ble ikke funnet' });
  });

  it('rejects an order that is already picked up', async () => {
    m(getOrderById).mockResolvedValue({ ...CANCELLABLE_ORDER, status: 'in_cleaning' });

    const result = await cancelOrderAdminAction('ord-1', 'Duplikat');

    expect(result).toEqual({
      success: false,
      error: 'Ordren kan ikke kanselleres etter at den er hentet',
    });
    expect(updateOrderStatusGuarded).not.toHaveBeenCalled();
  });

  it('cancels with the trimmed reason, guarded on the current status, and regenerates the rolling window', async () => {
    const result = await cancelOrderAdminAction('ord-1', '  Kunden møtte ikke opp  ');

    expect(result).toEqual({ success: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith('ord-1', 'pickup_scheduled', 'cancelled', {
      cancellation_reason: 'Kunden møtte ikke opp',
    });
    expect(getSubscriptionById).toHaveBeenCalledWith('sub-1');
    expect(checkAndGenerateNextOrders).toHaveBeenCalledWith('sub-1');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders/ord-1');
  });

  it('also cancels a pending_assignment order', async () => {
    m(getOrderById).mockResolvedValue({ ...CANCELLABLE_ORDER, status: 'pending_assignment' });

    const result = await cancelOrderAdminAction('ord-1', 'Svindel');

    expect(result).toEqual({ success: true });
    expect(updateOrderStatusGuarded).toHaveBeenCalledWith('ord-1', 'pending_assignment', 'cancelled', {
      cancellation_reason: 'Svindel',
    });
  });

  it('does not regenerate for a cancelled subscription', async () => {
    m(getSubscriptionById).mockResolvedValue({ id: 'sub-1', status: 'cancelled' });

    const result = await cancelOrderAdminAction('ord-1', 'Duplikat');

    expect(result).toEqual({ success: true });
    expect(checkAndGenerateNextOrders).not.toHaveBeenCalled();
  });

  it('does not look up a subscription for a one-time order', async () => {
    m(getOrderById).mockResolvedValue({ ...CANCELLABLE_ORDER, subscription_id: null });

    const result = await cancelOrderAdminAction('ord-1', 'Duplikat');

    expect(result).toEqual({ success: true });
    expect(getSubscriptionById).not.toHaveBeenCalled();
    expect(checkAndGenerateNextOrders).not.toHaveBeenCalled();
  });

  it('still succeeds when next-order generation throws', async () => {
    m(checkAndGenerateNextOrders).mockRejectedValue(new Error('boom'));

    const result = await cancelOrderAdminAction('ord-1', 'Duplikat');

    expect(result).toEqual({ success: true });
  });

  it('errors when the guarded write does not apply (status changed meanwhile)', async () => {
    m(updateOrderStatusGuarded).mockResolvedValue(null);

    const result = await cancelOrderAdminAction('ord-1', 'Duplikat');

    expect(result).toEqual({
      success: false,
      error: 'Ordren endret status i mellomtiden — last siden på nytt',
    });
    expect(checkAndGenerateNextOrders).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('overrideOrderPriceAction', () => {
  const IN_CLEANING_ORDER = {
    id: 'ord-1',
    status: 'in_cleaning',
    wash_loads: 2,
    total_cost_ore: 57030,
    ironing_details: null,
    promo: null,
  };
  const FAILED_PAYMENT = {
    status: 'failed',
    provider_reference: null,
    created_at: '2026-10-16T10:00:00.000Z',
  };

  beforeEach(() => {
    m(getOrderById).mockResolvedValue(IN_CLEANING_ORDER);
    m(getPaymentsByOrderId).mockResolvedValue([]);
    m(updateOrderPricingByAdmin).mockResolvedValue({ id: 'ord-1' });
  });

  it('rejects non-admins', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await overrideOrderPriceAction('ord-1', { wash_loads: 3, pricing_notes: '' });

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(updateOrderPricingByAdmin).not.toHaveBeenCalled();
  });

  it('rejects a wash count below 1 or not an integer', async () => {
    expect((await overrideOrderPriceAction('ord-1', { wash_loads: 0, pricing_notes: '' })).success).toBe(false);
    expect((await overrideOrderPriceAction('ord-1', { wash_loads: 1.5, pricing_notes: '' })).success).toBe(false);
    expect(getOrderById).not.toHaveBeenCalled();
  });

  it('errors when the order does not exist', async () => {
    m(getOrderById).mockResolvedValue(null);

    const result = await overrideOrderPriceAction('ord-x', { wash_loads: 3, pricing_notes: '' });

    expect(result).toEqual({ success: false, error: 'Ordren ble ikke funnet' });
  });

  it('rejects an order that is not in_cleaning or ready_for_delivery', async () => {
    m(getOrderById).mockResolvedValue({ ...IN_CLEANING_ORDER, status: 'pickup_scheduled' });

    const result = await overrideOrderPriceAction('ord-1', { wash_loads: 3, pricing_notes: '' });

    expect(result.success).toBe(false);
    expect(getPaymentsByOrderId).not.toHaveBeenCalled();
    expect(updateOrderPricingByAdmin).not.toHaveBeenCalled();
  });

  it('rejects when the customer already has a live payment', async () => {
    m(getOrderById).mockResolvedValue({ ...IN_CLEANING_ORDER, status: 'ready_for_delivery' });
    m(getPaymentsByOrderId).mockResolvedValue([
      { status: 'captured', provider_reference: 'chr-1', created_at: '2026-10-16T10:05:00.000Z' },
    ]);

    const result = await overrideOrderPriceAction('ord-1', { wash_loads: 3, pricing_notes: '' });

    expect(result).toEqual({
      success: false,
      error: 'Kunden er allerede belastet for denne ordren — prisen kan ikke endres',
    });
    expect(updateOrderPricingByAdmin).not.toHaveBeenCalled();
  });

  it('prices with the cleaner formula and stamps the payout from the full price', async () => {
    const result = await overrideOrderPriceAction('ord-1', {
      wash_loads: 3,
      pricing_notes: '  Renseren telte feil  ',
    });

    expect(result).toEqual({ success: true });
    // 3 × 22900 + 10400 + 1830 = 80930; 70 % = 56651
    expect(updateOrderPricingByAdmin).toHaveBeenCalledWith('ord-1', {
      wash_loads: 3,
      ironing_details: null,
      total_cost_ore: 80930,
      cleaner_payout_ore: 56651,
      pricing_notes: 'Renseren telte feil',
      promo: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders/ord-1');
  });

  it('applies the order minimum for a single wash and sends no notes when empty', async () => {
    const result = await overrideOrderPriceAction('ord-1', { wash_loads: 1, pricing_notes: '' });

    expect(result).toEqual({ success: true });
    // 22900 + 10400 + 1830 = 35130 < 50000 minimum → 50000; 70 % = 35000
    expect(updateOrderPricingByAdmin).toHaveBeenCalledWith(
      'ord-1',
      expect.objectContaining({ total_cost_ore: 50000, cleaner_payout_ore: 35000, pricing_notes: undefined })
    );
  });

  it('applies the locked promo snapshot to the charge but not the payout', async () => {
    m(getOrderById).mockResolvedValue({
      ...IN_CLEANING_ORDER,
      promo: {
        promo_code_id: 'pc-1',
        code: 'HALV',
        discount_type: 'percentage',
        discount_value: 50,
        max_discount_ore: null,
      },
    });

    const result = await overrideOrderPriceAction('ord-1', { wash_loads: 3, pricing_notes: '' });

    expect(result).toEqual({ success: true });
    expect(updateOrderPricingByAdmin).toHaveBeenCalledWith(
      'ord-1',
      expect.objectContaining({
        total_cost_ore: 40465,
        cleaner_payout_ore: 56651,
        promo: expect.objectContaining({ code: 'HALV', discount_ore: 40465 }),
      })
    );
  });

  it('allows a re-price in ready_for_delivery when the only payment failed', async () => {
    m(getOrderById).mockResolvedValue({ ...IN_CLEANING_ORDER, status: 'ready_for_delivery' });
    m(getPaymentsByOrderId).mockResolvedValue([FAILED_PAYMENT]);

    const result = await overrideOrderPriceAction('ord-1', { wash_loads: 2, pricing_notes: '' });

    expect(result).toEqual({ success: true });
    expect(updateOrderPricingByAdmin).toHaveBeenCalled();
  });

  it('errors when the write fails', async () => {
    m(updateOrderPricingByAdmin).mockResolvedValue(null);

    const result = await overrideOrderPriceAction('ord-1', { wash_loads: 3, pricing_notes: '' });

    expect(result).toEqual({ success: false, error: 'Kunne ikke lagre prisen' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('adminMarkReadyAction', () => {
  const PRICED_ORDER = {
    id: 'ord-1',
    order_number: 'NC-1001',
    status: 'in_cleaning',
    wash_loads: 2,
    total_cost_ore: 50000,
  };

  beforeEach(() => {
    m(getOrderById).mockResolvedValue(PRICED_ORDER);
    m(markOrderReadyAndCharge).mockResolvedValue({ success: true });
  });

  it('rejects non-admins', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await adminMarkReadyAction('ord-1');

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(markOrderReadyAndCharge).not.toHaveBeenCalled();
  });

  it('errors when the order does not exist', async () => {
    m(getOrderById).mockResolvedValue(null);

    const result = await adminMarkReadyAction('ord-x');

    expect(result).toEqual({ success: false, error: 'Ordren ble ikke funnet' });
    expect(markOrderReadyAndCharge).not.toHaveBeenCalled();
  });

  it('hands the loaded order to the shared service and revalidates', async () => {
    const result = await adminMarkReadyAction('ord-1');

    expect(result).toEqual({ success: true });
    expect(markOrderReadyAndCharge).toHaveBeenCalledWith(PRICED_ORDER);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders/ord-1');
  });

  it('passes chargeFailed through and still revalidates', async () => {
    m(markOrderReadyAndCharge).mockResolvedValue({ success: true, chargeFailed: true });

    const result = await adminMarkReadyAction('ord-1');

    expect(result).toEqual({ success: true, chargeFailed: true });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders/ord-1');
  });

  it('passes a service refusal through without revalidating', async () => {
    m(markOrderReadyAndCharge).mockResolvedValue({
      success: false,
      error: 'Pris må beregnes før ordren kan gjøres klar',
    });

    const result = await adminMarkReadyAction('ord-1');

    expect(result).toEqual({ success: false, error: 'Pris må beregnes før ordren kan gjøres klar' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('updateAdminNotesAction', () => {
  beforeEach(() => {
    m(updateOrderAdminNotes).mockResolvedValue({ id: 'ord-1' });
  });

  it('rejects non-admins', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await updateAdminNotesAction('ord-1', 'hei');

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(updateOrderAdminNotes).not.toHaveBeenCalled();
  });

  it('saves the trimmed notes and revalidates the detail page', async () => {
    const result = await updateAdminNotesAction('ord-1', '  Ringte kunden, ny nøkkelboks  ');

    expect(result).toEqual({ success: true });
    expect(updateOrderAdminNotes).toHaveBeenCalledWith('ord-1', 'Ringte kunden, ny nøkkelboks');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/orders/ord-1');
  });

  it('clears the notes with an empty string', async () => {
    const result = await updateAdminNotesAction('ord-1', '   ');

    expect(result).toEqual({ success: true });
    expect(updateOrderAdminNotes).toHaveBeenCalledWith('ord-1', null);
  });

  it('rejects notes over 2000 characters', async () => {
    const result = await updateAdminNotesAction('ord-1', 'x'.repeat(2001));

    expect(result).toEqual({ success: false, error: 'Notatet kan ha maks 2000 tegn' });
    expect(updateOrderAdminNotes).not.toHaveBeenCalled();
  });

  it('errors when the write fails (unknown order)', async () => {
    m(updateOrderAdminNotes).mockResolvedValue(null);

    const result = await updateAdminNotesAction('ord-x', 'hei');

    expect(result).toEqual({ success: false, error: 'Kunne ikke lagre notatet' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
