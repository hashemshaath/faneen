-- ─────────────────────────────────────────────────────────────────────────────
-- BARCODE-REGISTRY-TRANSFER-AUDIT-1
-- Admin-only RPC that returns the transfer trail for a single barcode,
-- enriched with safe (masked) user labels for from/to/actor.
-- Reads only barcode_events (event_type='transferred') + public.profiles.
-- Never touches auth.users. Same masking rules as admin_search_users_for_transfer.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_barcode_transfer_trail(
  _barcode_id uuid
)
RETURNS TABLE (
  event_id            uuid,
  barcode_id          uuid,
  created_at          timestamptz,
  action              text,
  reason              text,
  actor_user_id       uuid,
  actor_ref_id        text,
  actor_display_name  text,
  from_user_id        uuid,
  from_ref_id         text,
  from_display_name   text,
  from_masked_email   text,
  from_phone_hint     text,
  to_user_id          uuid,
  to_ref_id           text,
  to_display_name     text,
  to_masked_email     text,
  to_phone_hint       text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _barcode_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH evt AS (
    SELECT
      e.id            AS event_id,
      e.barcode_id    AS barcode_id,
      e.created_at    AS created_at,
      e.event_type    AS action,
      e.actor_user_id AS actor_user_id,
      NULLIF(btrim(COALESCE(e.metadata->>'reason', '')), '') AS reason,
      NULLIF(e.metadata->>'from_user_id','')::uuid           AS from_user_id,
      NULLIF(e.metadata->>'to_user_id','')::uuid             AS to_user_id
    FROM public.barcode_events e
    WHERE e.barcode_id = _barcode_id
      AND e.event_type = 'transferred'
  )
  SELECT
    evt.event_id,
    evt.barcode_id,
    evt.created_at,
    evt.action,
    evt.reason,

    evt.actor_user_id,
    pa.ref_id AS actor_ref_id,
    COALESCE(NULLIF(btrim(pa.full_name), ''), pa.ref_id, 'Admin') AS actor_display_name,

    evt.from_user_id,
    pf.ref_id AS from_ref_id,
    COALESCE(NULLIF(btrim(pf.full_name), ''), pf.ref_id, 'User') AS from_display_name,
    CASE
      WHEN pf.email IS NULL OR btrim(pf.email) = '' THEN NULL
      WHEN pf.email ILIKE '%@phone.qitaat.local' THEN NULL
      WHEN position('@' IN pf.email) < 2 THEN NULL
      ELSE substr(pf.email, 1, 1) || '***@' || split_part(pf.email, '@', 2)
    END AS from_masked_email,
    CASE
      WHEN pf.phone IS NULL OR char_length(btrim(pf.phone)) < 6 THEN NULL
      ELSE substr(btrim(pf.phone), 1, GREATEST(char_length(btrim(pf.phone)) - 8, 1))
           || '*****' || right(btrim(pf.phone), 4)
    END AS from_phone_hint,

    evt.to_user_id,
    pt.ref_id AS to_ref_id,
    COALESCE(NULLIF(btrim(pt.full_name), ''), pt.ref_id, 'User') AS to_display_name,
    CASE
      WHEN pt.email IS NULL OR btrim(pt.email) = '' THEN NULL
      WHEN pt.email ILIKE '%@phone.qitaat.local' THEN NULL
      WHEN position('@' IN pt.email) < 2 THEN NULL
      ELSE substr(pt.email, 1, 1) || '***@' || split_part(pt.email, '@', 2)
    END AS to_masked_email,
    CASE
      WHEN pt.phone IS NULL OR char_length(btrim(pt.phone)) < 6 THEN NULL
      ELSE substr(btrim(pt.phone), 1, GREATEST(char_length(btrim(pt.phone)) - 8, 1))
           || '*****' || right(btrim(pt.phone), 4)
    END AS to_phone_hint
  FROM evt
  LEFT JOIN public.profiles pa ON pa.user_id = evt.actor_user_id
  LEFT JOIN public.profiles pf ON pf.user_id = evt.from_user_id
  LEFT JOIN public.profiles pt ON pt.user_id = evt.to_user_id
  ORDER BY evt.created_at DESC;
END
$$;

REVOKE ALL ON FUNCTION public.admin_get_barcode_transfer_trail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_barcode_transfer_trail(uuid) TO authenticated;