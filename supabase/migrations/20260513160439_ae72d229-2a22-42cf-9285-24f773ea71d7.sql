CREATE OR REPLACE FUNCTION public.provider_clients_list(
  _q text DEFAULT NULL,
  _filter text DEFAULT 'all',  -- all | registered | guest | has_active | leads_only
  _limit  int  DEFAULT 50,
  _offset int  DEFAULT 0
)
RETURNS TABLE(
  client_key       text,        -- stable identifier: user_id or guest:email|phone
  user_id          uuid,
  is_guest         boolean,
  full_name        text,
  email_masked     text,
  phone_masked     text,
  ref_id           text,
  total_contracts  int,
  active_contracts int,
  total_leads      int,
  total_value      numeric,
  currency         text,
  last_interaction timestamptz,
  has_account      boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller   uuid    := auth.uid();
  v_is_admin boolean := public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'super_admin');
  v_q        text    := nullif(btrim(coalesce(_q, '')), '');
  v_q_lower  text    := lower(coalesce(v_q, ''));
  v_q_digits text    := regexp_replace(coalesce(v_q,''), '\D', '', 'g');
BEGIN
  IF v_caller IS NULL THEN RETURN; END IF;
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.owner_id = v_caller LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1 FROM public.contracts c WHERE c.provider_id = v_caller LIMIT 1
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH
    c_rows AS (
      SELECT c.id, c.client_id, c.guest_client_email, c.guest_client_phone, c.guest_client_name,
             c.status, c.total_amount, c.currency, c.created_at
      FROM public.contracts c
      WHERE v_is_admin OR c.provider_id = v_caller
    ),
    l_rows AS (
      SELECT lr.id, lr.user_id, lr.email, lr.phone, lr.name, lr.created_at
      FROM public.lead_requests lr
      JOIN public.businesses b ON b.id = lr.business_id
      WHERE v_is_admin OR b.owner_id = v_caller
    ),
    -- Build candidate keys (registered users first; guest fallback otherwise)
    keys AS (
      SELECT 'u:' || c.client_id::text AS k, c.client_id AS uid,
             NULL::text AS email_n, NULL::text AS phone_n, NULL::text AS gname,
             c.created_at AS ts, c.total_amount AS amt, c.currency AS cur,
             1 AS c_total, CASE WHEN c.status IN ('active','signed','in_progress') THEN 1 ELSE 0 END AS c_active,
             0 AS l_total
      FROM c_rows c WHERE c.client_id IS NOT NULL
      UNION ALL
      SELECT 'g:' || lower(coalesce(c.guest_client_email,'')) || '|' || regexp_replace(coalesce(c.guest_client_phone,''),'\D','','g') AS k,
             NULL::uuid, lower(c.guest_client_email), regexp_replace(coalesce(c.guest_client_phone,''),'\D','','g'), c.guest_client_name,
             c.created_at, c.total_amount, c.currency,
             1, CASE WHEN c.status IN ('active','signed','in_progress') THEN 1 ELSE 0 END, 0
      FROM c_rows c WHERE c.client_id IS NULL AND (c.guest_client_email IS NOT NULL OR c.guest_client_phone IS NOT NULL)
      UNION ALL
      SELECT 'u:' || l.user_id::text, l.user_id, NULL, NULL, NULL,
             l.created_at, NULL::numeric, NULL::text, 0, 0, 1
      FROM l_rows l WHERE l.user_id IS NOT NULL
      UNION ALL
      SELECT 'g:' || lower(coalesce(l.email,'')) || '|' || regexp_replace(coalesce(l.phone,''),'\D','','g'),
             NULL::uuid, lower(l.email), regexp_replace(coalesce(l.phone,''),'\D','','g'), l.name,
             l.created_at, NULL::numeric, NULL::text, 0, 0, 1
      FROM l_rows l WHERE l.user_id IS NULL AND (l.email IS NOT NULL OR l.phone IS NOT NULL)
    ),
    agg AS (
      SELECT k.k AS client_key,
             max(k.uid) AS uid,
             max(k.email_n) AS email_n,
             max(k.phone_n) AS phone_n,
             max(k.gname) AS gname,
             sum(k.c_total)::int AS total_contracts,
             sum(k.c_active)::int AS active_contracts,
             sum(k.l_total)::int AS total_leads,
             coalesce(sum(k.amt) FILTER (WHERE k.amt IS NOT NULL), 0) AS total_value,
             max(k.cur) AS currency,
             max(k.ts) AS last_interaction
      FROM keys k
      WHERE k.k <> 'g:|'
      GROUP BY k.k
    )
  SELECT
    a.client_key,
    a.uid AS user_id,
    (a.uid IS NULL) AS is_guest,
    coalesce(p.full_name, a.gname) AS full_name,
    CASE
      WHEN p.email IS NOT NULL THEN regexp_replace(p.email, '(^.).*(@.*$)', '\1•••\2')
      WHEN a.email_n IS NOT NULL AND a.email_n <> '' THEN regexp_replace(a.email_n, '(^.).*(@.*$)', '\1•••\2')
      ELSE NULL
    END AS email_masked,
    CASE
      WHEN p.phone IS NOT NULL THEN regexp_replace(p.phone::text, '(.{0,3}).*(.{3}$)', '\1•••\2')
      WHEN a.phone_n IS NOT NULL AND a.phone_n <> '' THEN regexp_replace(a.phone_n, '(.{0,3}).*(.{3}$)', '\1•••\2')
      ELSE NULL
    END AS phone_masked,
    p.ref_id,
    a.total_contracts,
    a.active_contracts,
    a.total_leads,
    a.total_value,
    coalesce(a.currency, 'SAR') AS currency,
    a.last_interaction,
    (a.uid IS NOT NULL) AS has_account
  FROM agg a
  LEFT JOIN public.profiles p ON p.user_id = a.uid
  WHERE
    -- filters
    (
      _filter = 'all'
      OR (_filter = 'registered' AND a.uid IS NOT NULL)
      OR (_filter = 'guest'      AND a.uid IS NULL)
      OR (_filter = 'has_active' AND a.active_contracts > 0)
      OR (_filter = 'leads_only' AND a.total_contracts = 0 AND a.total_leads > 0)
    )
    -- search
    AND (
      v_q IS NULL
      OR coalesce(p.full_name, a.gname, '') ILIKE '%' || v_q || '%'
      OR coalesce(p.email, a.email_n, '') ILIKE '%' || v_q_lower || '%'
      OR (length(v_q_digits) >= 4 AND (
            coalesce(regexp_replace(p.phone::text,'\D','','g'), a.phone_n, '') LIKE '%' || v_q_digits || '%'
         ))
      OR coalesce(p.ref_id, '') ILIKE '%' || v_q || '%'
    )
  ORDER BY a.last_interaction DESC NULLS LAST
  LIMIT greatest(_limit, 1)
  OFFSET greatest(_offset, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.provider_clients_list(text, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_clients_list(text, text, int, int) TO authenticated;