-- Provider rental catalog addition requests
CREATE TABLE IF NOT EXISTS public.rental_catalog_addition_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL,
  requester_business_id uuid,
  category_id uuid REFERENCES public.rental_categories(id) ON DELETE SET NULL,
  proposed_category_name_ar text,
  proposed_category_name_en text,
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  description_en text,
  brand text,
  model text,
  suggested_unit text DEFAULT 'day',
  suggested_price numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  image_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_catalog_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.rental_catalog_addition_requests TO authenticated;
GRANT ALL ON public.rental_catalog_addition_requests TO service_role;

ALTER TABLE public.rental_catalog_addition_requests ENABLE ROW LEVEL SECURITY;

-- Requester can see and create their own requests
CREATE POLICY "rcar_requester_select"
  ON public.rental_catalog_addition_requests FOR SELECT
  TO authenticated
  USING (requester_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "rcar_requester_insert"
  ON public.rental_catalog_addition_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_user_id = auth.uid());

-- Only admins update (review)
CREATE POLICY "rcar_admin_update"
  ON public.rental_catalog_addition_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_rcar_updated_at
  BEFORE UPDATE ON public.rental_catalog_addition_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_rcar_status ON public.rental_catalog_addition_requests(status);
CREATE INDEX IF NOT EXISTS idx_rcar_requester ON public.rental_catalog_addition_requests(requester_user_id);
