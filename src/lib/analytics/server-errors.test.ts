import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureExceptionImmediate = vi.fn();
const constructed = vi.fn();
vi.mock('posthog-node', () => ({
  PostHog: class {
    constructor(...args: unknown[]) {
      constructed(...args);
    }
    captureExceptionImmediate = captureExceptionImmediate;
  },
}));

vi.spyOn(console, 'error').mockImplementation(() => {});

async function load() {
  vi.resetModules();
  return import('./server-errors');
}

beforeEach(() => {
  vi.clearAllMocks();
  captureExceptionImmediate.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('captureServerException', () => {
  it('sends nothing where no PostHog key is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    const { captureServerException } = await load();

    await captureServerException('webhook', new Error('boom'));

    expect(constructed).not.toHaveBeenCalled();
    expect(captureExceptionImmediate).not.toHaveBeenCalled();
  });

  it('sends the error to the EU cloud right away, as the anonymous "server" source', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    const { captureServerException } = await load();
    const error = new Error('boom');

    await captureServerException('Vipps-webhook feilet', error, { ordre: 'ABC123' });
    await captureServerException('again', 'plain text');

    expect(constructed).toHaveBeenCalledTimes(1); // one client, reused
    expect(constructed).toHaveBeenCalledWith('phc_test', expect.objectContaining({ host: 'https://eu.i.posthog.com', flushAt: 1 }));
    expect(captureExceptionImmediate).toHaveBeenNthCalledWith(1, error, {
      distinctId: 'server',
      properties: { ordre: 'ABC123', source: 'Vipps-webhook feilet', $process_person_profile: false },
    });
    expect(captureExceptionImmediate.mock.calls[1][0]).toBeInstanceOf(Error);
    expect(captureExceptionImmediate.mock.calls[1][0].message).toBe('plain text');
  });

  it('never throws when PostHog cannot be reached', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    captureExceptionImmediate.mockRejectedValue(new Error('network'));
    const { captureServerException } = await load();

    await expect(captureServerException('webhook', new Error('boom'))).resolves.toBeUndefined();
  });
});
