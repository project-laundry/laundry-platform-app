// The only file that talks to posthog-js. initAnalytics() runs once from
// src/instrumentation-client.ts; components call track(). Cookieless by
// design: no cookies, no storage, no identify — see the config below and
// CLAUDE.md "Analytics".

import posthog from 'posthog-js';
import { AUTOCAPTURE_URL_IGNORELIST, isAnalyticsHost, type AnalyticsEvent } from './config';

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

let enabled = false;

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
    // No cookies, no local/session storage, no person profiles. The project
    // setting "Cookieless server hash mode" must be on, or events are dropped.
    cookieless_mode: 'always',
    person_profiles: 'never',
    disable_session_recording: true,
    capture_exceptions: false,
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
