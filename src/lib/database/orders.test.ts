import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import {
  assignCleanerToPendingOrder,
  declineOrder,
  getOrderByPaymentAgreementId,
  updateOrderLaundryDetails,
} from './orders';

const m = (fn: unknown) => fn as Mock;

describe('getOrderByPaymentAgreementId', () => {
  // from('orders').select('*').eq('payment_agreement_id', id).order('created_at', {...}).limit(1).maybeSingle()
  const maybeSingle = vi.fn();
  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));

  beforeEach(() => {
    vi.clearAllMocks();
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ select })) });
  });

  it('returns the earliest order carrying the payment agreement id', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'ord-1', order_number: 'ABC123' }, error: null });

    const result = await getOrderByPaymentAgreementId('pa-1');

    expect(result).toEqual({ id: 'ord-1', order_number: 'ABC123' });
    expect(eq).toHaveBeenCalledWith('payment_agreement_id', 'pa-1');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(limit).toHaveBeenCalledWith(1);
  });

  it('returns null when the agreement has no order yet', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(getOrderByPaymentAgreementId('pa-1')).resolves.toBeNull();
  });

  it('throws on a query error so callers never act blind', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(getOrderByPaymentAgreementId('pa-1')).rejects.toThrow('Failed to look up orders for payment agreement pa-1');
  });
});

describe('declineOrder', () => {
  // read:  from('orders').select(...).eq('id', id).single()
  // write: from('orders').update({...}).eq('id').eq('cleaner_id').eq('status').select().maybeSingle()
  const single = vi.fn();
  const readEq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq: readEq }));
  const maybeSingle = vi.fn();
  const writeSelect = vi.fn(() => ({ maybeSingle }));
  const writeEq: Mock = vi.fn(() => ({ eq: writeEq, select: writeSelect }));
  const update = vi.fn(() => ({ eq: writeEq }));

  beforeEach(() => {
    vi.clearAllMocks();
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ select, update })) });
  });

  it('appends the cleaner to the declined list in a write guarded on cleaner and status', async () => {
    single.mockResolvedValue({ data: { declined_by_cleaner_ids: ['cl-0'], cleaner_id: 'cl-1' }, error: null });
    maybeSingle.mockResolvedValue({ data: { id: 'ord-1', status: 'pending_assignment' }, error: null });

    const result = await declineOrder('ord-1', 'cl-1');

    expect(result).toEqual({ id: 'ord-1', status: 'pending_assignment' });
    expect(update).toHaveBeenCalledWith({
      cleaner_id: null,
      status: 'pending_assignment',
      assigned_at: null,
      declined_by_cleaner_ids: ['cl-0', 'cl-1'],
    });
    expect(writeEq).toHaveBeenCalledWith('id', 'ord-1');
    expect(writeEq).toHaveBeenCalledWith('cleaner_id', 'cl-1');
    expect(writeEq).toHaveBeenCalledWith('status', 'pickup_scheduled');
  });

  it('returns null without writing when another cleaner holds the order', async () => {
    single.mockResolvedValue({ data: { declined_by_cleaner_ids: null, cleaner_id: 'cl-2' }, error: null });

    await expect(declineOrder('ord-1', 'cl-1')).resolves.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('returns null when the guarded write matches no row', async () => {
    single.mockResolvedValue({ data: { declined_by_cleaner_ids: null, cleaner_id: 'cl-1' }, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(declineOrder('ord-1', 'cl-1')).resolves.toBeNull();
  });
});

describe('assignCleanerToPendingOrder', () => {
  // from('orders').update({...}).eq('id', id).eq('status', 'pending_assignment').is('cleaner_id', null).select().maybeSingle()
  const maybeSingle = vi.fn();
  const select = vi.fn(() => ({ maybeSingle }));
  const is = vi.fn(() => ({ select }));
  const eqStatus = vi.fn(() => ({ is }));
  const eqId = vi.fn(() => ({ eq: eqStatus }));
  const update = vi.fn(() => ({ eq: eqId }));

  beforeEach(() => {
    vi.clearAllMocks();
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ update })) });
  });

  it('assigns the cleaner only while the order is pending_assignment without a cleaner', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'ord-1', cleaner_id: 'cl-2' }, error: null });

    const result = await assignCleanerToPendingOrder('ord-1', 'cl-2');

    expect(result).toEqual({ id: 'ord-1', cleaner_id: 'cl-2' });
    expect(update).toHaveBeenCalledWith({
      cleaner_id: 'cl-2',
      status: 'pickup_scheduled',
      assigned_at: expect.any(String),
    });
    expect(eqId).toHaveBeenCalledWith('id', 'ord-1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'pending_assignment');
    expect(is).toHaveBeenCalledWith('cleaner_id', null);
  });

  it('returns null when the order is no longer waiting', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(assignCleanerToPendingOrder('ord-1', 'cl-2')).resolves.toBeNull();
  });

  it('returns null on a query error', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(assignCleanerToPendingOrder('ord-1', 'cl-2')).resolves.toBeNull();
  });
});

