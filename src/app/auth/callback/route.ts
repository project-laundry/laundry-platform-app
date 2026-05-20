import { createClient } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error || !data?.user) {
    console.error('Error verifying OTP:', error);
    return NextResponse.redirect(`${origin}/auth/error`);
  }

  const role = data.user.user_metadata?.role;

  if (role === 'cleaner') {
    return NextResponse.redirect(`${origin}/bli-renser/business`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
