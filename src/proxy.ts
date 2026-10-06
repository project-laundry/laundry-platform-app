// Session refresh for @supabase/ssr (Next.js 16 proxy convention), plus the
// pre-launch gate for the production domain (src/lib/prelaunch.ts).
// Server components can't always write refreshed auth cookies; running
// getUser() here once per navigation persists refreshed tokens (see the
// comment in lib/supabase/server.ts setAll).

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { shouldRedirectToComingSoon } from '@/lib/prelaunch';

export async function proxy(request: NextRequest) {
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

  // Pre-launch: nooracare.no shows only the coming-soon pages; the full app
  // lives on test.nooracare.no until launch.
  if (
    shouldRedirectToComingSoon({
      host: request.headers.get('host'),
      pathname: request.nextUrl.pathname,
      hasSession: user !== null,
    })
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and the Vipps webhook endpoint.
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
