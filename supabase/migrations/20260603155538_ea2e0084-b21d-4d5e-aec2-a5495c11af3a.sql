
-- Harden get_contact_inbox_settings: require admin, mask webhook_secret for non super_admin
CREATE OR REPLACE FUNCTION public.get_contact_inbox_settings()
RETURNS public.contact_inbox_settings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row public.contact_inbox_settings;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _row FROM public.contact_inbox_settings WHERE id = 1;

  -- Mask webhook_secret unless the caller is a super_admin
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    _row.webhook_secret := NULL;
  END IF;

  RETURN _row;
END;
$$;

-- Revoke direct column SELECT on the secret from regular authenticated clients;
-- edge functions use service_role and remain unaffected.
REVOKE SELECT (webhook_secret) ON public.contact_inbox_settings FROM authenticated;
