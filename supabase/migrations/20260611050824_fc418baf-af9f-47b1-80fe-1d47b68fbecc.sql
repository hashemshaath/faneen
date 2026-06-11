DROP FUNCTION IF EXISTS public.get_claimable_business(uuid);

CREATE OR REPLACE FUNCTION public.get_claimable_business(p_business_id uuid)
RETURNS TABLE(
  id uuid,
  ref_id text,
  username text,
  name_ar text,
  name_en text,
  logo_url text,
  region text,
  sectors jsonb,
  placeholder_owner boolean,
  pending_claims_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    b.id,
    b.ref_id,
    b.username,
    b.name_ar,
    b.name_en,
    b.logo_url,
    b.region,
    COALESCE(
      (
        SELECT jsonb_agg(DISTINCT tc.slug)
        FROM public.business_taxonomy_categories btc
        JOIN public.taxonomy_categories tc ON tc.id = btc.category_id
        WHERE btc.business_id = b.id
      ),
      '[]'::jsonb
    ) AS sectors,
    b.placeholder_owner,
    (
      SELECT count(*)
      FROM public.business_ownership_transfer_requests r
      WHERE r.business_id = b.id AND r.status = 'pending'
    ) AS pending_claims_count
  FROM public.businesses b
  WHERE b.id = p_business_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_claimable_business(uuid) TO anon, authenticated;