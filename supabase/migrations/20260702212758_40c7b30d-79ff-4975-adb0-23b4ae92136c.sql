
CREATE OR REPLACE FUNCTION public.get_client_site_sensitive(_site_id uuid)
RETURNS TABLE (owner_id_number text, tax_number text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_user_id uuid;
  v_business_id    uuid;
  v_exists         boolean;
BEGIN
  SELECT cs.client_user_id, cs.business_id, true
    INTO v_client_user_id, v_business_id, v_exists
    FROM public.client_sites cs
   WHERE cs.id = _site_id;

  IF NOT v_exists THEN
    RETURN;
  END IF;

  IF (v_client_user_id IS NOT NULL AND auth.uid() = v_client_user_id)
     OR (v_business_id  IS NOT NULL AND public.is_business_owner(auth.uid(), v_business_id))
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    -- Always return a row for authorized callers, even when both values
    -- are NULL, so client code can distinguish "authorized + empty" from
    -- "not authorized".
    RETURN QUERY
      SELECT cs.owner_id_number, cs.tax_number
        FROM public.client_sites cs
       WHERE cs.id = _site_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
END;
$function$;
