import { createClient } from '@/lib/supabase/server';
import { createCustomer } from '@/lib/database/customers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Create customer record for new users
      const { error: customerError } = await createCustomer(data.user.id);
      if (customerError) {
        console.error('Failed to create customer:', customerError);
        // Continue anyway - customer might already exist (MVP: edge case handling)
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`);
}
