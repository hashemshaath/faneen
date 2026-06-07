-- Phase 14: contract ↔ taxonomy linking. The legacy
-- `contracts.service_category_id` and `contract_templates.service_category_id`
-- columns (FK to public.categories) remain in the DB for now; this new
-- table is the source of truth for new UIs.

CREATE TABLE IF NOT EXISTS public.contract_taxonomy_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.taxonomy_categories(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'service',
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_taxonomy_xor_target CHECK (
    (contract_id IS NOT NULL)::int + (template_id IS NOT NULL)::int = 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS contract_taxonomy_categories_contract_uq
  ON public.contract_taxonomy_categories (contract_id, category_id, role)
  WHERE contract_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contract_taxonomy_categories_template_uq
  ON public.contract_taxonomy_categories (template_id, category_id, role)
  WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS contract_taxonomy_categories_contract_idx
  ON public.contract_taxonomy_categories (contract_id);
CREATE INDEX IF NOT EXISTS contract_taxonomy_categories_template_idx
  ON public.contract_taxonomy_categories (template_id);
CREATE INDEX IF NOT EXISTS contract_taxonomy_categories_category_idx
  ON public.contract_taxonomy_categories (category_id);

GRANT SELECT ON public.contract_taxonomy_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contract_taxonomy_categories TO authenticated;
GRANT ALL ON public.contract_taxonomy_categories TO service_role;

ALTER TABLE public.contract_taxonomy_categories ENABLE ROW LEVEL SECURITY;

-- READ: anyone who can read the parent contract/template can read its links.
-- Templates are public-readable through the existing public view; we mirror
-- that here by allowing read to anon/authenticated for template rows, and
-- restricting contract rows to parties + admins.
CREATE POLICY "ctc_read_template_links"
  ON public.contract_taxonomy_categories
  FOR SELECT
  TO anon, authenticated
  USING (template_id IS NOT NULL);

CREATE POLICY "ctc_read_contract_links"
  ON public.contract_taxonomy_categories
  FOR SELECT
  TO authenticated
  USING (
    contract_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_taxonomy_categories.contract_id
        AND (
          c.provider_id = auth.uid()
          OR c.client_id  = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- WRITE: contract owner (provider) or admin can manage contract links.
CREATE POLICY "ctc_write_contract_links"
  ON public.contract_taxonomy_categories
  FOR ALL
  TO authenticated
  USING (
    contract_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_taxonomy_categories.contract_id
        AND (
          c.provider_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  )
  WITH CHECK (
    contract_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_taxonomy_categories.contract_id
        AND (
          c.provider_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- WRITE: only admins can manage template links.
CREATE POLICY "ctc_write_template_links"
  ON public.contract_taxonomy_categories
  FOR ALL
  TO authenticated
  USING (template_id IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (template_id IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

-- Atomic setter RPC used by the UI to replace the link set for a contract
-- or a template in one call. Mirrors `set_project_taxonomy_categories`.
CREATE OR REPLACE FUNCTION public.set_contract_taxonomy_categories(
  p_contract_id uuid,
  p_template_id uuid,
  p_primary_category_id uuid,
  p_secondary_category_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := public.has_role(v_uid, 'admin'::app_role);
  v_owner_ok boolean := false;
BEGIN
  IF (p_contract_id IS NULL) = (p_template_id IS NULL) THEN
    RAISE EXCEPTION 'exactly one of p_contract_id / p_template_id must be set';
  END IF;

  IF p_contract_id IS NOT NULL THEN
    SELECT (provider_id = v_uid) INTO v_owner_ok
    FROM public.contracts WHERE id = p_contract_id;
    IF NOT (v_is_admin OR COALESCE(v_owner_ok, false)) THEN
      RAISE EXCEPTION 'not authorized to manage this contract''s taxonomy';
    END IF;
    DELETE FROM public.contract_taxonomy_categories WHERE contract_id = p_contract_id;
    IF p_primary_category_id IS NOT NULL THEN
      INSERT INTO public.contract_taxonomy_categories (contract_id, category_id, role, is_primary)
      VALUES (p_contract_id, p_primary_category_id, 'service', true);
    END IF;
    IF p_secondary_category_ids IS NOT NULL THEN
      INSERT INTO public.contract_taxonomy_categories (contract_id, category_id, role, is_primary)
      SELECT p_contract_id, c, 'service', false
      FROM unnest(p_secondary_category_ids) AS c
      WHERE c IS NOT NULL AND c <> COALESCE(p_primary_category_id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;
  ELSE
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'only admins can manage template taxonomy';
    END IF;
    DELETE FROM public.contract_taxonomy_categories WHERE template_id = p_template_id;
    IF p_primary_category_id IS NOT NULL THEN
      INSERT INTO public.contract_taxonomy_categories (template_id, category_id, role, is_primary)
      VALUES (p_template_id, p_primary_category_id, 'service', true);
    END IF;
    IF p_secondary_category_ids IS NOT NULL THEN
      INSERT INTO public.contract_taxonomy_categories (template_id, category_id, role, is_primary)
      SELECT p_template_id, c, 'service', false
      FROM unnest(p_secondary_category_ids) AS c
      WHERE c IS NOT NULL AND c <> COALESCE(p_primary_category_id, '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_contract_taxonomy_categories(uuid, uuid, uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_contract_taxonomy_categories(uuid, uuid, uuid, uuid[]) TO authenticated;