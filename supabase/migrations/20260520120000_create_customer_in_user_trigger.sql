-- Migration: handle_new_user() also inserts into customers when role='customer'.
-- Makes customer creation atomic with auth signup so the customers row exists
-- even if the user never clicks the confirmation email. Cleaners still create
-- their record later in /bli-renser/business onboarding.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_value public.user_role;
BEGIN
  BEGIN
    user_role_value := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION
    WHEN invalid_text_representation OR undefined_object THEN
      user_role_value := 'customer'::public.user_role;
  END;

  IF user_role_value IS NULL THEN
    user_role_value := 'customer'::public.user_role;
  END IF;

  INSERT INTO public.users (id, email, phone, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role_value,
    NOW(),
    NOW()
  );

  IF user_role_value = 'customer'::public.user_role THEN
    INSERT INTO public.customers (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;
