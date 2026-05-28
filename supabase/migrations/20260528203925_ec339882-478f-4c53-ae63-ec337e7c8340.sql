
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

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(email) = v_new_email AND user_id <> _target_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'duplicate_email_on_other_profile');
  END IF;

  UPDATE public.profiles
     SET email = v_new_email, updated_at = now()
   WHERE user_id = _target_user_id;

  INSERT INTO public.admin_activity_log(user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'identity.sync_profile_email_from_auth',
    'profile',
    _target_user_id::text,
    jsonb_build_object('old', v_old_profile_email, 'new', v_new_email, 'target_user_id', _target_user_id)
  );

  RETURN jsonb_build_object('success', true, 'old', v_old_profile_email, 'new', v_new_email);
END;
$$;
