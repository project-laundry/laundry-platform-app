import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ assertRole: vi.fn() }));
vi.mock('@/lib/database/cleaners', () => ({
  rejectCleaner: vi.fn(),
  setCleanerVerificationStatus: vi.fn(),
  updateCleanerProfile: vi.fn(),
}));

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/require-role';
import {
  rejectCleaner,
  setCleanerVerificationStatus,
  updateCleanerProfile,
} from '@/lib/database/cleaners';
import {
  rejectCleanerAction,
  setCleanerAcceptingOrdersAction,
  setCleanerActivationAction,
} from './actions';

const m = (fn: unknown) => fn as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  m(assertRole).mockResolvedValue({ auth: { authUserId: 'admin-1' }, error: null });
  m(setCleanerVerificationStatus).mockResolvedValue({ id: 'cl-1' });
  m(updateCleanerProfile).mockResolvedValue({ id: 'cl-1' });
  m(rejectCleaner).mockResolvedValue({ id: 'cl-1' });
});

describe('setCleanerActivationAction', () => {
  it('rejects when the caller is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await setCleanerActivationAction('cl-1', true);

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(setCleanerVerificationStatus).not.toHaveBeenCalled();
  });

  it('approves on activate', async () => {
    const result = await setCleanerActivationAction('cl-1', true);

    expect(result).toEqual({ success: true });
    expect(setCleanerVerificationStatus).toHaveBeenCalledWith('cl-1', 'approved');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/cleaners');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/cleaners/cl-1');
  });

  it('suspends on deactivate', async () => {
    const result = await setCleanerActivationAction('cl-1', false);

    expect(result).toEqual({ success: true });
    expect(setCleanerVerificationStatus).toHaveBeenCalledWith('cl-1', 'suspended');
  });

  it('errors when the update fails', async () => {
    m(setCleanerVerificationStatus).mockResolvedValue(null);

    const result = await setCleanerActivationAction('cl-1', true);

    expect(result).toEqual({ success: false, error: 'Kunne ikke oppdatere renseren' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('setCleanerAcceptingOrdersAction', () => {
  it('rejects when the caller is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await setCleanerAcceptingOrdersAction('cl-1', false);

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(updateCleanerProfile).not.toHaveBeenCalled();
  });

  it('pauses by writing only is_accepting_orders = false', async () => {
    const result = await setCleanerAcceptingOrdersAction('cl-1', false);

    expect(result).toEqual({ success: true });
    expect(updateCleanerProfile).toHaveBeenCalledWith('cl-1', { is_accepting_orders: false });
    expect(setCleanerVerificationStatus).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/cleaners');
  });

  it('resumes by writing is_accepting_orders = true', async () => {
    const result = await setCleanerAcceptingOrdersAction('cl-1', true);

    expect(result).toEqual({ success: true });
    expect(updateCleanerProfile).toHaveBeenCalledWith('cl-1', { is_accepting_orders: true });
  });

  it('errors when the update fails', async () => {
    m(updateCleanerProfile).mockResolvedValue(null);

    const result = await setCleanerAcceptingOrdersAction('cl-1', false);

    expect(result).toEqual({ success: false, error: 'Kunne ikke oppdatere renseren' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('rejectCleanerAction', () => {
  it('rejects when the caller is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await rejectCleanerAction('cl-1', 'Dekker ikke området');

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(rejectCleaner).not.toHaveBeenCalled();
  });

  it('requires a non-blank reason', async () => {
    const result = await rejectCleanerAction('cl-1', '   ');

    expect(result).toEqual({
      success: false,
      error: 'Skriv en begrunnelse — renseren får se den',
    });
    expect(rejectCleaner).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('caps the reason at 500 characters', async () => {
    const result = await rejectCleanerAction('cl-1', 'x'.repeat(501));

    expect(result).toEqual({
      success: false,
      error: 'Begrunnelsen kan være maks 500 tegn',
    });
    expect(rejectCleaner).not.toHaveBeenCalled();
  });

  it('stores the trimmed reason and revalidates list and detail page', async () => {
    const result = await rejectCleanerAction('cl-1', '  Dekker ikke området ennå  ');

    expect(result).toEqual({ success: true });
    expect(rejectCleaner).toHaveBeenCalledWith('cl-1', 'Dekker ikke området ennå');
    expect(setCleanerVerificationStatus).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/cleaners');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/cleaners/cl-1');
  });

  it('errors when the update fails', async () => {
    m(rejectCleaner).mockResolvedValue(null);

    const result = await rejectCleanerAction('cl-1', 'Dekker ikke området');

    expect(result).toEqual({ success: false, error: 'Kunne ikke avvise renseren' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
