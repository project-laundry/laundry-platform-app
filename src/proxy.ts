// Session refresh for @supabase/ssr (Next.js 16 proxy convention), plus the
// account requirement for the order flow (orderAuthRedirect).
// Server components can't always write refreshed auth cookies; running
// getUser() here once per navigation persists refreshed tokens (see the
// comment in lib/supabase/server.ts setAll).

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { orderAuthRedirect } from '@/lib/auth/next-path';

export async function proxy(request: NextRequest) {
  // next.config.ts sets skipTrailingSlashRedirect (needed by the PostHog
  // proxy), so Next no longer normalises "/foo/" to "/foo". Do it here for
  // app paths; /ingest never reaches this function (see the matcher below).
  const { pathname } = request.nextUrl;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    // A plain URL, not request.nextUrl.clone(): NextURL puts the trailing
    // slash back when it is serialised, which would redirect to itself.
    const url = new URL(request.url);
    url.pathname = pathname.replace(/\/+$/, '');
    return NextResponse.redirect(url, 308);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  // Refresh the session if expired so server components see a valid user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The order flow needs an account from step 1: signed-out visitors go to
  // signup/login and come back through ?next=. Page loads only — a server
  // action posted with an expired session answers with its own error.
  if (!user && request.method === 'GET') {
    const authPath = orderAuthRedirect(request.nextUrl.pathname, request.nextUrl.search);
    if (authPath) {
      return NextResponse.redirect(new URL(authPath, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, robots.txt and sitemap.xml (crawlers need
    // no session refresh), the Vipps webhook endpoint and the PostHog proxy (/ingest).
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/webhooks|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
