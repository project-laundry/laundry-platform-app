// The only file that talks to posthog-js. initAnalytics() runs once from
// src/instrumentation-client.ts; components call track(). Cookieless until
// the visitor presses «Godta» in the consent banner (ConsentBanner): before a
// choice and after «Avvis» nothing is stored except the remembered choice,
// and nothing is recorded. See CLAUDE.md "Analytics".

import posthog from 'posthog-js';
import {
  AUTOCAPTURE_URL_IGNORELIST,
  isAnalyticsHost,
  isRecordingAllowed,
  type AnalyticsConsent,
  type AnalyticsEvent,
} from './config';

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

let enabled = false;
let recording = false;
const consentListeners = new Set<() => void>();

/** Starts PostHog when a project key is configured and the page is served
 *  from a host that sends analytics. Returns whether analytics is on. Safe
 *  to call more than once. */
export function initAnalytics(input: { key: string | undefined; hostname: string }): boolean {
  if (enabled) return true;
  if (!input.key || !isAnalyticsHost(input.hostname)) return false;

  posthog.init(input.key, {
    // Same-origin proxy (next.config.ts rewrites) in front of the EU cloud.
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-05-30',
    // Cookieless (no cookies, no local/session storage, anonymous id hashed
    // on PostHog's servers) for everyone who has not pressed «Godta»: opted
    // out by default, and 'on_reject' keeps capturing cookieless for them.
    // The project setting "Cookieless tracking" must be on, or those events
    // are dropped.
    cookieless_mode: 'on_reject',
    opt_out_capturing_by_default: true,
    person_profiles: 'never',
    // Error tracking: uncaught browser errors and unhandled promise
    // rejections are sent as exceptions (server errors go through
    // lib/analytics/server-errors.ts).
    capture_exceptions: true,
    // Replay stays off until acceptAnalytics() / syncRecording() start it.
    // When it runs, everything typed is masked, and so is any element marked
    // data-ph-mask (the address on the order summary).
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask], [data-ph-mask] *',
    },
    // Click/scroll heatmaps; clickmaps need autocapture, scrollmaps need the
    // $pageleave events that `defaults` turns on.
    capture_heatmaps: true,
    autocapture: {
      dom_event_allowlist: ['click', 'submit'],
      element_allowlist: ['a', 'button', 'form', 'label'],
      url_ignorelist: AUTOCAPTURE_URL_IGNORELIST,
    },
  });
  enabled = true;
  return true;
}

/** Sends a custom event. A no-op until initAnalytics() turned analytics on
 *  (localhost, previews, missing key). `beforeNavigation` sends immediately
 *  via sendBeacon for events fired right before leaving the page. */
export function track(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
  options?: { beforeNavigation?: boolean }
): void {
  if (!enabled) return;
  posthog.capture(
    event,
    properties,
    options?.beforeNavigation ? { transport: 'sendBeacon', send_instantly: true } : undefined
  );
}

// ── Consent (the cookie banner) ──────────────────────────────────────────

/** The visitor's answer to the consent banner, or 'off' where analytics does not run. */
export function analyticsConsent(): AnalyticsConsent {
  return enabled ? posthog.get_explicit_consent_status() : 'off';
}

/** For useSyncExternalStore: called whenever the answer changes. */
export function subscribeConsent(listener: () => void): () => void {
  consentListeners.add(listener);
  return () => consentListeners.delete(listener);
}

function consentChanged(): void {
  consentListeners.forEach((listener) => listener());
}

/** «Godta»: PostHog may use cookies and browser storage, and session replay
 *  may run (syncRecording decides per page). */
export function acceptAnalytics(): void {
  if (!enabled) return;
  posthog.opt_in_capturing();
  consentChanged();
}

/** «Avvis» (also a withdrawn consent): back to cookieless. PostHog deletes
 *  its cookies and storage and keeps only the remembered choice. */
export function declineAnalytics(): void {
  if (!enabled) return;
  if (recording) {
    posthog.stopSessionRecording();
    recording = false;
  }
  posthog.opt_out_capturing();
  // The SDK leaves its per-tab window id behind after a withdrawn consent.
  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith('ph_'))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Storage can be unavailable (private mode); nothing to clean up then.
  }
  consentChanged();
}

/** Starts or stops session replay for the page the visitor is on: it only
 *  runs with consent and never on the pages in RECORDING_URL_BLOCKLIST. Call
 *  on every navigation and after every consent change. */
export function syncRecording(pathname: string): void {
  if (!enabled) return;
  const shouldRecord = posthog.get_explicit_consent_status() === 'granted' && isRecordingAllowed(pathname);
  if (shouldRecord === recording) return;
  if (shouldRecord) posthog.startSessionRecording();
  else posthog.stopSessionRecording();
  recording = shouldRecord;
}
