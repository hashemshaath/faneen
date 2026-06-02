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
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT approval_status INTO _old_status
  FROM public.businesses
  WHERE id = _business_id;

  IF _old_status IS NULL THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  _effective_status := CASE
    WHEN _new_status = 'approved'::public.business_approval_status THEN 'published'::public.business_approval_status
    ELSE _new_status
  END;

  UPDATE public.businesses
  SET approval_status = _effective_status,
      approval_notes = _notes,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      is_active = CASE WHEN _effective_status = 'published'::public.business_approval_status THEN true ELSE is_active END,
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
      'notes', _notes
    )
  );

  RETURN _effective_status;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_subscriptions_one_pending_per_business
ON public.membership_subscriptions (business_id)
WHERE status = 'pending' AND business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_subscriptions_one_active_per_business
ON public.membership_subscriptions (business_id)
WHERE status = 'active' AND business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_upgrade_requests_one_pending_per_business
ON public.membership_upgrade_requests (business_id)
WHERE status = 'pending' AND business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_access_requests_one_pending_pair
ON public.entity_access_requests (requester_user_id, target_business_id)
WHERE status = 'pending' AND target_business_id IS NOT NULL;