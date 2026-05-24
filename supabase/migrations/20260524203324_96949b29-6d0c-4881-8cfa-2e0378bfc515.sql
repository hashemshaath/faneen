-- ─────────────────────────────────────────────────────────────────────────────
-- BARCODE-REGISTRY-USER-PICKER-1
-- Admin-only safe user search to power the barcode transfer target picker.
-- Returns only minimal, masked fields. Never touches auth.users.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_search_users_for_transfer(
  _query text,
  _limit int DEFAULT 10
)
RETURNS TABLE (
  user_id       uuid,
  ref_id        text,
  display_name  text,
  masked_email  text,
  phone_hint    text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_q   text;
  v_lim int;
  v_pat text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_q   := btrim(COALESCE(_query, ''));
  v_lim := LEAST(GREATEST(COALESCE(_limit, 10), 1), 20);

  -- Minimum query length guard (2 chars) — return empty set otherwise.
  IF char_length(v_q) < 2 THEN
    RETURN;
  END IF;

  v_pat := '%' || v_q || '%';

  RETURN QUERY
  SELECT
    p.user_id,
    p.ref_id,
    -- display_name: full_name → ref_id → "User"
    COALESCE(NULLIF(btrim(p.full_name), ''), p.ref_id, 'User') AS display_name,
    -- masked_email: h***@domain.com, hide synthetic phone-domain placeholders
    CASE
      WHEN p.email IS NULL THEN NULL
      WHEN btrim(p.email) = '' THEN NULL
      WHEN p.email ILIKE '%@phone.qitaat.local' THEN NULL
      WHEN position('@' IN p.email) < 2 THEN NULL
      ELSE substr(p.email, 1, 1)
           || '***@'
           || split_part(p.email, '@', 2)
    END AS masked_email,
    -- phone_hint: keep country prefix + last 4 digits, mask the middle
    CASE
      WHEN p.phone IS NULL THEN NULL
      WHEN char_length(btrim(p.phone)) < 6 THEN NULL
      ELSE substr(btrim(p.phone), 1, GREATEST(char_length(btrim(p.phone)) - 8, 1))
           || '*****'
           || right(btrim(p.phone), 4)
    END AS phone_hint
  FROM public.profiles p
  WHERE
    p.ref_id ILIKE v_pat
    OR p.full_name ILIKE v_pat
    OR (p.email IS NOT NULL
        AND p.email NOT ILIKE '%@phone.qitaat.local'
        AND p.email ILIKE v_pat)
    OR p.phone ILIKE v_pat
  ORDER BY p.created_at DESC
  LIMIT v_lim;
END
$$;

REVOKE ALL ON FUNCTION public.admin_search_users_for_transfer(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_search_users_for_transfer(text, int) TO authenticated;