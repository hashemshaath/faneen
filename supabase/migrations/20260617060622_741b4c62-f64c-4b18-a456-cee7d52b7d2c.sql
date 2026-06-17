ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS site_id uuid NULL
  REFERENCES public.client_sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_site_id ON public.projects(site_id);
COMMENT ON COLUMN public.projects.site_id IS 'Optional execution site linking project to a client_sites row.';