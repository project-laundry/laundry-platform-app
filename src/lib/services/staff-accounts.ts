// Staff (driver/admin) account creation.
//
// The handle_new_user trigger only honors self-serve roles from signup
// metadata ('cleaner'; everything else becomes 'customer' plus a customers
// row), so privileged accounts are created here with the service-role
// client: create the auth user, let the trigger insert the public.users
// row synchronously, then flip the role and remove the stray customer
// profile the trigger created.
//
// public.users has NO foreign key to auth.users, so rollback on partial
// failure must delete BOTH rows: public.users first (it cascades to
// customers and drivers), then the auth user.

import { createAdminClient } from '@/lib/supabase/admin';

export interface CreateStaffAccountInput {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: 'driver' | 'admin';
}

export interface CreateStaffAccountResult {
  userId: string | null;
  error: string | null;
}

export async function createStaffAccount(
  input: CreateStaffAccountInput
): Promise<CreateStaffAccountResult> {
  const supabase = createAdminClient();

  // 1. Create the auth user. The signup trigger runs inside this call and
  //    inserts the public.users row (role 'customer') plus a customers row.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      phone: input.phone,
      full_name: input.full_name,
    },
  });

  if (authError || !authData?.user) {
    console.error('Error creating staff auth user:', authError);
    const message = authError?.message ?? '';
    if (message.includes('already been registered') || message.includes('already registered')) {
      return { userId: null, error: 'E-postadressen er allerede registrert' };
    }
    // A duplicate phone fails inside the trigger (users.phone is UNIQUE) and
    // surfaces from the auth API as a generic database error.
    if (message.toLowerCase().includes('database error')) {
      return {
        userId: null,
        error: 'Kunne ikke opprette brukeren — telefonnummeret kan være i bruk fra før',
      };
    }
    return { userId: null, error: 'Kunne ikke opprette brukeren' };
  }

  const userId = authData.user.id;

  // 2. Flip the role to the privileged one.
  const { error: roleError } = await supabase
    .from('users')
    .update({ role: input.role })
    .eq('id', userId);

  if (roleError) {
    console.error('Error setting staff role, rolling back user:', roleError);
    await deleteStaffAccount(userId);
    return { userId: null, error: 'Kunne ikke sette rollen — brukeren ble ikke opprettet' };
  }

  // 3. Remove the stray customer profile the trigger created. A brand-new
  //    user has no orders, so the delete is always safe. Non-fatal on error.
  const { error: customerError } = await supabase
    .from('customers')
    .delete()
    .eq('user_id', userId);

  if (customerError) {
    console.error('Error removing stray customer profile for staff user:', customerError);
  }

  return { userId, error: null };
}

/**
 * Delete a staff account created by createStaffAccount (rollback helper).
 * public.users first — it cascades to customers and drivers — then the
 * auth user (no FK links the two; both deletes are required).
 */
export async function deleteStaffAccount(userId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('users').delete().eq('id', userId);
  await supabase.auth.admin.deleteUser(userId);
}
