-- Normalize: treat empty strings as NULL so partial unique indexes work cleanly
UPDATE public.businesses SET national_id = NULL WHERE national_id = '';
UPDATE public.businesses SET unified_number = NULL WHERE unified_number = '';
UPDATE public.businesses SET vat_number = NULL WHERE vat_number = '';

-- Unique partial indexes (case-insensitive, trimmed). Skip NULL/empty values.
CREATE UNIQUE INDEX IF NOT EXISTS businesses_national_id_unique_idx
  ON public.businesses (lower(btrim(national_id)))
  WHERE national_id IS NOT NULL AND btrim(national_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS businesses_unified_number_unique_idx
  ON public.businesses (lower(btrim(unified_number)))
  WHERE unified_number IS NOT NULL AND btrim(unified_number) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS businesses_vat_number_unique_idx
  ON public.businesses (lower(btrim(vat_number)))
  WHERE vat_number IS NOT NULL AND btrim(vat_number) <> '';

-- Helper RPC: returns rows in `businesses` that already use any of the supplied
-- legal identifiers (excluding the caller's own business). Used by the business
-- edit screen to warn before saving a duplicate CR.
CREATE OR REPLACE FUNCTION public.check_business_cr_duplicates(
  _exclude_business_id uuid,
  _national_id text DEFAULT NULL,
  _unified_number text DEFAULT NULL,
  _vat_number text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  ref_id text,
  name_ar text,
  name_en text,
  field text,
  value text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.ref_id, b.name_ar, b.name_en, 'national_id'::text, b.national_id
    FROM public.businesses b
   WHERE _national_id IS NOT NULL
     AND btrim(_national_id) <> ''
     AND lower(btrim(b.national_id)) = lower(btrim(_national_id))
     AND (_exclude_business_id IS NULL OR b.id <> _exclude_business_id)
  UNION ALL
  SELECT b.id, b.ref_id, b.name_ar, b.name_en, 'unified_number'::text, b.unified_number
    FROM public.businesses b
   WHERE _unified_number IS NOT NULL
     AND btrim(_unified_number) <> ''
     AND lower(btrim(b.unified_number)) = lower(btrim(_unified_number))
     AND (_exclude_business_id IS NULL OR b.id <> _exclude_business_id)
  UNION ALL
  SELECT b.id, b.ref_id, b.name_ar, b.name_en, 'vat_number'::text, b.vat_number
    FROM public.businesses b
   WHERE _vat_number IS NOT NULL
     AND btrim(_vat_number) <> ''
     AND lower(btrim(b.vat_number)) = lower(btrim(_vat_number))
     AND (_exclude_business_id IS NULL OR b.id <> _exclude_business_id);
$$;

GRANT EXECUTE ON FUNCTION public.check_business_cr_duplicates(uuid, text, text, text) TO authenticated, service_role;