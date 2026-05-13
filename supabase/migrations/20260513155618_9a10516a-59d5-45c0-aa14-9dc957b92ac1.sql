-- Improve phone matching in contract client search:
-- Normalize Saudi phones (strip leading 0 or 966) and match by national 9-digit suffix
-- when the query is in local form, while still allowing exact full-digit match when
-- the country code is explicitly provided.

CREATE OR REPLACE FUNCTION public.quick_resolve_contract_client(_email text DEFAULT NULL::text, _phone text DEFAULT NULL::text)
 RETURNS TABLE(matched_user_id uuid, ref_id text, full_name text, email_masked text, phone_masked text, matched_on text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller   uuid := auth.uid();
  v_email_n  text := nullif(lower(btrim(coalesce(_email, ''))), '');
  v_phone_d  text := nullif(regexp_replace(coalesce(_phone, ''), '\D', '', 'g'), '');
  v_phone_n9 text;  -- national 9-digit form (Saudi)
  v_has_cc   boolean := false;
BEGIN
  IF v_caller IS NULL THEN RETURN; END IF;
  IF v_email_n IS NULL AND v_phone_d IS NULL THEN RETURN; END IF;

  IF v_phone_d IS NOT NULL THEN
    v_has_cc := (left(v_phone_d, 3) = '966' AND length(v_phone_d) >= 12)
             OR (length(coalesce(_phone,'')) > 0 AND left(btrim(_phone),1) = '+');
    v_phone_n9 := CASE
      WHEN left(v_phone_d, 3) = '966' THEN right(v_phone_d, length(v_phone_d) - 3)
      WHEN left(v_phone_d, 1) = '0'   THEN right(v_phone_d, length(v_phone_d) - 1)
      ELSE v_phone_d
    END;
  END IF;

  RETURN QUERY
    SELECT p.user_id, p.ref_id, p.full_name,
      CASE WHEN p.email IS NULL THEN NULL ELSE regexp_replace(p.email, '(^.).*(@.*$)', '\1•••\2') END,
      CASE WHEN p.phone IS NULL THEN NULL ELSE regexp_replace(p.phone::text, '(.{0,3}).*(.{3}$)', '\1•••\2') END,
      CASE
        WHEN v_email_n IS NOT NULL AND lower(p.email) = v_email_n THEN 'email'
        WHEN v_phone_d IS NOT NULL THEN 'phone'
      END
    FROM public.profiles p
    WHERE p.is_banned IS NOT TRUE
      AND (
        (v_email_n IS NOT NULL AND lower(p.email) = v_email_n)
        OR (
          v_phone_d IS NOT NULL AND (
            -- exact full digit match (covers same form on both sides)
            regexp_replace(p.phone::text, '\D', '', 'g') = v_phone_d
            -- if query has no country code, also match by national 9-digit suffix
            OR (NOT v_has_cc AND v_phone_n9 IS NOT NULL AND length(v_phone_n9) >= 7
                AND right(regexp_replace(p.phone::text, '\D', '', 'g'), length(v_phone_n9)) = v_phone_n9)
            -- and match where stored uses 966/0 prefix variants
            OR (NOT v_has_cc AND v_phone_n9 IS NOT NULL
                AND regexp_replace(p.phone::text, '\D', '', 'g') = '966' || v_phone_n9)
          )
        )
      )
    LIMIT 1;
END;
$function$;


CREATE OR REPLACE FUNCTION public.search_contract_clients(_q text)
 RETURNS TABLE(user_id uuid, full_name text, email_masked text, phone_masked text, ref_id text, account_type text, source text)
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
  v_q_n9     text;     -- national 9-digit form
  v_has_cc   boolean := false;
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

  IF v_is_phone THEN
    v_has_cc := (left(v_q_digits, 3) = '966' AND length(v_q_digits) >= 12)
             OR left(v_q, 1) = '+';
    v_q_n9 := CASE
      WHEN left(v_q_digits, 3) = '966' THEN right(v_q_digits, length(v_q_digits) - 3)
      WHEN left(v_q_digits, 1) = '0'   THEN right(v_q_digits, length(v_q_digits) - 1)
      ELSE v_q_digits
    END;
  END IF;

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
          OR p.ref_id ILIKE '%' || v_q || '%'
          OR (v_is_phone AND v_q_n9 IS NOT NULL AND length(v_q_n9) >= 7
              AND right(regexp_replace(p.phone::text, '\D', '', 'g'), length(v_q_n9)) = v_q_n9))
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
        OR p.ref_id ILIKE '%' || v_q || '%'
        OR (v_is_phone AND v_q_n9 IS NOT NULL AND length(v_q_n9) >= 7
            AND right(regexp_replace(p.phone::text, '\D', '', 'g'), length(v_q_n9)) = v_q_n9))
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
          OR (v_is_phone AND (
                regexp_replace(p.phone::text, '\D', '', 'g') = v_q_digits
                OR (NOT v_has_cc AND v_q_n9 IS NOT NULL AND length(v_q_n9) >= 7
                    AND right(regexp_replace(p.phone::text, '\D', '', 'g'), length(v_q_n9)) = v_q_n9)
                OR (NOT v_has_cc AND v_q_n9 IS NOT NULL
                    AND regexp_replace(p.phone::text, '\D', '', 'g') = '966' || v_q_n9)
             ))
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