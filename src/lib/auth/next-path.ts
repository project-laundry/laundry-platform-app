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
