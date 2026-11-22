import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    get_explicit_consent_status: vi.fn(() => 'pending'),
    startSessionRecording: vi.fn(),
    stopSessionRecording: vi.fn(),
  },
}));

async function load() {
  vi.resetModules();
  const [{ default: posthog }, mod] = await Promise.all([import('posthog-js'), import('./posthog')]);
  // The mocked SDK object is shared between tests: start every test undecided.
  vi.mocked(posthog.get_explicit_consent_status).mockReturnValue('pending');
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

  it('starts PostHog cookieless until consent, through the /ingest proxy, without replay', async () => {
    const { posthog, initAnalytics } = await load();
    expect(initAnalytics({ key: KEY, hostname: 'nooracare.no' })).toBe(true);
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init).toHaveBeenCalledWith(
      KEY,
      expect.objectContaining({
        api_host: '/ingest',
        ui_host: 'https://eu.posthog.com',
        cookieless_mode: 'on_reject',
        opt_out_capturing_by_default: true,
        person_profiles: 'never',
        disable_session_recording: true,
        session_recording: expect.objectContaining({ maskAllInputs: true }),
        capture_exceptions: true,
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

describe('consent and session replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const on = async () => {
    const loaded = await load();
    loaded.initAnalytics({ key: KEY, hostname: 'nooracare.no' });
    return loaded;
  };

  it("reports 'off' where analytics does not run, otherwise the visitor's answer", async () => {
    const { posthog, initAnalytics, analyticsConsent } = await load();
    expect(analyticsConsent()).toBe('off');

    initAnalytics({ key: KEY, hostname: 'nooracare.no' });
    expect(analyticsConsent()).toBe('pending');
    vi.mocked(posthog.get_explicit_consent_status).mockReturnValue('granted');
    expect(analyticsConsent()).toBe('granted');
  });

  it('does nothing on accept, decline or sync where analytics does not run', async () => {
    const { posthog, acceptAnalytics, declineAnalytics, syncRecording } = await load();
    acceptAnalytics();
    declineAnalytics();
    syncRecording('/');
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
    expect(posthog.opt_out_capturing).not.toHaveBeenCalled();
    expect(posthog.startSessionRecording).not.toHaveBeenCalled();
  });

  it('opts in on «Godta», opts out on «Avvis», and tells subscribers both times', async () => {
    const { posthog, acceptAnalytics, declineAnalytics, subscribeConsent } = await on();
    const listener = vi.fn();
    const unsubscribe = subscribeConsent(listener);

    acceptAnalytics();
    expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
    declineAnalytics();
    expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    acceptAnalytics();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('never records before an answer or after «Avvis»', async () => {
    const { posthog, syncRecording } = await on();
    syncRecording('/');
    vi.mocked(posthog.get_explicit_consent_status).mockReturnValue('denied');
    syncRecording('/orders/wash');
    expect(posthog.startSessionRecording).not.toHaveBeenCalled();
  });

  it('records public pages after «Godta», stops on pages with personal data and on a withdrawn consent', async () => {
    const { posthog, syncRecording, declineAnalytics } = await on();
    vi.mocked(posthog.get_explicit_consent_status).mockReturnValue('granted');

    syncRecording('/');
    syncRecording('/orders/wash'); // already recording: no second start
    expect(posthog.startSessionRecording).toHaveBeenCalledTimes(1);

    syncRecording('/dashboard');
    expect(posthog.stopSessionRecording).toHaveBeenCalledTimes(1);
    syncRecording('/auth/login');
    syncRecording('/admin/orders');
    expect(posthog.startSessionRecording).toHaveBeenCalledTimes(1);

    syncRecording('/pris-kalkulator');
    expect(posthog.startSessionRecording).toHaveBeenCalledTimes(2);
    declineAnalytics();
    expect(posthog.stopSessionRecording).toHaveBeenCalledTimes(2);
  });
});
