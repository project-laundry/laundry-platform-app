import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/require-role', () => ({ assertRole: vi.fn() }));
vi.mock('@/lib/services/staff-accounts', () => ({
  createStaffAccount: vi.fn(),
  deleteStaffAccount: vi.fn(),
}));
vi.mock('@/lib/database/drivers', () => ({
  createDriverProfile: vi.fn(),
  updateDriverProfile: vi.fn(),
  getDriverWithUserById: vi.fn(),
}));
vi.mock('@/lib/database/users', () => ({ updateUserContact: vi.fn() }));
vi.mock('@/lib/maps/geocoding', () => ({ geocodeAddress: vi.fn() }));

import { assertRole } from '@/lib/auth/require-role';
import { createStaffAccount, deleteStaffAccount } from '@/lib/services/staff-accounts';
import {
  createDriverProfile,
  updateDriverProfile,
  getDriverWithUserById,
} from '@/lib/database/drivers';
import { updateUserContact } from '@/lib/database/users';
import { geocodeAddress } from '@/lib/maps/geocoding';
import { createDriverAction, updateDriverAction, type DriverFormInput } from './actions';

const m = (fn: unknown) => fn as Mock;

const BASE_INPUT: DriverFormInput = {
  full_name: 'Kari Kjører',
  email: 'kari@test.no',
  phone: '99887766',
  password: 'hemmelig123',
  city: 'Bergen',
  start_street: '',
  start_postal_code: '',
  start_label: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  m(assertRole).mockResolvedValue({ auth: { authUserId: 'admin-1' }, error: null });
  m(createStaffAccount).mockResolvedValue({ userId: 'user-1', error: null });
  m(createDriverProfile).mockResolvedValue({ id: 'driver-1' });
  m(getDriverWithUserById).mockResolvedValue({
    id: 'driver-1',
    user_id: 'user-1',
    city: 'Bergen',
    start_latitude: 60.39,
    start_longitude: 5.32,
    start_label: 'Hjemme',
    user: { id: 'user-1', full_name: 'Kari Kjører', phone: '99887766', email: 'kari@test.no' },
  });
  m(updateUserContact).mockResolvedValue({ data: {}, error: null });
  m(updateDriverProfile).mockResolvedValue({ id: 'driver-1' });
  m(geocodeAddress).mockResolvedValue({ latitude: 60.4, longitude: 5.3 });
});

