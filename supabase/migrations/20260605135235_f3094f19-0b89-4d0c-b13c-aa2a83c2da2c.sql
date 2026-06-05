ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS branch_id uuid NULL REFERENCES public.business_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_id uuid NULL REFERENCES public.business_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_branch_id ON public.reviews(branch_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON public.reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_branch_rating ON public.reviews(branch_id, rating);

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_business_id_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_business_branch_user
  ON public.reviews (business_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), user_id);