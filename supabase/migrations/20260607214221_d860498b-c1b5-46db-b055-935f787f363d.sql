-- Phase 2.4.1 — Business logo/cover backfill helpers (admin-only).

CREATE OR REPLACE FUNCTION public.list_business_image_backfill_candidates()
RETURNS TABLE (
  business_id uuid,
  owner_user_id uuid,
  kind text,
  image_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT b.id, b.user_id, 'logo'::text, b.logo_url
      FROM public.businesses b
     WHERE b.logo_image_asset_id IS NULL
       AND b.logo_url IS NOT NULL AND b.logo_url <> ''
    UNION ALL
    SELECT b.id, b.user_id, 'cover'::text, b.cover_url
      FROM public.businesses b
     WHERE b.cover_image_asset_id IS NULL
       AND b.cover_url IS NOT NULL AND b.cover_url <> '';
END;
$$;

REVOKE ALL ON FUNCTION public.list_business_image_backfill_candidates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_business_image_backfill_candidates() TO authenticated;

COMMENT ON FUNCTION public.list_business_image_backfill_candidates() IS
  'Phase 2.4.1 — admin-only. Lists businesses whose logo_url/cover_url still lack image_asset_id.';


CREATE OR REPLACE FUNCTION public.apply_business_image_backfill(
  p_business_id uuid,
  p_kind text,
  p_image_asset_id uuid,
  p_variants jsonb
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_kind NOT IN ('logo', 'cover') THEN
    RAISE EXCEPTION 'invalid kind: %', p_kind USING ERRCODE = '22023';
  END IF;

  IF p_kind = 'logo' THEN
    UPDATE public.businesses
       SET logo_image_asset_id = p_image_asset_id,
           logo_image_variants = p_variants
     WHERE id = p_business_id
       AND logo_image_asset_id IS NULL;  -- idempotent guard
  ELSE
    UPDATE public.businesses
       SET cover_image_asset_id = p_image_asset_id,
           cover_image_variants = p_variants
     WHERE id = p_business_id
       AND cover_image_asset_id IS NULL;  -- idempotent guard
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_business_image_backfill(uuid, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_business_image_backfill(uuid, text, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.apply_business_image_backfill(uuid, text, uuid, jsonb) IS
  'Phase 2.4.1 — admin-only. Idempotently links a backfilled image_assets row + variants to a business logo/cover. Never deletes the original *_url.';
