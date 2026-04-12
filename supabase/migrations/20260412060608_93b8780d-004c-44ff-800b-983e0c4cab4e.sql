
-- Add project_id to reviews table
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for fast lookup
CREATE INDEX IF NOT EXISTS idx_reviews_project_id ON public.reviews(project_id);
