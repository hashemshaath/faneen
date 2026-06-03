-- ============================================================================
-- PROVIDER-LEAD self-service lookup & edit
-- ============================================================================

-- 1) Lookup: returns lead + branches as jsonb when reference_code + credential
--    (email OR phone) match, and the lead is still in an editable status.
CREATE OR REPLACE FUNCTION public.lookup_provider_lead(
  p_reference text,
  p_credential text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref       text := upper(trim(coalesce(p_reference, '')));
  v_cred      text := lower(trim(coalesce(p_credential, '')));
  v_cred_norm text := regexp_replace(coalesce(p_credential, ''), '\D', '', 'g');
  v_row       public.provider_leads;
  v_branches  jsonb;
BEGIN
  IF v_ref = '' OR coalesce(p_credential, '') = '' THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row
    FROM public.provider_leads
   WHERE reference_code = v_ref
     AND status IN ('new','under_review','needs_info')
     AND (
       lower(email) = v_cred
       OR (v_cred_norm <> '' AND regexp_replace(phone, '\D', '', 'g') = v_cred_norm)
     )
   LIMIT 1;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'not_found_or_locked' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'branch_name', b.branch_name,
            'city',        b.city,
            'address',     b.address,
            'map_link',    b.map_link,
            'phone',       b.phone
         ) ORDER BY b.created_at), '[]'::jsonb)
    INTO v_branches
    FROM public.provider_lead_branches b
   WHERE b.lead_id = v_row.id;

  RETURN jsonb_build_object(
    'id',                v_row.id,
    'reference_code',    v_row.reference_code,
    'name_ar',           v_row.name_ar,
    'name_en',           v_row.name_en,
    'contact_name',      v_row.contact_name,
    'email',             v_row.email,
    'phone',             v_row.phone,
    'preferred_channel', v_row.preferred_channel,
    'website',           v_row.website,
    'cr_number',         v_row.cr_number,
    'unified_number',    v_row.unified_number,
    'vat_number',        v_row.vat_number,
    'main_activity',     v_row.main_activity,
    'specialties',       to_jsonb(v_row.specialties),
    'brands',            to_jsonb(v_row.brands),
    'brief',             v_row.brief,
    'cr_file_path',      v_row.cr_file_path,
    'map_link',          v_row.map_link,
    'national_address',  v_row.national_address,
    'city',              v_row.city,
    'branches_count',    v_row.branches_count,
    'status',            v_row.status,
    'created_at',        v_row.created_at,
    'updated_at',        v_row.updated_at,
    'branches',          v_branches
  );
END $$;

