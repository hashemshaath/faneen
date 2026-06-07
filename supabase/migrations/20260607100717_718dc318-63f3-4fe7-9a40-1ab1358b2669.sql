
-- Phase 8: Project taxonomy foundation. Creates a link table for projects to
-- the central `taxonomy_categories`. Does NOT touch `projects.category_id`.

CREATE TABLE IF NOT EXISTS public.project_taxonomy_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.taxonomy_categories(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'primary_activity',
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, category_id, role)
);

CREATE INDEX IF NOT EXISTS idx_project_taxonomy_project ON public.project_taxonomy_categories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_taxonomy_category ON public.project_taxonomy_categories(category_id);

GRANT SELECT ON public.project_taxonomy_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_taxonomy_categories TO authenticated;
GRANT ALL ON public.project_taxonomy_categories TO service_role;

ALTER TABLE public.project_taxonomy_categories ENABLE ROW LEVEL SECURITY;

-- Public read for published projects only; owners/admins read their own.
CREATE POLICY "Published project taxonomy links are public"
  ON public.project_taxonomy_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_taxonomy_categories.project_id
        AND (
          p.status = 'published'
          OR EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = p.business_id AND b.user_id = auth.uid()
          )
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "Business owners manage project taxonomy links"
  ON public.project_taxonomy_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE p.id = project_taxonomy_categories.project_id
        AND b.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.businesses b ON b.id = p.business_id
      WHERE p.id = project_taxonomy_categories.project_id
        AND b.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Atomic replace RPC, mirrors set_business_taxonomy_categories pattern.
CREATE OR REPLACE FUNCTION public.set_project_taxonomy_categories(
  p_project_id uuid,
  p_primary_category_id uuid,
  p_secondary_category_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_owns boolean;
  v_is_admin boolean;
BEGIN
  SELECT business_id INTO v_business_id
  FROM public.projects WHERE id = p_project_id;
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  v_is_admin := public.has_role(auth.uid(), 'admin');
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = v_business_id AND user_id = auth.uid()
  ) INTO v_owns;
  IF NOT v_owns AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized to manage this project';
  END IF;

  DELETE FROM public.project_taxonomy_categories
   WHERE project_id = p_project_id
     AND role IN ('primary_activity', 'secondary_activity');

  IF p_primary_category_id IS NOT NULL THEN
    INSERT INTO public.project_taxonomy_categories (project_id, category_id, role, is_primary)
    VALUES (p_project_id, p_primary_category_id, 'primary_activity', true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF p_secondary_category_ids IS NOT NULL THEN
    INSERT INTO public.project_taxonomy_categories (project_id, category_id, role, is_primary)
    SELECT p_project_id, c, 'secondary_activity', false
    FROM unnest(p_secondary_category_ids) AS c
    WHERE c IS NOT NULL AND c <> COALESCE(p_primary_category_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_project_taxonomy_categories(uuid, uuid, uuid[]) TO authenticated;
