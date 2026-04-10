
CREATE TABLE public.business_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  is_main boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  -- Contact
  contact_person text,
  phone text,
  mobile text,
  unified_number text,
  customer_service_phone text,
  email text,
  website text,
  -- Address
  country_id uuid REFERENCES public.countries(id),
  city_id uuid REFERENCES public.cities(id),
  region text,
  district text,
  street_name text,
  building_number text,
  national_id text,
  additional_number text,
  address text,
  latitude numeric,
  longitude numeric,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_branches ENABLE ROW LEVEL SECURITY;

-- Everyone can view active branches
CREATE POLICY "Active branches viewable by everyone"
  ON public.business_branches FOR SELECT
  USING (is_active = true);

-- Admins can view all branches
CREATE POLICY "Admins can view all branches"
  ON public.business_branches FOR SELECT
  TO authenticated
  USING (has_admin_access(auth.uid()));

-- Business owners can manage their branches
CREATE POLICY "Owners can insert branches"
  ON public.business_branches FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses WHERE id = business_branches.business_id AND user_id = auth.uid()
  ));

CREATE POLICY "Owners can update branches"
  ON public.business_branches FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses WHERE id = business_branches.business_id AND user_id = auth.uid()
  ));

CREATE POLICY "Owners can delete branches"
  ON public.business_branches FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses WHERE id = business_branches.business_id AND user_id = auth.uid()
  ));

-- Admins can manage all branches
CREATE POLICY "Admins can manage all branches"
  ON public.business_branches FOR ALL
  TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Auto-update timestamp
CREATE TRIGGER update_business_branches_updated_at
  BEFORE UPDATE ON public.business_branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
