
CREATE TABLE IF NOT EXISTS public.business_badge_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  found boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  last_found_at timestamptz,
  http_status int,
  checked_url text,
  matched_url text,
  error text,
  consecutive_misses int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_badge_status_business ON public.business_badge_status(business_id);
CREATE INDEX IF NOT EXISTS idx_business_badge_status_found ON public.business_badge_status(found);

ALTER TABLE public.business_badge_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their badge status"
  ON public.business_badge_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_badge_status.business_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all badge status"
  ON public.business_badge_status FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_business_badge_status_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_badge_status_updated_at ON public.business_badge_status;
CREATE TRIGGER trg_business_badge_status_updated_at
  BEFORE UPDATE ON public.business_badge_status
  FOR EACH ROW EXECUTE FUNCTION public.set_business_badge_status_updated_at();
