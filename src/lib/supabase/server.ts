import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          async getItem(key: string) {
            return cookieStore.get(key)?.value;
          },
          async setItem(key: string, value: string) {
            cookieStore.set(key, value);
          },
          async removeItem(key: string) {
            cookieStore.delete(key);
          },
        },
      },
    }
  );
}
