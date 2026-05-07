
-- Phase 4: Sectors storage + admin review RPCs

-- 1. Sector storage on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS sectors TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sub_services TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_businesses_sectors ON public.businesses USING GIN(sectors);
CREATE INDEX IF NOT EXISTS idx_businesses_approval_status ON public.businesses(approval_status);

-- 2. Admin: update approval status with notes & audit
CREATE OR REPLACE FUNCTION public.admin_update_business_approval(
  _business_id UUID,
  _new_status public.business_approval_status,
  _notes TEXT DEFAULT NULL
) RETURNS public.business_approval_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old_status public.business_approval_status;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT approval_status INTO _old_status FROM public.businesses WHERE id = _business_id;
  IF _old_status IS NULL THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  UPDATE public.businesses
    SET approval_status = _new_status,
        approval_notes  = _notes,
        reviewed_at     = now(),
        reviewed_by     = auth.uid(),
        published_at    = CASE WHEN _new_status = 'published' THEN now() ELSE published_at END
    WHERE id = _business_id;

  INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'business_approval_changed',
    'business',
    _business_id,
    jsonb_build_object(
      'old_status', _old_status,
      'new_status', _new_status,
      'notes', _notes
    )
  );

  RETURN _new_status;
END;
$$;

-- 3. Admin: approve/reject username
CREATE OR REPLACE FUNCTION public.admin_update_username_status(
  _business_id UUID,
  _new_status public.username_status,
  _notes TEXT DEFAULT NULL
) RETURNS public.username_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old_status public.username_status;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT username_status INTO _old_status FROM public.businesses WHERE id = _business_id;
  IF _old_status IS NULL THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  UPDATE public.businesses
    SET username_status = _new_status
    WHERE id = _business_id;

  INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'username_status_changed',
    'business',
    _business_id,
    jsonb_build_object(
      'old_status', _old_status,
      'new_status', _new_status,
      'notes', _notes
    )
  );

  RETURN _new_status;
END;
$$;
