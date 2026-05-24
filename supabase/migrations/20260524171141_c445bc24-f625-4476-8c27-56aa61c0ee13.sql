-- businesses: drop table-wide SELECT for anon, grant only non-PII columns
REVOKE SELECT ON public.businesses FROM anon;
GRANT SELECT (
  id, user_id, username, name_ar, name_en, description_ar, description_en,
  logo_url, cover_url, website, country_id, city_id, address, latitude, longitude,
  category_id, membership_tier, is_verified, is_active, rating_avg, rating_count,
  created_at, updated_at, business_number, ref_id, additional_number, region, district,
  street_name, building_number, short_description_ar, short_description_en,
  unified_number, approval_status, submitted_at, reviewed_at, username_status,
  onboarding_completion, sectors, sub_services, is_demo,
  region_en, district_en, street_name_en, address_en,
  account_manager_name, account_manager_position, last_active_at
) ON public.businesses TO anon;

-- business_branches: drop table-wide SELECT for anon, grant only non-PII columns
REVOKE SELECT ON public.business_branches FROM anon;
GRANT SELECT (
  id, business_id, name_ar, name_en, is_main, is_active, sort_order,
  unified_number, website, country_id, city_id, region, district, street_name,
  building_number, additional_number, address, latitude, longitude,
  created_at, updated_at, is_demo
) ON public.business_branches TO anon;