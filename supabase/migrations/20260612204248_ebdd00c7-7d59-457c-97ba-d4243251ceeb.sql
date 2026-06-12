-- Secure full-row fetchers so owner/admin can read the entire businesses row
-- (incl. sensitive cols) without hitting column-level GRANT restrictions on
-- PostgREST's direct table API.

CREATE OR REPLACE FUNCTION public.get_owner_business_full(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF v_uid <> p_user_id AND NOT public.has_admin_access(v_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(b.*) INTO v_row
    FROM public.businesses b
   WHERE b.user_id = p_user_id
   ORDER BY b.created_at DESC
   LIMIT 1;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_business_full(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_business_full(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_business_full_by_id(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.user_id = v_uid)
    OR public.has_admin_access(v_uid)
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(b.*) INTO v_row
    FROM public.businesses b
   WHERE b.id = p_business_id;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_full_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_full_by_id(uuid) TO authenticated;