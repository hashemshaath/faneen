
ALTER TABLE public.contracts ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS guest_client_name  text,
  ADD COLUMN IF NOT EXISTS guest_client_email text,
  ADD COLUMN IF NOT EXISTS guest_client_phone text;

CREATE INDEX IF NOT EXISTS idx_contracts_guest_email_lower
  ON public.contracts (lower(guest_client_email))
  WHERE guest_client_email IS NOT NULL AND client_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_guest_phone
  ON public.contracts (regexp_replace(guest_client_phone, '\D', '', 'g'))
  WHERE guest_client_phone IS NOT NULL AND client_id IS NULL;

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_client_or_guest_chk;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_client_or_guest_chk
  CHECK (
    client_id IS NOT NULL
    OR (NULLIF(btrim(guest_client_email), '') IS NOT NULL
        OR NULLIF(btrim(guest_client_phone), '') IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.search_contract_clients(_q text)
RETURNS TABLE(
  user_id      uuid,
  full_name    text,
  email_masked text,
  phone_masked text,
  ref_id       text,
  account_type text,
  source       text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller   uuid    := auth.uid();
  v_is_admin boolean := public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'super_admin');
  v_q        text    := nullif(btrim(coalesce(_q, '')), '');
  v_q_lower  text;
  v_q_digits text;
  v_is_email boolean;
  v_is_phone boolean;
  v_is_ref   boolean;
BEGIN
  IF v_caller IS NULL OR v_q IS NULL OR length(v_q) < 2 THEN
    RETURN;
  END IF;
  v_q_lower  := lower(v_q);
  v_q_digits := regexp_replace(v_q, '\D', '', 'g');
  v_is_email := position('@' in v_q) > 0;
  v_is_phone := length(v_q_digits) >= 7;
  v_is_ref   := v_q ILIKE 'USR-%';

  IF v_is_admin THEN
    RETURN QUERY
      SELECT p.user_id, p.full_name,
        CASE WHEN p.email IS NULL THEN NULL ELSE regexp_replace(p.email, '(^.).*(@.*$)', '\1•••\2') END,
        CASE WHEN p.phone IS NULL THEN NULL ELSE regexp_replace(p.phone::text, '(.{0,3}).*(.{3}$)', '\1•••\2') END,
        p.ref_id, p.account_type::text, 'admin'::text
      FROM public.profiles p
      WHERE p.is_banned IS NOT TRUE
        AND (p.full_name ILIKE '%' || v_q || '%'
          OR p.email ILIKE '%' || v_q || '%'
          OR p.phone::text ILIKE '%' || v_q || '%'
          OR p.ref_id ILIKE '%' || v_q || '%')
      ORDER BY p.full_name NULLS LAST
      LIMIT 25;
    RETURN;
  END IF;

  RETURN QUERY
    WITH allowed AS (
      SELECT c.client_id AS uid FROM public.contracts c
        WHERE c.provider_id = v_caller AND c.client_id IS NOT NULL
      UNION
      SELECT lr.user_id AS uid FROM public.lead_requests lr
        JOIN public.businesses b ON b.id = lr.business_id
       WHERE b.owner_id = v_caller AND lr.user_id IS NOT NULL
    )
    SELECT p.user_id, p.full_name,
      CASE WHEN p.email IS NULL THEN NULL ELSE regexp_replace(p.email, '(^.).*(@.*$)', '\1•••\2') END,
      CASE WHEN p.phone IS NULL THEN NULL ELSE regexp_replace(p.phone::text, '(.{0,3}).*(.{3}$)', '\1•••\2') END,
      p.ref_id, p.account_type::text, 'provider'::text
    FROM allowed a
    JOIN public.profiles p ON p.user_id = a.uid
    WHERE p.is_banned IS NOT TRUE
      AND (p.full_name ILIKE '%' || v_q || '%'
        OR p.email ILIKE '%' || v_q || '%'
        OR p.phone::text ILIKE '%' || v_q || '%'
        OR p.ref_id ILIKE '%' || v_q || '%')
    ORDER BY p.full_name NULLS LAST
    LIMIT 25;

  IF v_is_email OR v_is_phone OR v_is_ref THEN
    RETURN QUERY
      SELECT p.user_id, p.full_name,
        CASE WHEN p.email IS NULL THEN NULL ELSE regexp_replace(p.email, '(^.).*(@.*$)', '\1•••\2') END,
        CASE WHEN p.phone IS NULL THEN NULL ELSE regexp_replace(p.phone::text, '(.{0,3}).*(.{3}$)', '\1•••\2') END,
        p.ref_id, p.account_type::text, 'exact_match'::text
      FROM public.profiles p
      WHERE p.is_banned IS NOT TRUE
        AND (
             (v_is_email AND lower(p.email) = v_q_lower)
          OR (v_is_phone AND regexp_replace(p.phone::text, '\D', '', 'g') = v_q_digits)
          OR (v_is_ref   AND upper(p.ref_id) = upper(v_q))
        )
        AND p.user_id NOT IN (
          SELECT c.client_id FROM public.contracts c
            WHERE c.provider_id = v_caller AND c.client_id IS NOT NULL
          UNION
          SELECT lr.user_id FROM public.lead_requests lr
            JOIN public.businesses b ON b.id = lr.business_id
           WHERE b.owner_id = v_caller AND lr.user_id IS NOT NULL
        )
      LIMIT 5;
  END IF;
END;
$function$;
