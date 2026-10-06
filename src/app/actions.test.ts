import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/waitlist', () => ({ addWaitlistSignup: vi.fn() }));

import { addWaitlistSignup } from '@/lib/database/waitlist';
import { joinWaitlistAction } from './actions';

const m = (fn: unknown) => fn as Mock;

const base = {
  email: '  Kari@Example.no ',
  audience: 'customer' as const,
  city: 'bergen' as const,
  consent: true,
};

describe('joinWaitlistAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m(addWaitlistSignup).mockResolvedValue(true);
  });

  it('normalises the email and saves the signup', async () => {
    await expect(joinWaitlistAction(base)).resolves.toEqual({ ok: true });
    expect(addWaitlistSignup).toHaveBeenCalledWith({
      email: 'kari@example.no',
      audience: 'customer',
      city: 'bergen',
    });
  });

  it('rejects an invalid email', async () => {
    const result = await joinWaitlistAction({ ...base, email: 'kari@' });
    expect(result.ok).toBe(false);
    expect(addWaitlistSignup).not.toHaveBeenCalled();
  });

  it('rejects an unknown city or audience', async () => {
    const city = await joinWaitlistAction({ ...base, city: 'trondheim' as never });
    const audience = await joinWaitlistAction({ ...base, audience: 'admin' as never });
    expect(city.ok).toBe(false);
    expect(audience.ok).toBe(false);
    expect(addWaitlistSignup).not.toHaveBeenCalled();
  });

  it('requires consent', async () => {
    const result = await joinWaitlistAction({ ...base, consent: false });
    expect(result.ok).toBe(false);
    expect(addWaitlistSignup).not.toHaveBeenCalled();
  });

  it('reports a database failure', async () => {
    m(addWaitlistSignup).mockResolvedValue(false);
    const result = await joinWaitlistAction(base);
    expect(result.ok).toBe(false);
  });
});
