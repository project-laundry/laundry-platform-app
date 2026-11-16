import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth/next-path';
import { RESET_LINK_EXPIRED_PATH, RESET_PASSWORD_PATH } from '@/lib/auth/password-reset';
import { type EmailOtpType, type User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Landing route for every Supabase e-mail link (signup confirmation, password
 * recovery). Two link styles are accepted:
 *
 * - `?token_hash=…&type=…` — the `{{ .TokenHash }}` e-mail template. Verified
 *   with verifyOtp; works even when the link is opened in another browser.
 * - `?code=…` — the default `{{ .ConfirmationURL }}` template with the PKCE
 *   flow @supabase/ssr always uses. Exchanged with exchangeCodeForSession,
 *   which needs the code-verifier cookie, i.e. the same browser that started
 *   the flow. Carries no `type`, so `?next=` is what tells us it is a
 *   recovery link.
 *
 * Both set the session cookies on the redirect response.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  // Same-site paths only — never trust the raw value.
  const next = safeNextPath(searchParams.get('next')) ?? '/dashboard';

  // Recovery links always end on the reset page and, when broken, on the
  // forgot page (not /auth/error, whose copy is about confirmation links).
  const isRecovery = type === 'recovery' || next === RESET_PASSWORD_PATH;
  const errorUrl = `${origin}${isRecovery ? RESET_LINK_EXPIRED_PATH : '/auth/error'}`;

  if (!(token_hash && type) && !code) {
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();
  let user: User | null = null;

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
      console.error('Error verifying OTP:', error);
    }
    user = data?.user ?? null;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Error exchanging code for session:', error);
    }
    user = data?.user ?? null;
  }

  if (!user) {
    return NextResponse.redirect(errorUrl);
  }

  if (isRecovery) {
    return NextResponse.redirect(`${origin}${RESET_PASSWORD_PATH}`);
  }

  // A newly confirmed cleaner continues onboarding; everyone else goes where
  // the link said (the order flow passes ?next=/orders/confirm).
  if (user.user_metadata?.role === 'cleaner') {
    return NextResponse.redirect(`${origin}/bli-renser/business`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
