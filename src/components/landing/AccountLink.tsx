'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/** True once the browser has found a Supabase session. Starts false, so the
 *  server HTML and signed-out visitors always get the signed-out version. */
function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active) setSignedIn(Boolean(data.session));
      })
      .catch(() => {
        // No session readable: keep the signed-out link.
      });
    return () => {
      active = false;
    };
  }, []);

  return signedIn;
}

/**
 * The account link on the public pages: «Logg inn» → /auth/login for
 * signed-out visitors, «Min side» → /dashboard once a session is found.
 * /dashboard sends cleaners and admins on to their own dashboards, so no role
 * lookup is needed here. The caller owns the styling through `className`.
 */
export function AccountLink({
  className,
  loginCta,
  onClick,
}: {
  className: string;
  /** PostHog `cta` value for the signed-out link (autocapture filter). */
  loginCta?: string;
  onClick?: () => void;
}) {
  const signedIn = useSignedIn();

  if (signedIn) {
    return (
      <Link
        href="/dashboard"
        data-ph-capture-attribute-cta="my-page"
        className={`inline-flex items-center justify-center gap-1.5 ${className}`}
        onClick={onClick}
      >
        <UserRound className="size-4" aria-hidden />
        Min side
      </Link>
    );
  }

  return (
    <Link href="/auth/login" data-ph-capture-attribute-cta={loginCta} className={className} onClick={onClick}>
      Logg inn
    </Link>
  );
}
