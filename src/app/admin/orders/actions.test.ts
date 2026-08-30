import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ assertRole: vi.fn() }));
vi.mock('@/lib/database/orders', () => ({
  getOrderById: vi.fn(),
  assignCleanerToOrder: vi.fn(),
}));
vi.mock('@/lib/database/cleaners', () => ({ getAvailableCleanersForCity: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import { getOrderById, assignCleanerToOrder } from '@/lib/database/orders';
import { getAvailableCleanersForCity } from '@/lib/database/cleaners';
import { assignCleanerAction } from './actions';

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
  });

  it('errors when the assignment write fails', async () => {
    m(assignCleanerToOrder).mockResolvedValue(null);

    const result = await assignCleanerAction('ord-1', 'cl-1');

    expect(result).toEqual({ success: false, error: 'Kunne ikke tildele renser' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
