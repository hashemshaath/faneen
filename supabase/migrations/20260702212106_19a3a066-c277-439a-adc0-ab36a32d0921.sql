
-- SECURITY HARDENING PASS 2 (item 1 completion — client_sites)

-- 1) Masked view for manager-level reads. SECURITY INVOKER so the caller's
--    own RLS + column grants apply. Excludes: owner_id_number, tax_number,
--    title_deed_no, municipal_license_no, qr_token_hash.
DROP VIEW IF EXISTS public.client_sites_manager_view CASCADE;
CREATE VIEW public.client_sites_manager_view
  WITH (security_invoker = true)
AS
  SELECT
    id, business_id, client_user_id, owner_user_id, created_by,
    site_ref, ref_id, legacy_ref_id, label, site_name, site_type, visibility,
    contact_name, contact_phone,
    country_id, city_id, city_name,
    region, region_en, district, district_en, street_name, street_name_en,
    building_number, additional_number, post_code, short_address, address_en,
    address_line1, address_line2, map_url, latitude, longitude, access_notes,
    is_default, is_demo, archived_at, created_at, updated_at,
    -- government/legal fields kept in view EXCLUDING deed/license numbers:
    municipal_license_issue_date, municipal_license_expiry_date,
    title_deed_date, owner_name, land_use_type,
    plot_number, block_number, plan_number, government_notes,
    -- QR fields except the hash:
    qr_enabled, qr_revoked_at, last_scanned_at, scan_count,
    cover_image_url, gallery_images
  FROM public.client_sites;

GRANT SELECT ON public.client_sites_manager_view TO authenticated;

-- 2) Revoke the remaining sensitive columns from client roles. owner_id_number
--    and tax_number were already revoked in pass 1.
REVOKE SELECT (title_deed_no, municipal_license_no, qr_token_hash)
  ON public.client_sites FROM authenticated, anon;

GRANT SELECT (title_deed_no, municipal_license_no, qr_token_hash)
  ON public.client_sites TO service_role;

-- 3) SECURITY DEFINER RPC returning government/legal fields to owner + admin
--    only. Mirrors the existing get_client_site_sensitive pattern.
CREATE OR REPLACE FUNCTION public.get_client_site_government_data(_site_id uuid)
RETURNS TABLE (
  municipal_license_no          text,
  municipal_license_issue_date  date,
  municipal_license_expiry_date date,
  title_deed_no                 text,
  title_deed_date               date,
  owner_name                    text,
  land_use_type                 text,
  plot_number                   text,
  block_number                  text,
  plan_number                   text,
  government_notes              text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_user_id uuid;
  v_business_id    uuid;
BEGIN
  SELECT cs.client_user_id, cs.business_id
    INTO v_client_user_id, v_business_id
    FROM public.client_sites cs
   WHERE cs.id = _site_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF auth.uid() = v_client_user_id
     OR (v_business_id IS NOT NULL AND public.is_business_owner(auth.uid(), v_business_id))
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN QUERY
      SELECT cs.municipal_license_no, cs.municipal_license_issue_date,
             cs.municipal_license_expiry_date,
             cs.title_deed_no, cs.title_deed_date, cs.owner_name,
             cs.land_use_type, cs.plot_number, cs.block_number,
             cs.plan_number, cs.government_notes
        FROM public.client_sites cs
       WHERE cs.id = _site_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
END;
$function$;

REVOKE ALL ON FUNCTION public.get_client_site_government_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_site_government_data(uuid) TO authenticated, service_role;
