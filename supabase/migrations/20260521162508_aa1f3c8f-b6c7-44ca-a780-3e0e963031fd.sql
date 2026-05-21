-- 1. Add nullable category_id with FK
ALTER TABLE public.business_services
  ADD COLUMN category_id uuid NULL REFERENCES public.categories(id) ON DELETE SET NULL;

-- 2. Indexes
CREATE INDEX idx_business_services_category_id
  ON public.business_services(category_id);

CREATE INDEX idx_business_services_business_category
  ON public.business_services(business_id, category_id);

-- 3. Backfill from parent business category
UPDATE public.business_services bs
   SET category_id = b.category_id
  FROM public.businesses b
 WHERE b.id = bs.business_id
   AND b.category_id IS NOT NULL
   AND bs.category_id IS NULL;