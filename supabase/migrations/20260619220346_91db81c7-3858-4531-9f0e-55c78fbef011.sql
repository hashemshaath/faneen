
-- Add missing professional fields to provider intake (leads + branches)
ALTER TABLE public.provider_leads
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS street_name text,
  ADD COLUMN IF NOT EXISTS building_number text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS short_national_address text,
  ADD COLUMN IF NOT EXISTS full_address text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS establishment_year int,
  ADD COLUMN IF NOT EXISTS account_manager_name text,
  ADD COLUMN IF NOT EXISTS account_manager_phone text,
  ADD COLUMN IF NOT EXISTS account_manager_email text;

ALTER TABLE public.provider_lead_branches
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS street_name text,
  ADD COLUMN IF NOT EXISTS building_number text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS short_national_address text,
  ADD COLUMN IF NOT EXISTS national_address text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS is_main boolean DEFAULT false;

-- Replace submit RPC to persist all the new optional fields.
CREATE OR REPLACE FUNCTION public.submit_provider_lead(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_lead_id uuid;
  v_ref text;
  v_email text;
  v_phone text;
  v_phone_norm text;
  v_cr text;
  v_unified text;
  v_ip_hash text;
  v_branch jsonb;
  v_recent_count int;
BEGIN
  v_email := lower(trim(coalesce(payload->>'email','')));
  v_phone := trim(coalesce(payload->>'phone',''));
  v_phone_norm := regexp_replace(v_phone, '\D', '', 'g');
  v_cr := nullif(trim(coalesce(payload->>'cr_number','')), '');
  v_unified := nullif(trim(coalesce(payload->>'unified_number','')), '');
  v_ip_hash := nullif(trim(coalesce(payload->>'ip_hash','')), '');

  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_phone_norm) < 7 OR char_length(v_phone_norm) > 15 THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = '22023';
  END IF;

  IF v_ip_hash IS NOT NULL THEN
    SELECT count(*) INTO v_recent_count
    FROM public.provider_leads
    WHERE submitted_ip_hash = v_ip_hash
      AND created_at > now() - interval '1 hour';
    IF v_recent_count >= 5 THEN
      RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.provider_leads
    WHERE status IN ('new','under_review','needs_info')
      AND (
        lower(email) = v_email
        OR regexp_replace(phone, '\D', '', 'g') = v_phone_norm
        OR (v_cr IS NOT NULL AND cr_number = v_cr)
        OR (v_unified IS NOT NULL AND unified_number = v_unified)
      )
  ) THEN
    RAISE EXCEPTION 'duplicate_request' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.provider_leads (
    name_ar, name_en, contact_name, email, phone, whatsapp, preferred_channel,
    website, cr_number, unified_number, vat_number, main_activity,
    specialties, brands, brief, cr_file_path, map_link,
    national_address, short_national_address, full_address,
    region, city, district, street_name, building_number, postal_code,
    latitude, longitude, establishment_year,
    account_manager_name, account_manager_phone, account_manager_email,
    branches_count, submitted_ip_hash, user_agent
  ) VALUES (
    trim(payload->>'name_ar'),
    nullif(trim(coalesce(payload->>'name_en','')), ''),
    trim(payload->>'contact_name'),
    v_email,
    v_phone,
    nullif(trim(coalesce(payload->>'whatsapp','')), ''),
    coalesce((payload->>'preferred_channel')::public.provider_lead_channel, 'phone'),
    nullif(trim(coalesce(payload->>'website','')), ''),
    v_cr,
    v_unified,
    nullif(trim(coalesce(payload->>'vat_number','')), ''),
    nullif(trim(coalesce(payload->>'main_activity','')), ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'specialties')), '{}'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'brands')), '{}'),
    nullif(trim(coalesce(payload->>'brief','')), ''),
    nullif(trim(coalesce(payload->>'cr_file_path','')), ''),
    nullif(trim(coalesce(payload->>'map_link','')), ''),
    nullif(trim(coalesce(payload->>'national_address','')), ''),
    nullif(trim(coalesce(payload->>'short_national_address','')), ''),
    nullif(trim(coalesce(payload->>'full_address','')), ''),
    nullif(trim(coalesce(payload->>'region','')), ''),
    nullif(trim(coalesce(payload->>'city','')), ''),
    nullif(trim(coalesce(payload->>'district','')), ''),
    nullif(trim(coalesce(payload->>'street_name','')), ''),
    nullif(trim(coalesce(payload->>'building_number','')), ''),
    nullif(trim(coalesce(payload->>'postal_code','')), ''),
    nullif(payload->>'latitude','')::numeric,
    nullif(payload->>'longitude','')::numeric,
    nullif(payload->>'establishment_year','')::int,
    nullif(trim(coalesce(payload->>'account_manager_name','')), ''),
    nullif(trim(coalesce(payload->>'account_manager_phone','')), ''),
    nullif(trim(coalesce(payload->>'account_manager_email','')), ''),
    greatest(1, coalesce((payload->>'branches_count')::int, 1)),
    v_ip_hash,
    nullif(trim(coalesce(payload->>'user_agent','')), '')
  )
  RETURNING id, reference_code INTO v_lead_id, v_ref;

  IF jsonb_typeof(payload->'branches') = 'array' THEN
    FOR v_branch IN SELECT * FROM jsonb_array_elements(payload->'branches') LOOP
      IF coalesce(trim(v_branch->>'branch_name'), '') <> '' THEN
        INSERT INTO public.provider_lead_branches (
          lead_id, branch_name, city, address, map_link, phone,
          whatsapp, email, website,
          region, district, street_name, building_number, postal_code,
          short_national_address, national_address,
          latitude, longitude, is_main
        ) VALUES (
          v_lead_id,
          left(trim(v_branch->>'branch_name'), 200),
          nullif(trim(coalesce(v_branch->>'city','')), ''),
          nullif(trim(coalesce(v_branch->>'address','')), ''),
          nullif(trim(coalesce(v_branch->>'map_link','')), ''),
          nullif(trim(coalesce(v_branch->>'phone','')), ''),
          nullif(trim(coalesce(v_branch->>'whatsapp','')), ''),
          nullif(trim(coalesce(v_branch->>'email','')), ''),
          nullif(trim(coalesce(v_branch->>'website','')), ''),
          nullif(trim(coalesce(v_branch->>'region','')), ''),
          nullif(trim(coalesce(v_branch->>'district','')), ''),
          nullif(trim(coalesce(v_branch->>'street_name','')), ''),
          nullif(trim(coalesce(v_branch->>'building_number','')), ''),
          nullif(trim(coalesce(v_branch->>'postal_code','')), ''),
          nullif(trim(coalesce(v_branch->>'short_national_address','')), ''),
          nullif(trim(coalesce(v_branch->>'national_address','')), ''),
          nullif(v_branch->>'latitude','')::numeric,
          nullif(v_branch->>'longitude','')::numeric,
          coalesce((v_branch->>'is_main')::boolean, false)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('lead_id', v_lead_id, 'reference_code', v_ref);
END $function$;
