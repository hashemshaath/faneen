-- 1) Table
CREATE TABLE IF NOT EXISTS public.rental_term_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.rental_categories(id) ON DELETE CASCADE,
  usage_terms JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ar,en}, ...]
  late_terms  JSONB NOT NULL DEFAULT '[]'::jsonb,
  penalty_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rental_term_templates_active_per_category
  ON public.rental_term_templates (category_id)
  WHERE is_active = true;

-- 2) Grants
GRANT SELECT ON public.rental_term_templates TO authenticated;
GRANT ALL ON public.rental_term_templates TO service_role;

-- 3) RLS
ALTER TABLE public.rental_term_templates ENABLE ROW LEVEL SECURITY;

-- 4) Policies
-- Authenticated users can read active templates (used by rental item form).
CREATE POLICY "Authenticated can read active term templates"
ON public.rental_term_templates
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Only admins (or super_admins) can insert.
CREATE POLICY "Admins manage term templates (insert)"
ON public.rental_term_templates
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Only admins (or super_admins) can update.
CREATE POLICY "Admins manage term templates (update)"
ON public.rental_term_templates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Only admins (or super_admins) can delete.
CREATE POLICY "Admins manage term templates (delete)"
ON public.rental_term_templates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 5) updated_at trigger (reuse standard helper if present, else create local)
CREATE OR REPLACE FUNCTION public.update_rental_term_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rental_term_templates_updated_at ON public.rental_term_templates;
CREATE TRIGGER trg_rental_term_templates_updated_at
BEFORE UPDATE ON public.rental_term_templates
FOR EACH ROW EXECUTE FUNCTION public.update_rental_term_templates_updated_at();