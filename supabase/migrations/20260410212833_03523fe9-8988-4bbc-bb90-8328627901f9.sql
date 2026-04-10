
-- BNPL Providers table
CREATE TABLE public.bnpl_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  description_ar TEXT,
  description_en TEXT,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  max_amount NUMERIC NOT NULL DEFAULT 5000,
  installments_count INTEGER NOT NULL DEFAULT 4,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  currency_code VARCHAR NOT NULL DEFAULT 'SAR',
  color_hex TEXT DEFAULT '#000000',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bnpl_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BNPL providers viewable by everyone"
  ON public.bnpl_providers FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins can manage BNPL providers"
  ON public.bnpl_providers FOR ALL
  TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- Business-BNPL junction table
CREATE TABLE public.business_bnpl_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  bnpl_provider_id UUID NOT NULL REFERENCES public.bnpl_providers(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  merchant_code TEXT,
  credit_limit NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (business_id, bnpl_provider_id)
);

ALTER TABLE public.business_bnpl_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active business BNPL viewable by everyone"
  ON public.business_bnpl_providers FOR SELECT
  TO public USING (is_active = true);

CREATE POLICY "Business owners can manage their BNPL providers"
  ON public.business_bnpl_providers FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM businesses WHERE id = business_bnpl_providers.business_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses WHERE id = business_bnpl_providers.business_id AND user_id = auth.uid()));

CREATE POLICY "Admins can manage all business BNPL"
  ON public.business_bnpl_providers FOR ALL
  TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- Seed BNPL providers
INSERT INTO public.bnpl_providers (slug, sort_order, name_ar, name_en, logo_url, website_url, description_ar, description_en, min_amount, max_amount, installments_count, interest_rate, color_hex) VALUES
('tabby', 1, 'تابي', 'Tabby', 'https://cdn.tabby.ai/assets/tabby-badge-en.png', 'https://tabby.ai', 'قسّم مشترياتك على 4 دفعات بدون فوائد أو رسوم خفية. الدفعة الأولى عند الشراء والباقي على 3 أشهر.', 'Split your purchases into 4 interest-free payments. First payment at checkout, the rest over 3 months.', 100, 5000, 4, 0, '#3BFFC1'),
('tamara', 2, 'تمارا', 'Tamara', 'https://cdn.tamara.co/assets/tamara-logo.png', 'https://tamara.co', 'اشترِ الآن وادفع لاحقاً مع تمارا. قسّم على 3 أو 6 دفعات بدون فوائد مع موافقة فورية.', 'Buy now and pay later with Tamara. Split into 3 or 6 payments with zero interest and instant approval.', 50, 10000, 3, 0, '#FF4081'),
('imkan', 3, 'إمكان', 'Imkan', 'https://imkan.sa/assets/logo.svg', 'https://imkan.sa', 'حلول تمويل مرنة للأفراد والشركات. تقسيط يصل إلى 12 شهراً مع هامش ربح تنافسي.', 'Flexible financing solutions for individuals and businesses. Up to 12-month installments with competitive margins.', 500, 50000, 12, 2.5, '#1A237E'),
('sahel', 4, 'سهل', 'Sahel', 'https://sahel.sa/logo.svg', 'https://sahel.sa', 'سهّل عليك عملية الشراء بالتقسيط. قسّم مشترياتك حتى 6 دفعات شهرية ميسرة.', 'Make your purchases easier with installments. Split your purchases into up to 6 easy monthly payments.', 200, 15000, 6, 0, '#2196F3'),
('postpay', 5, 'بوست باي', 'Postpay', 'https://postpay.io/images/logo.svg', 'https://postpay.io', 'اشترِ الآن وادفع لاحقاً. قسّم مبلغ مشترياتك على 3 دفعات متساوية بدون فوائد.', 'Buy now, pay later. Split your purchase amount into 3 equal payments with zero interest.', 100, 5000, 3, 0, '#00C853'),
('spotii', 6, 'سبوتي', 'Spotii', 'https://spotii.com/assets/logo.svg', 'https://spotii.me', 'قسّط مشترياتك على 4 دفعات بدون فوائد. عملية سهلة وسريعة مع موافقة فورية.', 'Split purchases into 4 interest-free payments. Easy and fast process with instant approval.', 100, 5000, 4, 0, '#FF6F00'),
('atlet', 7, 'أتلت', 'Atlet', 'https://atlet.sa/logo.svg', 'https://atlet.sa', 'حلول تقسيط مبتكرة للمشاريع والمقاولات. تقسيط مرن يصل إلى 24 شهراً.', 'Innovative installment solutions for projects and contracting. Flexible installments up to 24 months.', 1000, 100000, 24, 3, '#7B1FA2'),
('cashew', 8, 'كاشو', 'Cashew', 'https://cashewpayments.com/logo.svg', 'https://cashewpayments.com', 'قسّم مدفوعاتك على 4 دفعات بدون فوائد. خدمة اشترِ الآن وادفع لاحقاً.', 'Split your payments into 4 interest-free payments. Buy now, pay later service.', 100, 5000, 4, 0, '#FF9800');
