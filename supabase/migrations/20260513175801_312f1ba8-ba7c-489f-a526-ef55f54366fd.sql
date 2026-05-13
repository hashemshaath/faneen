-- 1. Update handle_new_user to set account_type and auto-create business
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _next_account_number integer;
  _account_type text;
  _full_name text;
  _placeholder_username text;
BEGIN
  SELECT COALESCE(MAX(account_number), 999) + 1 INTO _next_account_number FROM public.profiles;

  _account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  IF _account_type NOT IN ('individual', 'business', 'company') THEN
    _account_type := 'individual';
  END IF;

  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.profiles (user_id, phone, email, full_name, account_number, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.email, ''),
    _full_name,
    _next_account_number,
    _account_type::account_type
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Auto-create a draft business so the entity gets a ref_id immediately.
  -- The user (manager) becomes subordinate to the business entity.
  IF _account_type IN ('business', 'company') THEN
    _placeholder_username := 'biz-' || substring(replace(NEW.id::text, '-', '') from 1 for 12);
    BEGIN
      INSERT INTO public.businesses (user_id, name_ar, username, approval_status, username_status)
      VALUES (
        NEW.id,
        NULLIF(_full_name, ''),
        _placeholder_username,
        'draft'::business_approval_status,
        'pending'::username_status
      )
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Never block signup; onboarding can still create the business later.
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Backfill: any business/company profile with no business row gets one
DO $$
DECLARE
  r RECORD;
  _username text;
  _name text;
BEGIN
  FOR r IN
    SELECT p.user_id, p.full_name
    FROM public.profiles p
    WHERE p.account_type IN ('business', 'company')
      AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = p.user_id)
  LOOP
    _username := 'biz-' || substring(replace(r.user_id::text, '-', '') from 1 for 12);
    _name := COALESCE(NULLIF(r.full_name, ''), 'منشأة');
    BEGIN
      INSERT INTO public.businesses (user_id, name_ar, username, approval_status, username_status)
      VALUES (r.user_id, _name, _username, 'draft'::business_approval_status, 'pending'::username_status);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
