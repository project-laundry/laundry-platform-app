import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('posthog-js', () => ({
  default: { init: vi.fn(), capture: vi.fn() },
}));

async function load() {
  vi.resetModules();
  const [{ default: posthog }, mod] = await Promise.all([import('posthog-js'), import('./posthog')]);
  return { posthog, ...mod };
}

const KEY = 'phc_test';

describe('initAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing without a key', async () => {
    const { posthog, initAnalytics } = await load();
    expect(initAnalytics({ key: undefined, hostname: 'nooracare.no' })).toBe(false);
    expect(initAnalytics({ key: '', hostname: 'nooracare.no' })).toBe(false);
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('does nothing on localhost or a preview host, even with a key', async () => {
    const { posthog, initAnalytics } = await load();
    expect(initAnalytics({ key: KEY, hostname: 'localhost' })).toBe(false);
    expect(initAnalytics({ key: KEY, hostname: 'laundry-platform-app-git-develop.vercel.app' })).toBe(false);
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it('starts PostHog cookieless, through the /ingest proxy, without replay', async () => {
    const { posthog, initAnalytics } = await load();
    expect(initAnalytics({ key: KEY, hostname: 'nooracare.no' })).toBe(true);
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init).toHaveBeenCalledWith(
      KEY,
      expect.objectContaining({
        api_host: '/ingest',
        ui_host: 'https://eu.posthog.com',
        cookieless_mode: 'always',
        person_profiles: 'never',
        disable_session_recording: true,
        capture_exceptions: false,
        capture_heatmaps: true,
      })
    );
  });

  it('initialises only once', async () => {
    const { posthog, initAnalytics } = await load();
    initAnalytics({ key: KEY, hostname: 'test.nooracare.no' });
    expect(initAnalytics({ key: KEY, hostname: 'test.nooracare.no' })).toBe(true);
    expect(posthog.init).toHaveBeenCalledTimes(1);
  });
});

describe('track', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is a no-op until analytics is on', async () => {
    const { posthog, track } = await load();
    track('calculator_used');
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('captures the event with its properties once analytics is on', async () => {
    const { posthog, initAnalytics, track } = await load();
    initAnalytics({ key: KEY, hostname: 'nooracare.no' });
    track('order_step_completed', { step: 1, bags: 2 });
    expect(posthog.capture).toHaveBeenCalledWith('order_step_completed', { step: 1, bags: 2 }, undefined);
  });

  it('sends immediately via sendBeacon when fired before a navigation', async () => {
    const { posthog, initAnalytics, track } = await load();
    initAnalytics({ key: KEY, hostname: 'nooracare.no' });
    track('checkout_vipps_started', { recurring: false }, { beforeNavigation: true });
    expect(posthog.capture).toHaveBeenCalledWith(
      'checkout_vipps_started',
      { recurring: false },
      { transport: 'sendBeacon', send_instantly: true }
    );
  });
});
