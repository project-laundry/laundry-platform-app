-- Migration: Update user creation trigger to respect role metadata
--
-- Previously, the handle_new_user() trigger hardcoded role='customer' for all new users.
-- This caused an issue where cleaners signing up through /bli-renser/signup would have
-- the wrong role until they completed the full onboarding process.
--
-- This migration updates the trigger to:
-- 1. Read the 'role' value from raw_user_meta_data (set during signup)
-- 2. Validate it's a valid user_role enum value
-- 3. Use it if valid, otherwise default to 'customer'
-- 4. Handle edge cases gracefully (null, invalid values)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Read role from metadata, validate and cast to enum, default to 'customer'
  -- Handle invalid values gracefully with exception handling
  BEGIN
    user_role_value := (NEW.raw_user_meta_data->>'role')::user_role;
  EXCEPTION
    WHEN invalid_text_representation OR undefined_object THEN
      user_role_value := 'customer'::user_role;
  END;

  -- If null, default to customer
  IF user_role_value IS NULL THEN
    user_role_value := 'customer'::user_role;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