describe('updateOrderLaundryDetails — cleaner-facing error texts', () => {
  // read:  from('orders').select('cleaner_id, status').eq('id', id).single()
  // write: from('orders').update({...}).eq('id', id).select().single()
  const readSingle = vi.fn();
  const readEq = vi.fn(() => ({ single: readSingle }));
  const select = vi.fn(() => ({ eq: readEq }));
  const writeSingle = vi.fn();
  const writeSelect = vi.fn(() => ({ single: writeSingle }));
  const writeEq = vi.fn(() => ({ select: writeSelect }));
  const update = vi.fn(() => ({ eq: writeEq }));

  const details = {
    wash_loads: 2,
    ironing_details: null,
    total_cost_ore: 59800,
    cleaner_payout_ore: 41860,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ select, update })) });
  });

  it('answers in Norwegian when the order does not exist', async () => {
    readSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } });

    const result = await updateOrderLaundryDetails('ord-1', 'cl-1', details);

    expect(result).toEqual({ data: null, error: 'Vi fant ikke ordren. Last siden på nytt og prøv igjen.' });
    expect(update).not.toHaveBeenCalled();
  });

  it('answers in Norwegian when the order belongs to another cleaner', async () => {
    readSingle.mockResolvedValue({ data: { cleaner_id: 'cl-2', status: 'in_cleaning' }, error: null });

    const result = await updateOrderLaundryDetails('ord-1', 'cl-1', details);

    expect(result).toEqual({ data: null, error: 'Ordren er ikke lenger tildelt deg. Last siden på nytt.' });
    expect(update).not.toHaveBeenCalled();
  });

  it.each(['completed', 'cancelled'])('answers in Norwegian for a %s order', async (status) => {
    readSingle.mockResolvedValue({ data: { cleaner_id: 'cl-1', status }, error: null });

    const result = await updateOrderLaundryDetails('ord-1', 'cl-1', details);

    expect(result).toEqual({ data: null, error: 'Ordren er fullført eller kansellert og kan ikke endres.' });
    expect(update).not.toHaveBeenCalled();
  });

  it('never returns the raw database message when the write fails', async () => {
    readSingle.mockResolvedValue({ data: { cleaner_id: 'cl-1', status: 'in_cleaning' }, error: null });
    writeSingle.mockResolvedValue({ data: null, error: { message: 'duplicate key value violates unique constraint' } });

    const result = await updateOrderLaundryDetails('ord-1', 'cl-1', details);

    expect(result).toEqual({ data: null, error: 'Kunne ikke lagre vaskdetaljene. Prøv igjen.' });
  });

  it('returns the updated order when the write succeeds', async () => {
    readSingle.mockResolvedValue({ data: { cleaner_id: 'cl-1', status: 'in_cleaning' }, error: null });
    writeSingle.mockResolvedValue({ data: { id: 'ord-1', wash_loads: 2 }, error: null });

    const result = await updateOrderLaundryDetails('ord-1', 'cl-1', details);

    expect(result).toEqual({ data: { id: 'ord-1', wash_loads: 2 }, error: null });
  });
});
