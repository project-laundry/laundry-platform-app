// The public site: canonical URL, which hosts search engines may index, and
// the paths behind /robots.txt and /sitemap.xml (app/robots.ts, app/sitemap.ts).

/** Canonical origin. A constant, NOT NEXT_PUBLIC_APP_URL: www.nooracare.no
 *  redirects here (next.config.ts), and staging must never be advertised. */
export const SITE_URL = 'https://nooracare.no';

/** The only hosts that may be indexed. test.nooracare.no (staging), Vercel
 *  preview URLs and localhost get "Disallow: /". */
const INDEXABLE_HOSTS = ['nooracare.no', 'www.nooracare.no'];

/** `host` as in the Host / X-Forwarded-Host request header (may carry a port
 *  or, for X-Forwarded-Host, a comma-separated list — the first entry counts). */
export function isIndexableHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.split(',')[0].trim().toLowerCase().split(':')[0];
  return INDEXABLE_HOSTS.includes(hostname);
}

/** Public marketing and legal pages — the whole sitemap. Add a new public
 *  page here when it is created. */
export const SITEMAP_PATHS = [
  '/',
  '/bli-renser',
  '/pris-kalkulator',
  '/kontakt',
  '/salgsvilkar',
  '/personvern',
  '/personvern-renser',
];

/** Path prefixes crawlers stay out of: signed-in areas, the order flow, auth,
 *  API routes, the PostHog proxy and the cleaner onboarding steps.
 *  /bli-renser/signup is left out on purpose: it has a noindex meta tag,
 *  which only works when the page may be fetched. */
export const ROBOTS_DISALLOW = [
  '/admin',
  '/dashboard',
  '/orders',
  '/auth',
  '/api',
  '/ingest',
  '/bli-renser/business',
  '/bli-renser/services',
  '/bli-renser/equipment',
  '/bli-renser/profile',
  '/bli-renser/confirm',
  '/bli-renser/success',
];
