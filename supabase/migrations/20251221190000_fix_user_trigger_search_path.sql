-- Migration: Fix search_path for handle_new_user() trigger
--
-- Issue: SECURITY DEFINER functions without explicit search_path can fail to resolve
-- schema objects when executed by Supabase Auth. The auth schema has a restricted
-- search_path that doesn't include 'public' by default.
--
-- Solution: Add explicit search_path to the function to ensure it can find the
-- user_role enum type and users table in the public schema.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value public.user_role;
BEGIN
  -- Read role from metadata, validate and cast to enum, default to 'customer'
  -- Handle invalid values gracefully with exception handling
  BEGIN
    user_role_value := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION
    WHEN invalid_text_representation OR undefined_object THEN
      user_role_value := 'customer'::public.user_role;
  END;

  -- If null, default to customer
  IF user_role_value IS NULL THEN
    user_role_value := 'customer'::public.user_role;
  END IF;

  -- Insert into users table with the determined role
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
    user_role_value,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;
