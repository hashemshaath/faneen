
-- Identity integrity + duplicates + availability suite (super_admin only)

-- 1) Duplicates report: case-insensitive duplicates across profiles + auth.users
CREATE OR REPLACE FUNCTION public.admin_identity_duplicates_report()
RETURNS TABLE (
  kind text,            -- 'email' | 'username' | 'phone' | 'auth_profile_email_mismatch'
  value text,           -- the duplicated/normalized value (masked where relevant)
  occurrences integer,  -- count
  user_ids uuid[],      -- affected user ids
  details jsonb         -- per-row context
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required';
  END IF;

  RETURN QUERY
  -- Duplicate emails in profiles (case-insensitive, ignoring synthetic phone emails)
  SELECT
    'email'::text,
    lower(p.email)::text,
    count(*)::int,
    array_agg(p.user_id),
    jsonb_build_object('source','profiles')
  FROM public.profiles p
  WHERE p.email IS NOT NULL
    AND p.email <> ''
    AND p.email NOT ILIKE '%@phone.qitaat.local'
  GROUP BY lower(p.email)
  HAVING count(*) > 1

  UNION ALL
  -- Duplicate usernames
  SELECT
    'username'::text,
    lower(p.username)::text,
    count(*)::int,
    array_agg(p.user_id),
    jsonb_build_object('source','profiles')
  FROM public.profiles p
  WHERE p.username IS NOT NULL AND p.username <> ''
  GROUP BY lower(p.username)
  HAVING count(*) > 1

  UNION ALL
  -- Duplicate phones
  SELECT
    'phone'::text,
    p.phone::text,
    count(*)::int,
    array_agg(p.user_id),
    jsonb_build_object('source','profiles')
  FROM public.profiles p
  WHERE p.phone IS NOT NULL AND p.phone <> ''
  GROUP BY p.phone
  HAVING count(*) > 1

  UNION ALL
  -- auth.users.email vs profiles.email mismatch (non-synthetic)
  SELECT
    'auth_profile_email_mismatch'::text,
    lower(u.email)::text,
    1,
    ARRAY[u.id],
    jsonb_build_object(
      'auth_email', u.email,
      'profile_email', p.email,
      'auth_confirmed_at', u.email_confirmed_at
    )
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE u.email IS NOT NULL
    AND u.email NOT ILIKE '%@phone.qitaat.local'
    AND (p.email IS NULL OR lower(coalesce(p.email,'')) <> lower(u.email));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_identity_duplicates_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_identity_duplicates_report() TO authenticated;

-- 2) Integrity report (matches existing client wrapper expectation)
CREATE OR REPLACE FUNCTION public.admin_identity_integrity_report()
RETURNS TABLE (
  user_id uuid,
  masked_email text,
  mismatch_type text,
  has_profile boolean,
  has_role boolean,
  has_business boolean,
  synthetic_or_test boolean,
  recommended_action text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    CASE
      WHEN u.email IS NULL OR u.email = '' THEN ''
      ELSE regexp_replace(u.email, '(^.).*(@.*$)', '\1***\2')
    END AS masked_email,
    CASE
      WHEN u.email IS NULL OR u.email = '' THEN 'no_email'
      WHEN p.user_id IS NULL THEN 'profile_missing_email'
      WHEN p.email IS NULL OR p.email = '' THEN 'profile_missing_email'
      WHEN lower(p.email) <> lower(u.email)
        AND u.email NOT ILIKE '%@phone.qitaat.local' THEN 'email_mismatch'
      ELSE 'ok'
    END AS mismatch_type,
    (p.user_id IS NOT NULL) AS has_profile,
    EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id) AS has_role,
    EXISTS(SELECT 1 FROM public.businesses b WHERE b.user_id = u.id) AS has_business,
    (u.email ILIKE '%@phone.qitaat.local' OR u.email ILIKE '%@test.%') AS synthetic_or_test,
    CASE
      WHEN p.user_id IS NULL THEN 'create_profile'
      WHEN u.email IS NOT NULL AND u.email NOT ILIKE '%@phone.qitaat.local'
        AND (p.email IS NULL OR lower(p.email) <> lower(u.email)) THEN 'sync_profile_email_from_auth'
      ELSE 'none'
    END AS recommended_action
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY mismatch_type DESC, u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_identity_integrity_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_identity_integrity_report() TO authenticated;

-- 3) Availability check (used during edits to pre-validate uniqueness)
CREATE OR REPLACE FUNCTION public.admin_check_identity_availability(
  _email text DEFAULT NULL,
  _username text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _exclude_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_taken boolean := false;
  username_taken boolean := false;
  phone_taken boolean := false;
  auth_email_taken boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required';
  END IF;

  IF _email IS NOT NULL AND _email <> '' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE lower(email) = lower(_email)
        AND (_exclude_user_id IS NULL OR user_id <> _exclude_user_id)
    ) INTO email_taken;

    SELECT EXISTS(
      SELECT 1 FROM auth.users
      WHERE lower(email) = lower(_email)
        AND (_exclude_user_id IS NULL OR id <> _exclude_user_id)
    ) INTO auth_email_taken;
  END IF;

  IF _username IS NOT NULL AND _username <> '' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE lower(username) = lower(_username)
        AND (_exclude_user_id IS NULL OR user_id <> _exclude_user_id)
    ) INTO username_taken;
  END IF;

  IF _phone IS NOT NULL AND _phone <> '' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.profiles
      WHERE phone = _phone
        AND (_exclude_user_id IS NULL OR user_id <> _exclude_user_id)
    ) INTO phone_taken;
  END IF;

  RETURN jsonb_build_object(
    'email_taken', email_taken,
    'auth_email_taken', auth_email_taken,
    'username_taken', username_taken,
    'phone_taken', phone_taken,
    'available', (NOT email_taken AND NOT auth_email_taken AND NOT username_taken AND NOT phone_taken)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_check_identity_availability(text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_check_identity_availability(text,text,text,uuid) TO authenticated;

-- 4) Normalize profile email (lowercase/trim) and sync from auth.users when mismatched
CREATE OR REPLACE FUNCTION public.admin_sync_profile_email_from_auth(_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_email text;
  v_old_profile_email text;
  v_new_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden: super_admin required';
  END IF;

  SELECT email INTO v_auth_email FROM auth.users WHERE id = _target_user_id;
  IF v_auth_email IS NULL OR v_auth_email = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_auth_email');
  END IF;

  IF v_auth_email ILIKE '%@phone.qitaat.local' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'synthetic_auth_email');
  END IF;

  v_new_email := lower(trim(v_auth_email));

  SELECT email INTO v_old_profile_email FROM public.profiles WHERE user_id = _target_user_id;

  -- Guard against duplicating onto another profile
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(email) = v_new_email AND user_id <> _target_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'duplicate_email_on_other_profile');
  END IF;

  UPDATE public.profiles
     SET email = v_new_email, updated_at = now()
   WHERE user_id = _target_user_id;

  INSERT INTO public.admin_activity_log(actor_id, action, target_user_id, metadata)
  VALUES (
    auth.uid(),
    'identity.sync_profile_email_from_auth',
    _target_user_id,
    jsonb_build_object('old', v_old_profile_email, 'new', v_new_email)
  );

  RETURN jsonb_build_object('success', true, 'old', v_old_profile_email, 'new', v_new_email);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_sync_profile_email_from_auth(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_sync_profile_email_from_auth(uuid) TO authenticated;
