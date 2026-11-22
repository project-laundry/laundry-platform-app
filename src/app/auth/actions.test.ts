import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/users', () => ({
  findTakenSignupFields: vi.fn(),
}));
vi.mock('@/lib/utils/rate-limit', () => ({
  clientIp: vi.fn(async () => '203.0.113.7'),
  isRateLimited: vi.fn(),
}));

import { findTakenSignupFields } from '@/lib/database/users';
import { isRateLimited } from '@/lib/utils/rate-limit';
import { checkSignupAvailabilityAction } from './actions';

const m = (fn: unknown) => fn as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  m(findTakenSignupFields).mockResolvedValue({ emailTaken: false, phoneTaken: false });
  m(isRateLimited).mockResolvedValue(false);
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

  it('answers "nothing taken" without looking up when the caller is rate limited', async () => {
    m(isRateLimited).mockResolvedValue(true);
    m(findTakenSignupFields).mockResolvedValue({ emailTaken: true, phoneTaken: true });

    const result = await checkSignupAvailabilityAction({ email: 'ola@example.com', phone: '+4712345678' });

    expect(isRateLimited).toHaveBeenCalledWith('signup-check', '203.0.113.7');
    expect(result).toEqual({ emailTaken: false, phoneTaken: false });
    expect(findTakenSignupFields).not.toHaveBeenCalled();
  });
});
