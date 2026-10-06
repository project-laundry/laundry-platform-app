// Pre-launch gate, keyed on the hostname. On the production domain,
// anonymous visitors only reach the coming-soon pages and the legal/contact
// pages; everything else (login, signup, order flow, the parked landing
// pages) redirects to "/". test.nooracare.no, localhost and Vercel previews
// are never gated, so the full app is exercised on staging. A signed-in user
// passes on production too (sessions are only created on staging today, so
// this mostly matters once accounts exist). Pure logic lives here so it can
// be unit-tested; src/proxy.ts wires it to the request.
//
// At launch: delete this file, its test and the block in src/proxy.ts.

const PRODUCTION_HOSTS = ['nooracare.no', 'www.nooracare.no'];

/** Whether requests to this host are gated. `host` may carry a port. */
export function isGatedHost(host: string | null): boolean {
  if (!host) return false;
  const name = host.split(':')[0].toLowerCase();
  return PRODUCTION_HOSTS.includes(name);
}

/** Pages that stay public during pre-launch — exact matches, so the cleaner
 *  onboarding steps under /bli-renser/* and the parked /bli-renser/lansering
 *  stay out. */
const PUBLIC_PAGES = [
  '/',
  '/bli-renser',
  '/kontakt',
  '/personvern',
  '/personvern-renser',
  '/salgsvilkar',
  '/pris-kalkulator',
  '/auth/callback',
  '/auth/error',
];

/** Trees that stay public (the path itself or anything below it). */
const PUBLIC_PREFIXES = ['/api', '/admin'];

/** Generated social images (`opengraph-image.tsx`) are served without an
 *  extension, so the proxy matcher doesn't skip them like it does for PNGs. */
const SOCIAL_IMAGE_RE = /\/(opengraph|twitter)-image[^/]*$/;

function startsWithPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function isPublicPrelaunchPath(pathname: string): boolean {
  if (SOCIAL_IMAGE_RE.test(pathname)) return true;
  if (PUBLIC_PAGES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => startsWithPath(pathname, p));
}

/** True when the request should be redirected to "/". */
export function shouldRedirectToComingSoon(input: {
  host: string | null;
  pathname: string;
  hasSession: boolean;
}): boolean {
  if (!isGatedHost(input.host)) return false;
  if (input.hasSession) return false;
  return !isPublicPrelaunchPath(input.pathname);
}
