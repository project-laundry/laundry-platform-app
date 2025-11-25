-- Migration: Fix user creation trigger to remove automatic customer creation
-- The trigger should only create users records, not automatically create customers
-- Application logic will handle creating customer/cleaner/admin records based on signup flow

-- Update the handle_new_user function to NOT auto-create customers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert into users table
  INSERT INTO public.users (
    id,
    email,
    phone,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer', -- Default role, can be changed by application
    NOW(),
    NOW()
  );

  -- REMOVED: Automatic customer record creation
  -- Previously, this trigger automatically created a customers record for ALL new users
  -- This was incorrect because users can be customers, cleaners, or admins
  -- Application logic now handles creating the appropriate role-specific record

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
