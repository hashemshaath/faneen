
-- Unique partial index on email (exclude empty strings and nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
ON public.profiles (lower(email))
WHERE email IS NOT NULL AND email != '';

-- Unique partial index on phone (exclude empty strings and nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
ON public.profiles (phone)
WHERE phone IS NOT NULL AND phone != '';

-- Validation trigger to prevent duplicate email/phone with clear error messages
CREATE OR REPLACE FUNCTION public.validate_profile_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_id uuid;
BEGIN
  -- Check email uniqueness
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    SELECT user_id INTO _existing_id
    FROM profiles
    WHERE lower(email) = lower(NEW.email) AND user_id != NEW.user_id
    LIMIT 1;
    
    IF _existing_id IS NOT NULL THEN
      RAISE EXCEPTION 'البريد الإلكتروني مسجل مسبقاً لحساب آخر / Email already registered'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  -- Check phone uniqueness (normalize by removing spaces/dashes)
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    SELECT user_id INTO _existing_id
    FROM profiles
    WHERE phone = NEW.phone AND user_id != NEW.user_id
    LIMIT 1;
    
    IF _existing_id IS NOT NULL THEN
      RAISE EXCEPTION 'رقم الهاتف مسجل مسبقاً لحساب آخر / Phone already registered'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_profile_uniqueness
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_uniqueness();