describe('createDriverAction', () => {
  it('rejects when the caller is not an admin', async () => {
    m(assertRole).mockResolvedValue({ auth: null, error: 'Ingen tilgang' });

    const result = await createDriverAction(BASE_INPUT);

    expect(result).toEqual({ success: false, error: 'Ingen tilgang' });
    expect(createStaffAccount).not.toHaveBeenCalled();
  });

  it('rejects an invalid phone number', async () => {
    const result = await createDriverAction({ ...BASE_INPUT, phone: '123' });

    expect(result.success).toBe(false);
    expect(createStaffAccount).not.toHaveBeenCalled();
  });

  it('rejects a too-short password', async () => {
    const result = await createDriverAction({ ...BASE_INPUT, password: 'kort' });

    expect(result.success).toBe(false);
    expect(createStaffAccount).not.toHaveBeenCalled();
  });

  it('rejects a start street without a valid postal code', async () => {
    const result = await createDriverAction({
      ...BASE_INPUT,
      start_street: 'Testveien 1',
      start_postal_code: '12',
    });

    expect(result.success).toBe(false);
    expect(createStaffAccount).not.toHaveBeenCalled();
  });

  it('creates account + profile without a start point when no address is given', async () => {
    const result = await createDriverAction(BASE_INPUT);

    expect(result).toEqual({ success: true });
    expect(createStaffAccount).toHaveBeenCalledWith({
      full_name: 'Kari Kjører',
      email: 'kari@test.no',
      phone: '99887766',
      password: 'hemmelig123',
      role: 'driver',
    });
    expect(createDriverProfile).toHaveBeenCalledWith('user-1', {
      city: 'Bergen',
      start_latitude: null,
      start_longitude: null,
      start_label: null,
    });
    expect(geocodeAddress).not.toHaveBeenCalled();
  });

  it('geocodes the start point and defaults the label to the street', async () => {
    const result = await createDriverAction({
      ...BASE_INPUT,
      start_street: 'Testveien 1',
      start_postal_code: '5003',
      start_label: '',
    });

    expect(result).toEqual({ success: true });
    expect(geocodeAddress).toHaveBeenCalledWith({
      street: 'Testveien 1',
      postal_code: '5003',
      city: 'Bergen',
      country: 'Norway',
    });
    expect(createDriverProfile).toHaveBeenCalledWith('user-1', {
      city: 'Bergen',
      start_latitude: 60.4,
      start_longitude: 5.3,
      start_label: 'Testveien 1',
    });
  });

  it('degrades to no start point when geocoding fails', async () => {
    m(geocodeAddress).mockResolvedValue(null);

    const result = await createDriverAction({
      ...BASE_INPUT,
      start_street: 'Testveien 1',
      start_postal_code: '5003',
    });

    expect(result).toEqual({ success: true });
    expect(createDriverProfile).toHaveBeenCalledWith('user-1', {
      city: 'Bergen',
      start_latitude: null,
      start_longitude: null,
      start_label: null,
    });
  });

  it('rolls back the account when the driver profile insert fails', async () => {
    m(createDriverProfile).mockResolvedValue(null);

    const result = await createDriverAction(BASE_INPUT);

    expect(result.success).toBe(false);
    expect(deleteStaffAccount).toHaveBeenCalledWith('user-1');
  });

  it('propagates account-creation errors without touching the profile', async () => {
    m(createStaffAccount).mockResolvedValue({
      userId: null,
      error: 'E-postadressen er allerede registrert',
    });

    const result = await createDriverAction(BASE_INPUT);

    expect(result).toEqual({ success: false, error: 'E-postadressen er allerede registrert' });
    expect(createDriverProfile).not.toHaveBeenCalled();
  });
});

describe('updateDriverAction', () => {
  it('updates contact and city, keeping the stored start point when address fields are blank', async () => {
    const result = await updateDriverAction('driver-1', { ...BASE_INPUT, city: 'Oslo' });

    expect(result).toEqual({ success: true });
    expect(updateUserContact).toHaveBeenCalledWith('user-1', {
      full_name: 'Kari Kjører',
      phone: '99887766',
    });
    expect(updateDriverProfile).toHaveBeenCalledWith('driver-1', { city: 'Oslo' });
    expect(geocodeAddress).not.toHaveBeenCalled();
  });

  it('clears the start point when remove_start_point is set', async () => {
    const result = await updateDriverAction('driver-1', {
      ...BASE_INPUT,
      remove_start_point: true,
    });

    expect(result).toEqual({ success: true });
    expect(updateDriverProfile).toHaveBeenCalledWith('driver-1', {
      city: 'Bergen',
      start_latitude: null,
      start_longitude: null,
      start_label: null,
    });
  });

  it('re-geocodes when a new start address is typed', async () => {
    const result = await updateDriverAction('driver-1', {
      ...BASE_INPUT,
      city: 'Oslo',
      start_street: 'Nyveien 2',
      start_postal_code: '0562',
      start_label: 'Base',
    });

    expect(result).toEqual({ success: true });
    expect(updateDriverProfile).toHaveBeenCalledWith('driver-1', {
      city: 'Oslo',
      start_latitude: 60.4,
      start_longitude: 5.3,
      start_label: 'Base',
    });
  });

  it('fails when the driver does not exist', async () => {
    m(getDriverWithUserById).mockResolvedValue(null);

    const result = await updateDriverAction('driver-x', BASE_INPUT);

    expect(result).toEqual({ success: false, error: 'Sjåføren ble ikke funnet' });
    expect(updateUserContact).not.toHaveBeenCalled();
  });

  it('propagates a phone-conflict error from updateUserContact', async () => {
    m(updateUserContact).mockResolvedValue({
      data: null,
      error: 'Telefonnummeret er allerede i bruk',
    });

    const result = await updateDriverAction('driver-1', BASE_INPUT);

    expect(result).toEqual({ success: false, error: 'Telefonnummeret er allerede i bruk' });
    expect(updateDriverProfile).not.toHaveBeenCalled();
  });
});
