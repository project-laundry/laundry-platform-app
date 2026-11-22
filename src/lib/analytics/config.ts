// PostHog analytics — the pure parts: which hosts send, where autocapture
// and session replay are off, and the event vocabulary. Cookieless unless the
// visitor accepts the consent banner. posthog.ts does the SDK calls. See
// CLAUDE.md "Analytics".

/** Hosts that send analytics: production, and staging with its own PostHog
 *  project. localhost and Vercel preview URLs never send, even with a key. */
const ANALYTICS_HOSTS = ['nooracare.no', 'www.nooracare.no', 'test.nooracare.no'];

/** `hostname` as in window.location.hostname (no port). */
export function isAnalyticsHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  return ANALYTICS_HOSTS.includes(hostname.toLowerCase());
}

/** URLs where autocapture (clicks → clickmaps, CTA tags) stays OFF because
 *  the element text there is customer or cleaner data: admin, dashboards,
 *  the cleaner signup and onboarding steps, and the per-order pages. Regex
 *  sources, matched by posthog-js against the full URL. Page views are
 *  unaffected. */
export const AUTOCAPTURE_URL_IGNORELIST = [
  '/admin',
  '/dashboard',
  '/bli-renser/.',
  '/orders/details',
  '/orders/[0-9a-f-]{36}',
];

/** Session replay (only ever on after «Godta» in the consent banner) never
 *  records these pages: the same ones as above, plus the auth pages, where
 *  the visitor's e-mail address is shown as text. */
export const RECORDING_URL_BLOCKLIST = [...AUTOCAPTURE_URL_IGNORELIST, '/auth'];

/** `pathname` as in window.location.pathname. */
export function isRecordingAllowed(pathname: string): boolean {
  return !RECORDING_URL_BLOCKLIST.some((pattern) => new RegExp(pattern).test(pathname));
}

/** `off` = analytics is not running here (localhost, previews, no key);
 *  otherwise the visitor's answer to the consent banner. */
export type AnalyticsConsent = 'off' | 'pending' | 'granted' | 'denied';

/** Every custom event the app sends. Page views, page leaves, autocapture
 *  clicks and heatmap data are automatic and not listed here. */
export type AnalyticsEvent =
  | 'how_it_works_viewed'
  | 'calculator_used'
  | 'order_step_completed'
  | 'checkout_login_wall_shown'
  | 'promo_code_applied'
  | 'checkout_vipps_started'
  | 'checkout_result'
  | 'signup_submitted'
  | 'login_submitted';
