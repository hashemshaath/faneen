
-- Profile Systems (main catalog)
CREATE TABLE public.profile_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  slug varchar NOT NULL UNIQUE,
  description_ar text,
  description_en text,
  category varchar NOT NULL DEFAULT 'aluminum',
  profile_type varchar NOT NULL DEFAULT 'market',
  origin_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  cover_image_url text,
  logo_url text,
  thermal_insulation_rating integer DEFAULT 0,
  sound_insulation_rating integer DEFAULT 0,
  strength_rating integer DEFAULT 0,
  max_height_mm integer,
  max_width_mm integer,
  available_colors text[] DEFAULT '{}',
  features_ar text[] DEFAULT '{}',
  features_en text[] DEFAULT '{}',
  recommendation_level varchar NOT NULL DEFAULT 'standard',
  applications_ar text,
  applications_en text,
  status varchar NOT NULL DEFAULT 'published',
  sort_order integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published profiles viewable by everyone"
ON public.profile_systems FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage profile systems"
ON public.profile_systems FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_profile_systems_updated_at
BEFORE UPDATE ON public.profile_systems
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profile Specifications
CREATE TABLE public.profile_specifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profile_systems(id) ON DELETE CASCADE,
  spec_name_ar text NOT NULL,
  spec_name_en text,
  spec_value text NOT NULL,
  spec_unit text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_specifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile specs viewable by everyone"
ON public.profile_specifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM profile_systems WHERE id = profile_specifications.profile_id AND status = 'published')
);

CREATE POLICY "Admins can manage profile specs"
ON public.profile_specifications FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profile Images
CREATE TABLE public.profile_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profile_systems(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type varchar NOT NULL DEFAULT 'photo',
  caption_ar text,
  caption_en text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile images viewable by everyone"
ON public.profile_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM profile_systems WHERE id = profile_images.profile_id AND status = 'published')
);

CREATE POLICY "Admins can manage profile images"
ON public.profile_images FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profile Suppliers
CREATE TABLE public.profile_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profile_systems(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  price_range_from numeric,
  price_range_to numeric,
  currency_code varchar NOT NULL DEFAULT 'SAR',
  is_available boolean NOT NULL DEFAULT true,
  notes_ar text,
  notes_en text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, business_id)
);

ALTER TABLE public.profile_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile suppliers viewable by everyone"
ON public.profile_suppliers FOR SELECT USING (
  EXISTS (SELECT 1 FROM profile_systems WHERE id = profile_suppliers.profile_id AND status = 'published')
);

CREATE POLICY "Business owners can link their business as supplier"
ON public.profile_suppliers FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM businesses WHERE id = profile_suppliers.business_id AND user_id = auth.uid()
));

CREATE POLICY "Business owners can update their supplier link"
ON public.profile_suppliers FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM businesses WHERE id = profile_suppliers.business_id AND user_id = auth.uid()
));

CREATE POLICY "Business owners can remove their supplier link"
ON public.profile_suppliers FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM businesses WHERE id = profile_suppliers.business_id AND user_id = auth.uid()
));

CREATE POLICY "Admins can manage all suppliers"
ON public.profile_suppliers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profile Reviews
CREATE TABLE public.profile_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profile_systems(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, user_id)
);

ALTER TABLE public.profile_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile reviews viewable by everyone"
ON public.profile_reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM profile_systems WHERE id = profile_reviews.profile_id AND status = 'published')
);

CREATE POLICY "Users can create their own reviews"
ON public.profile_reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.profile_reviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.profile_reviews FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_profile_reviews_updated_at
BEFORE UPDATE ON public.profile_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
