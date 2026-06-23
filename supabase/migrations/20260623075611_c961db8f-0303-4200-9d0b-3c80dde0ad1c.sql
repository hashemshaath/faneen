-- 1) Column + index
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS selected_provider_business_id uuid NULL
  REFERENCES public.businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_selected_provider_business_id
  ON public.projects (selected_provider_business_id)
  WHERE selected_provider_business_id IS NOT NULL;

-- 2) RPC: link project to provider (client-scope)
CREATE OR REPLACE FUNCTION public.link_project_provider_as_client(
  p_project_id uuid,
  p_provider_business_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_business_id uuid;
  v_provider_exists boolean;
  v_caller_owns_provider boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT owner_user_id, business_id INTO v_owner, v_business_id
    FROM public.projects WHERE id = p_project_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'PROJECT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner <> v_uid THEN
    RAISE EXCEPTION 'NOT_PROJECT_OWNER' USING ERRCODE = '42501';
  END IF;

  IF p_provider_business_id IS NULL THEN
    UPDATE public.projects
       SET selected_provider_business_id = NULL,
           updated_at = now()
     WHERE id = p_project_id;
    RETURN p_project_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.businesses
     WHERE id = p_provider_business_id
       AND COALESCE(is_active, true) = true
       AND deleted_at IS NULL
  ) INTO v_provider_exists;

  IF NOT v_provider_exists THEN
    RAISE EXCEPTION 'PROVIDER_NOT_ELIGIBLE' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.businesses
     WHERE id = p_provider_business_id
       AND owner_user_id = v_uid
  ) INTO v_caller_owns_provider;

  IF v_caller_owns_provider THEN
    RAISE EXCEPTION 'CLIENT_CANNOT_BE_PROVIDER' USING ERRCODE = '22023';
  END IF;

  UPDATE public.projects
     SET selected_provider_business_id = p_provider_business_id,
         updated_at = now()
   WHERE id = p_project_id;

  RETURN p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.link_project_provider_as_client(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_project_provider_as_client(uuid, uuid) TO authenticated;