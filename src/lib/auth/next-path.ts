// The `?next=` return path the login and signup pages honor, so a flow can
// send an anonymous visitor to log in and get them back (e.g. the order flow's
// confirm step). Only same-site paths are accepted — never a full URL or a
// protocol-relative `//host` — so the param can't be used to bounce people
// off the site.

/** The path to return to after auth, or null when the param is missing or unsafe. */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return null;
  }
  return raw;
}

/** `href` with `?next=` appended when there is a path to come back to. */
export function withNext(href: string, next: string | null): string {
  return next ? `${href}?next=${encodeURIComponent(next)}` : href;
}

/** The three steps of the customer order flow. */
const ORDER_FLOW_STEPS = ['/orders/wash', '/orders/pickup', '/orders/confirm'];

/**
 * Where a signed-out visitor is sent when they open anything under `/orders`
 * (used by src/proxy.ts), or null for other paths. The order flow requires an
 * account from its first step: the steps go to signup (most visitors coming
 * from the landing page are new), every other order page to login. Both carry
 * `?next=` so the visitor lands back on the page they asked for.
 */
export function orderAuthRedirect(pathname: string, search = ''): string | null {
  if (pathname !== '/orders' && !pathname.startsWith('/orders/')) return null;
  const target = ORDER_FLOW_STEPS.includes(pathname) ? '/auth/signup' : '/auth/login';
  return withNext(target, `${pathname}${search}`);
}
