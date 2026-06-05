-- Auto-activate username + verification when admin approves a business.
-- Root cause: admin_update_business_approval set approval_status=published
-- and is_active=true but left username_status='pending', which kept the
-- public profile URL (/<username>) gated. We now flip username_status to
-- 'approved' (unless explicitly 'rejected') and is_verified=true in the
-- same transaction so the profile page activates immediately on approval.

CREATE OR REPLACE FUNCTION public.admin_update_business_approval(
  _business_id uuid,
  _new_status public.business_approval_status,
  _notes text DEFAULT NULL::text
) RETURNS public.business_approval_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_status public.business_approval_status;
  _effective_status public.business_approval_status;
  _old_username_status public.username_status;
  _new_username_status public.username_status;
  _username text;
  _username_auto_approved boolean := false;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT approval_status, username_status, username
    INTO _old_status, _old_username_status, _username
  FROM public.businesses
  WHERE id = _business_id;

  IF _old_status IS NULL THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  _effective_status := CASE
    WHEN _new_status = 'approved'::public.business_approval_status THEN 'published'::public.business_approval_status
    ELSE _new_status
  END;

  -- Auto-approve the username when the business becomes published, the
  -- username is present, and it wasn't explicitly rejected by the admin.
  -- A rejected username stays rejected so we never override a deliberate
  -- moderation decision.
  _new_username_status := _old_username_status;
  IF _effective_status = 'published'::public.business_approval_status
     AND coalesce(_username, '') <> ''
     AND _old_username_status IS DISTINCT FROM 'rejected'::public.username_status
  THEN
    _new_username_status := 'approved'::public.username_status;
    _username_auto_approved := _old_username_status IS DISTINCT FROM 'approved'::public.username_status;
  END IF;

  UPDATE public.businesses
  SET approval_status = _effective_status,
      approval_notes = _notes,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      is_active = CASE WHEN _effective_status = 'published'::public.business_approval_status THEN true ELSE is_active END,
      is_verified = CASE WHEN _effective_status = 'published'::public.business_approval_status THEN true ELSE is_verified END,
      username_status = _new_username_status,
      updated_at = now()
  WHERE id = _business_id;

  INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'business_approval_changed',
    'business',
    _business_id,
    jsonb_build_object(
      'old_status', _old_status,
      'requested_status', _new_status,
      'new_status', _effective_status,
      'username_auto_approved', _username_auto_approved,
      'old_username_status', _old_username_status,
      'new_username_status', _new_username_status,
      'notes', _notes
    )
  );

  RETURN _effective_status;
END;
$$;

-- Backfill: legacy approved/published businesses with a username still
-- stuck on 'pending' (e.g. constructionpower) — activate their public
-- profile now. We never touch explicitly 'rejected' ones.
UPDATE public.businesses
SET username_status = 'approved'::public.username_status,
    is_verified = true,
    updated_at = now()
WHERE approval_status IN ('approved'::public.business_approval_status,
                          'published'::public.business_approval_status)
  AND is_active = true
  AND coalesce(username, '') <> ''
  AND username_status = 'pending'::public.username_status;
