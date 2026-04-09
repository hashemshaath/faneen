
-- Promotion type enum
CREATE TYPE public.promotion_type AS ENUM ('ad', 'offer', 'video');

-- Promotions / Special offers table
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  promotion_type promotion_type NOT NULL DEFAULT 'offer',
  discount_percentage NUMERIC,
  discount_amount NUMERIC,
  original_price NUMERIC,
  offer_price NUMERIC,
  currency_code VARCHAR NOT NULL DEFAULT 'SAR',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  image_url TEXT,
  video_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promotions"
ON public.promotions FOR SELECT
USING (is_active = true);

CREATE POLICY "Business owners can create promotions"
ON public.promotions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = promotions.business_id AND user_id = auth.uid())
);

CREATE POLICY "Business owners can update promotions"
ON public.promotions FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = promotions.business_id AND user_id = auth.uid())
);

CREATE POLICY "Business owners can delete promotions"
ON public.promotions FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = promotions.business_id AND user_id = auth.uid())
);

-- Updated at trigger
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
