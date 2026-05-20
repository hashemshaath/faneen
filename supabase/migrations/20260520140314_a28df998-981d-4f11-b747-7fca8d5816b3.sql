
-- ============================================================
-- Client Sites Phase 2.3 — Safe site_ref + QR token RPCs
-- ============================================================

-- 1. Audit table (no PII, no raw tokens)
CREATE TABLE IF NOT EXISTS public.client_site_lookup_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_type  text NOT NULL CHECK (lookup_type IN ('site_ref','qr_token')),
  user_id      uuid,
  site_ref     text,
  site_id      uuid,
  found        boolean NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csla_user_created
  ON public.client_site_lookup_audit (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_csla_type_created
  ON public.client_site_lookup_audit (lookup_type, created_at DESC);

ALTER TABLE public.client_site_lookup_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can read this audit; inserts happen via SECURITY DEFINER RPCs.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_site_lookup_audit' AND policyname='csla_admin_select') THEN
    CREATE POLICY csla_admin_select ON public.client_site_lookup_audit
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
  END IF;
END $$;

-- 2. QR token hashing helper (internal)
CREATE OR REPLACE FUNCTION public.hash_site_qr_token(_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT encode(extensions.digest(_token, 'sha256'), 'hex');
$$;

REVOKE EXECUTE ON FUNCTION public.hash_site_qr_token(text) FROM PUBLIC, anon, authenticated;

-- 3. search_site_by_ref — authenticated, exact match only
CREATE OR REPLACE FUNCTION public.search_site_by_ref(_site_ref text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_norm   text;
  v_row    public.client_sites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  v_norm := upper(btrim(coalesce(_site_ref,'')));
  IF v_norm = '' THEN
    RETURN NULL;
  END IF;

  -- Format guard: exact, never LIKE.
  IF v_norm !~ '^STE-[0-9]{4}-[0-9]{6}$' THEN
    INSERT INTO public.client_site_lookup_audit (lookup_type, user_id, site_ref, found)
      VALUES ('site_ref', v_uid, v_norm, false);
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
    FROM public.client_sites
   WHERE site_ref = v_norm
     AND archived_at IS NULL
   LIMIT 1;

  INSERT INTO public.client_site_lookup_audit (lookup_type, user_id, site_ref, site_id, found)
    VALUES ('site_ref', v_uid, v_norm, v_row.id, v_row.id IS NOT NULL);

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'site_ref',   v_row.site_ref,
    'site_name',  v_row.site_name,
    'site_type',  v_row.site_type,
    'city_name',  v_row.city_name,
    'visibility', v_row.visibility,
    'status',     'available'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_site_by_ref(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.search_site_by_ref(text) TO authenticated;

-- 4. get_public_site_by_token — anon allowed, hashed lookup, increments scan counters
CREATE OR REPLACE FUNCTION public.get_public_site_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_hash  text;
  v_row   public.client_sites%ROWTYPE;
BEGIN
  IF _token IS NULL OR length(btrim(_token)) = 0 THEN
    RETURN NULL;
  END IF;

  v_hash := encode(extensions.digest(btrim(_token), 'sha256'), 'hex');

  SELECT * INTO v_row
    FROM public.client_sites
   WHERE qr_token_hash = v_hash
     AND qr_enabled    = true
     AND qr_revoked_at IS NULL
     AND archived_at   IS NULL
     AND visibility    IN ('shared_by_qr','public_limited')
   LIMIT 1;

  INSERT INTO public.client_site_lookup_audit (lookup_type, user_id, site_id, found)
    VALUES ('qr_token', v_uid, v_row.id, v_row.id IS NOT NULL);

  IF v_row.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.client_sites
     SET scan_count      = scan_count + 1,
         last_scanned_at = now()
   WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'site_ref',   v_row.site_ref,
    'site_name',  v_row.site_name,
    'site_type',  v_row.site_type,
    'city_name',  v_row.city_name,
    'visibility', v_row.visibility,
    'status',     'available'
  );
END;
$$;

-- QR scanning is intentionally public-facing: a printed QR sticker must work
-- before the scanner signs in. Output is restricted to a non-sensitive summary,
-- and visibility gating + qr_enabled/qr_revoked_at provide opt-in control.
REVOKE EXECUTE ON FUNCTION public.get_public_site_by_token(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_public_site_by_token(text) TO anon, authenticated;
