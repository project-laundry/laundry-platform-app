// PostHog analytics, cookieless — the pure parts: which hosts send, where
// autocapture is off, and the event vocabulary. posthog.ts does the SDK
// calls. See CLAUDE.md "Analytics".

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
