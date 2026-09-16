import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/users', () => ({
  findTakenSignupFields: vi.fn(),
}));

import { findTakenSignupFields } from '@/lib/database/users';
import { checkSignupAvailabilityAction } from './actions';

const m = (fn: unknown) => fn as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  m(findTakenSignupFields).mockResolvedValue({ emailTaken: false, phoneTaken: false });
});

describe('checkSignupAvailabilityAction', () => {
  it('normalises the e-mail (trim + lowercase) and trims the phone before looking up', async () => {
    await checkSignupAvailabilityAction({ email: '  Ola@Example.COM ', phone: ' +4712345678 ' });

    expect(findTakenSignupFields).toHaveBeenCalledWith('ola@example.com', '+4712345678');
  });

  it('returns what the lookup reports', async () => {
    m(findTakenSignupFields).mockResolvedValue({ emailTaken: false, phoneTaken: true });

    const result = await checkSignupAvailabilityAction({
      email: 'ola@example.com',
      phone: '+4712345678',
    });

    expect(result).toEqual({ emailTaken: false, phoneTaken: true });
  });

  it('skips the lookup when e-mail or phone is blank', async () => {
    const result = await checkSignupAvailabilityAction({ email: '', phone: '+4712345678' });

    expect(result).toEqual({ emailTaken: false, phoneTaken: false });
    expect(findTakenSignupFields).not.toHaveBeenCalled();
  });
});
