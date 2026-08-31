import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ assertRole: vi.fn() }));
vi.mock('@/lib/database/orders', () => ({
  getOrderById: vi.fn(),
  assignCleanerToOrder: vi.fn(),
  updateOrderAdminFields: vi.fn(),
}));
vi.mock('@/lib/database/cleaners', () => ({ getAvailableCleanersForCity: vi.fn() }));
vi.mock('@/lib/maps/geocoding', () => ({ geocodeAddress: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import { getOrderById, assignCleanerToOrder, updateOrderAdminFields } from '@/lib/database/orders';
import { getAvailableCleanersForCity } from '@/lib/database/cleaners';
import { geocodeAddress } from '@/lib/maps/geocoding';
import { assignCleanerAction, updateOrderDetailsAction, type UpdateOrderDetailsInput } from './actions';

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
