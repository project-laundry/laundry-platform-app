import { createClient } from "@/lib/supabase/server";
import { createCustomer } from "@/lib/database/customers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.user) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(`${origin}/auth/error`);
    }
    return NextResponse.redirect(`${origin}/bli-renser/business`);
  }
  
  console.error("No code provided in callback");
  return NextResponse.redirect(`${origin}/auth/error`);
}
