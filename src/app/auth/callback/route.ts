import { createClient } from '@/lib/supabase/server';
import { createCustomer } from '@/lib/database/customers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  console.log('Auth callback received code:', code, 'next:', next);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if(error || !data?.user) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(`${origin}/auth/error`);
    }    

    if (!error && data?.user) {
      // Create customer record for new users
      console.log('Creating customer record for user:', data.user.id);
      const { error: customerError } = await createCustomer(data.user.id);
      if (customerError) {
        console.error('Failed to create customer:', customerError);
        // Continue anyway - customer might already exist (MVP: edge case handling)
      }
      console.log('Redirecting user to:', next);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`);
}