REVOKE ALL ON FUNCTION public.lookup_provider_lead(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_provider_lead(text, text) TO anon, authenticated;

-- 2) Update: re-validates ref + credential, replaces editable fields and branches.
CREATE OR REPLACE FUNCTION public.update_provider_lead_by_ref(
  p_reference text,
  p_credential text,
  payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref       text := upper(trim(coalesce(p_reference, '')));
  v_cred      text := lower(trim(coalesce(p_credential, '')));
  v_cred_norm text := regexp_replace(coalesce(p_credential, ''), '\D', '', 'g');
  v_lead      public.provider_leads;
  v_branch    jsonb;
  v_new_email text;
  v_new_phone text;
  v_new_phone_norm text;
  v_new_cr    text;
  v_new_unif  text;
BEGIN
  IF v_ref = '' OR coalesce(p_credential, '') = '' OR payload IS NULL THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
  END IF;

  -- Locate + lock the row using the SAME credential rules as lookup
  SELECT * INTO v_lead
    FROM public.provider_leads
   WHERE reference_code = v_ref
     AND status IN ('new','under_review','needs_info')
     AND (
       lower(email) = v_cred
       OR (v_cred_norm <> '' AND regexp_replace(phone, '\D', '', 'g') = v_cred_norm)
     )
   FOR UPDATE
   LIMIT 1;

  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'not_found_or_locked' USING ERRCODE = 'P0001';
  END IF;

  -- Re-validate email / phone if provided
  v_new_email := lower(trim(coalesce(payload->>'email', v_lead.email)));
  v_new_phone := trim(coalesce(payload->>'phone', v_lead.phone));
  v_new_phone_norm := regexp_replace(v_new_phone, '\D', '', 'g');
  v_new_cr    := nullif(trim(coalesce(payload->>'cr_number','')), '');
  v_new_unif  := nullif(trim(coalesce(payload->>'unified_number','')), '');

  IF v_new_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_new_phone_norm) < 7 OR char_length(v_new_phone_norm) > 15 THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = '22023';
  END IF;

  -- Dedup check against OTHER open leads
  IF EXISTS (
    SELECT 1 FROM public.provider_leads
    WHERE id <> v_lead.id
      AND status IN ('new','under_review','needs_info')
      AND (
        lower(email) = v_new_email
        OR regexp_replace(phone, '\D', '', 'g') = v_new_phone_norm
        OR (v_new_cr IS NOT NULL AND cr_number = v_new_cr)
        OR (v_new_unif IS NOT NULL AND unified_number = v_new_unif)
      )
  ) THEN
    RAISE EXCEPTION 'duplicate_request' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.provider_leads SET
    name_ar           = COALESCE(nullif(trim(payload->>'name_ar'), ''), name_ar),
    name_en           = CASE WHEN payload ? 'name_en' THEN nullif(trim(coalesce(payload->>'name_en','')), '') ELSE name_en END,
    contact_name      = COALESCE(nullif(trim(payload->>'contact_name'), ''), contact_name),
    email             = v_new_email,
    phone             = v_new_phone,
    preferred_channel = COALESCE((payload->>'preferred_channel')::public.provider_lead_channel, preferred_channel),
    website           = CASE WHEN payload ? 'website' THEN nullif(trim(coalesce(payload->>'website','')), '') ELSE website END,
    cr_number         = CASE WHEN payload ? 'cr_number' THEN v_new_cr ELSE cr_number END,
    unified_number    = CASE WHEN payload ? 'unified_number' THEN v_new_unif ELSE unified_number END,
    vat_number        = CASE WHEN payload ? 'vat_number' THEN nullif(trim(coalesce(payload->>'vat_number','')), '') ELSE vat_number END,
    main_activity     = CASE WHEN payload ? 'main_activity' THEN nullif(trim(coalesce(payload->>'main_activity','')), '') ELSE main_activity END,
    specialties       = CASE WHEN payload ? 'specialties'
                              THEN COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'specialties')), '{}')
                              ELSE specialties END,
    brands            = CASE WHEN payload ? 'brands'
                              THEN COALESCE(ARRAY(SELECT jsonb_array_elements_text(payload->'brands')), '{}')
                              ELSE brands END,
    brief             = CASE WHEN payload ? 'brief' THEN nullif(trim(coalesce(payload->>'brief','')), '') ELSE brief END,
    cr_file_path      = CASE WHEN payload ? 'cr_file_path' AND nullif(trim(coalesce(payload->>'cr_file_path','')), '') IS NOT NULL
                              THEN trim(payload->>'cr_file_path')
                              ELSE cr_file_path END,
    map_link          = CASE WHEN payload ? 'map_link' THEN nullif(trim(coalesce(payload->>'map_link','')), '') ELSE map_link END,
    national_address  = CASE WHEN payload ? 'national_address' THEN nullif(trim(coalesce(payload->>'national_address','')), '') ELSE national_address END,
    city              = CASE WHEN payload ? 'city' THEN nullif(trim(coalesce(payload->>'city','')), '') ELSE city END,
    branches_count    = CASE WHEN payload ? 'branches_count'
                              THEN greatest(1, coalesce((payload->>'branches_count')::int, branches_count))
                              ELSE branches_count END,
    -- Re-open for review whenever the submitter edits
    status            = CASE WHEN status = 'needs_info' THEN 'under_review' ELSE status END
  WHERE id = v_lead.id;

  -- Replace branches when the array is provided
  IF jsonb_typeof(payload->'branches') = 'array' THEN
    DELETE FROM public.provider_lead_branches WHERE lead_id = v_lead.id;
    FOR v_branch IN SELECT * FROM jsonb_array_elements(payload->'branches') LOOP
      IF coalesce(trim(v_branch->>'branch_name'), '') <> '' THEN
        INSERT INTO public.provider_lead_branches (
          lead_id, branch_name, city, address, map_link, phone
        ) VALUES (
          v_lead.id,
          left(trim(v_branch->>'branch_name'), 200),
          nullif(trim(coalesce(v_branch->>'city','')), ''),
          nullif(trim(coalesce(v_branch->>'address','')), ''),
          nullif(trim(coalesce(v_branch->>'map_link','')), ''),
          nullif(trim(coalesce(v_branch->>'phone','')), '')
        );
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('ok', true, 'reference_code', v_ref);
END $$;

REVOKE ALL ON FUNCTION public.update_provider_lead_by_ref(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_provider_lead_by_ref(text, text, jsonb) TO anon, authenticated;