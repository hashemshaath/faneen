CREATE OR REPLACE FUNCTION public.create_contract_from_workspace_as_client(
  _workspace_kind text,
  _workspace_id   uuid,
  _template_version_id uuid,
  _payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_project public.projects%ROWTYPE;
  v_site    public.client_sites%ROWTYPE;
  v_business public.businesses%ROWTYPE;
  v_provider_business_id uuid;
  v_provider_id uuid;
  v_project_id uuid;
  v_site_id uuid;
  v_title_ar text;
  v_title_en text;
  v_description_ar text;
  v_description_en text;
  v_total_amount numeric;
  v_currency text;
  v_start_date date;
  v_end_date   date;
  v_contract_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
  END IF;

  IF _workspace_kind NOT IN ('project','site') THEN
    RAISE EXCEPTION 'INVALID_WORKSPACE_KIND' USING ERRCODE = '22023';
  END IF;

  IF _payload IS NULL THEN
    _payload := '{}'::jsonb;
  END IF;

  -- Ownership + provider derivation
  IF _workspace_kind = 'project' THEN
    SELECT * INTO v_project FROM public.projects WHERE id = _workspace_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'WORKSPACE_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    IF v_project.owner_user_id IS NULL OR v_project.owner_user_id <> v_uid THEN
      RAISE EXCEPTION 'NOT_WORKSPACE_OWNER' USING ERRCODE = '42501';
    END IF;
    v_project_id := v_project.id;
    v_site_id    := v_project.site_id;

    -- Provider derivation: prefer the explicit client-set link
    -- (`selected_provider_business_id`), fall back to the legacy
    -- `business_id` ownership column. Both paths still require a
    -- valid business row with a real owner user.
    v_provider_business_id := COALESCE(
      v_project.selected_provider_business_id,
      v_project.business_id
    );
    IF v_provider_business_id IS NULL THEN
      RAISE EXCEPTION 'PROVIDER_NOT_DERIVABLE' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_business FROM public.businesses WHERE id = v_provider_business_id;
    IF NOT FOUND OR v_business.user_id IS NULL THEN
      RAISE EXCEPTION 'PROVIDER_NOT_DERIVABLE' USING ERRCODE = '22023';
    END IF;
    v_provider_id := v_business.user_id;

    IF v_site_id IS NOT NULL THEN
      SELECT * INTO v_site FROM public.client_sites WHERE id = v_site_id;
    END IF;
  ELSE
    SELECT * INTO v_site FROM public.client_sites WHERE id = _workspace_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'WORKSPACE_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    IF (v_site.owner_user_id IS NULL OR v_site.owner_user_id <> v_uid)
       AND (v_site.client_user_id IS NULL OR v_site.client_user_id <> v_uid) THEN
      RAISE EXCEPTION 'NOT_WORKSPACE_OWNER' USING ERRCODE = '42501';
    END IF;
    v_site_id := v_site.id;
    -- Standalone site has no derivable provider.
    RAISE EXCEPTION 'PROVIDER_NOT_DERIVABLE' USING ERRCODE = '22023';
  END IF;

  IF v_provider_id = v_uid THEN
    RAISE EXCEPTION 'CLIENT_CANNOT_BE_PROVIDER' USING ERRCODE = '22023';
  END IF;

  -- Extract editable, non-sensitive fields from payload only.
  v_title_ar       := NULLIF(btrim(COALESCE(_payload->>'title_ar', '')), '');
  v_title_en       := NULLIF(btrim(COALESCE(_payload->>'title_en', '')), '');
  v_description_ar := NULLIF(btrim(COALESCE(_payload->>'description_ar', '')), '');
  v_description_en := NULLIF(btrim(COALESCE(_payload->>'description_en', '')), '');
  v_currency       := COALESCE(NULLIF(btrim(COALESCE(_payload->>'currency_code','')), ''), 'SAR');
  v_total_amount   := COALESCE((_payload->>'total_amount')::numeric, 0);
  v_start_date     := NULLIF(_payload->>'start_date','')::date;
  v_end_date       := NULLIF(_payload->>'end_date','')::date;

  IF v_title_ar IS NULL THEN
    v_title_ar := COALESCE(v_project.title_ar, v_site.label, 'عقد جديد');
  END IF;

  INSERT INTO public.contracts (
    client_id,
    provider_id,
    business_id,
    title_ar,
    title_en,
    description_ar,
    description_en,
    total_amount,
    currency_code,
    status,
    start_date,
    end_date,
    template_version_id,
    execution_site_id
  ) VALUES (
    v_uid,
    v_provider_id,
    v_provider_business_id,
    v_title_ar,
    v_title_en,
    v_description_ar,
    v_description_en,
    v_total_amount,
    v_currency,
    'draft'::contract_status,
    v_start_date,
    v_end_date,
    _template_version_id,
    v_site_id
  )
  RETURNING id INTO v_contract_id;

  RETURN v_contract_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_contract_from_workspace_as_client(text, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_contract_from_workspace_as_client(text, uuid, uuid, jsonb) TO authenticated;