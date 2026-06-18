-- Founded year (optional)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS founded_year smallint,
  ADD COLUMN IF NOT EXISTS company_size text;

-- Sanity validations (use triggers later if needed; CHECK is fine here since values are static)
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_founded_year_range_chk;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_founded_year_range_chk
  CHECK (founded_year IS NULL OR (founded_year >= 1800 AND founded_year <= 2100));

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_company_size_chk;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_company_size_chk
  CHECK (company_size IS NULL OR company_size IN ('micro','small','medium','large'));

COMMENT ON COLUMN public.businesses.founded_year IS 'Optional year the business was founded (Gregorian). Used to show years of experience publicly.';
COMMENT ON COLUMN public.businesses.company_size IS 'Optional Muqawil-style company size: micro | small | medium | large.';

-- Expose to public read view so anonymous visitors can see it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'businesses_public'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.businesses_public TO anon, authenticated';
  END IF;
END $$;