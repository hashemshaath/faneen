-- BUSINESS CERTIFICATIONS ------------------------------------------------------
CREATE TABLE public.business_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  issuer_ar TEXT NOT NULL,
  issuer_en TEXT,
  credential_number TEXT,
  credential_url TEXT,
  logo_url TEXT,
  proof_document_url TEXT,
  issued_at DATE,
  expires_at DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  verified_by_admin BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_certifications_business_id ON public.business_certifications(business_id);
CREATE INDEX idx_business_certifications_expires_at  ON public.business_certifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_business_certifications_active      ON public.business_certifications(business_id, is_active, display_order) WHERE is_active = true;

GRANT SELECT ON public.business_certifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_certifications TO authenticated;
GRANT ALL ON public.business_certifications TO service_role;

ALTER TABLE public.business_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view certifications of approved businesses"
ON public.business_certifications FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_certifications.business_id
      AND b.approval_status = 'approved'
  )
);

CREATE POLICY "Business owners and staff can manage certifications"
ON public.business_certifications FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_certifications.business_id
      AND (b.user_id = auth.uid() OR public.is_business_staff(b.id, auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_certifications.business_id
      AND (b.user_id = auth.uid() OR public.is_business_staff(b.id, auth.uid()))
  )
);

CREATE POLICY "Admins can manage all certifications"
ON public.business_certifications FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- BUSINESS AWARDS --------------------------------------------------------------
CREATE TYPE public.award_rank AS ENUM ('winner', 'runner_up', 'third_place', 'finalist', 'honorable_mention');

CREATE TABLE public.business_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  issuer_ar TEXT NOT NULL,
  issuer_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  awarded_year INTEGER NOT NULL,
  rank public.award_rank,
  category_ar TEXT,
  category_en TEXT,
  image_url TEXT,
  proof_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  verified_by_admin BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_awards_year_sane CHECK (awarded_year BETWEEN 1900 AND 2200)
);

CREATE INDEX idx_business_awards_business_id ON public.business_awards(business_id);
CREATE INDEX idx_business_awards_active      ON public.business_awards(business_id, is_active, awarded_year DESC, display_order) WHERE is_active = true;

GRANT SELECT ON public.business_awards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_awards TO authenticated;
GRANT ALL ON public.business_awards TO service_role;

ALTER TABLE public.business_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view awards of approved businesses"
ON public.business_awards FOR SELECT
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_awards.business_id
      AND b.approval_status = 'approved'
  )
);

CREATE POLICY "Business owners and staff can manage awards"
ON public.business_awards FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_awards.business_id
      AND (b.user_id = auth.uid() OR public.is_business_staff(b.id, auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_awards.business_id
      AND (b.user_id = auth.uid() OR public.is_business_staff(b.id, auth.uid()))
  )
);

CREATE POLICY "Admins can manage all awards"
ON public.business_awards FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- updated_at triggers ----------------------------------------------------------
CREATE TRIGGER trg_business_certifications_updated_at
  BEFORE UPDATE ON public.business_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_business_awards_updated_at
  BEFORE UPDATE ON public.business_awards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();