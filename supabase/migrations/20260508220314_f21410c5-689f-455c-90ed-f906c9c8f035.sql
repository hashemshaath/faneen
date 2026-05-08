
-- ============================================================================
-- Provider Landing Page Tables
-- ============================================================================

-- 1) Page Content (editable sections)
CREATE TABLE public.provider_landing_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL,
  title_ar text,
  title_en text,
  subtitle_ar text,
  subtitle_en text,
  body_ar text,
  body_en text,
  image_url text,
  cta_primary_label_ar text,
  cta_primary_label_en text,
  cta_primary_href text,
  cta_secondary_label_ar text,
  cta_secondary_label_en text,
  cta_secondary_href text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_key)
);

-- 2) Feature Cards
CREATE TABLE public.provider_landing_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_name text NOT NULL DEFAULT 'Sparkles',
  title_ar text NOT NULL,
  title_en text,
  desc_ar text NOT NULL,
  desc_en text,
  category text DEFAULT 'general',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) FAQ
CREATE TABLE public.provider_landing_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_ar text NOT NULL,
  question_en text,
  answer_ar text NOT NULL,
  answer_en text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Testimonials
CREATE TABLE public.provider_landing_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  quote_ar text NOT NULL,
  quote_en text,
  author_name text NOT NULL,
  author_role_ar text,
  author_role_en text,
  avatar_url text,
  rating numeric(2,1) DEFAULT 5.0,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Metrics / Event Tracking
CREATE TABLE public.provider_landing_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  section text,
  cta_id text,
  session_id text,
  user_id uuid,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  device text,
  country text,
  path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plm_event_type ON public.provider_landing_metrics(event_type);
CREATE INDEX idx_plm_created_at ON public.provider_landing_metrics(created_at DESC);
CREATE INDEX idx_plm_session ON public.provider_landing_metrics(session_id);
CREATE INDEX idx_plm_utm_source ON public.provider_landing_metrics(utm_source);

-- 6) Settings (singleton)
CREATE TABLE public.provider_landing_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  seo_title_ar text DEFAULT 'انضم لقِطاعات — منصة مزودي خدمات الألمنيوم والحديد والزجاج',
  seo_title_en text DEFAULT 'Join Qitaat — Providers Platform for Aluminum, Steel & Glass',
  seo_desc_ar text DEFAULT 'سجّل ورشتك أو مصنعك في أكبر دليل صناعات خفيفة بالخليج. عملاء جدد، عقود VAT، حجوزات، رسائل، وتحليلات احترافية.',
  seo_desc_en text DEFAULT 'Register your workshop or factory on the leading industrial directory in the Gulf. New clients, VAT contracts, bookings, messaging, and analytics.',
  keywords text DEFAULT 'دليل ورش ألمنيوم, تسجيل ورشة حديد, منصة مزودي خدمات, صناعات خفيفة, زجاج, مطابخ, خشب',
  og_image_url text,
  hero_video_url text,
  ga4_measurement_id text,
  gtm_container_id text,
  gsc_verification text,
  bing_verification text,
  yandex_verification text,
  indexnow_key text,
  enable_tracking boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.provider_landing_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================================
-- updated_at triggers
-- ============================================================================
CREATE TRIGGER trg_plc_updated BEFORE UPDATE ON public.provider_landing_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plf_updated BEFORE UPDATE ON public.provider_landing_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plfaq_updated BEFORE UPDATE ON public.provider_landing_faq
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plt_updated BEFORE UPDATE ON public.provider_landing_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pls_updated BEFORE UPDATE ON public.provider_landing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.provider_landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_landing_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_landing_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_landing_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_landing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_landing_settings ENABLE ROW LEVEL SECURITY;

-- Public read for active content/features/faq/testimonials/settings
CREATE POLICY "public_read_active_content" ON public.provider_landing_content
  FOR SELECT USING (is_active = true OR public.has_admin_access(auth.uid()));
CREATE POLICY "admin_write_content" ON public.provider_landing_content
  FOR ALL USING (public.has_admin_access(auth.uid())) WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "public_read_active_features" ON public.provider_landing_features
  FOR SELECT USING (is_active = true OR public.has_admin_access(auth.uid()));
CREATE POLICY "admin_write_features" ON public.provider_landing_features
  FOR ALL USING (public.has_admin_access(auth.uid())) WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "public_read_active_faq" ON public.provider_landing_faq
  FOR SELECT USING (is_active = true OR public.has_admin_access(auth.uid()));
CREATE POLICY "admin_write_faq" ON public.provider_landing_faq
  FOR ALL USING (public.has_admin_access(auth.uid())) WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "public_read_active_testimonials" ON public.provider_landing_testimonials
  FOR SELECT USING (is_active = true OR public.has_admin_access(auth.uid()));
CREATE POLICY "admin_write_testimonials" ON public.provider_landing_testimonials
  FOR ALL USING (public.has_admin_access(auth.uid())) WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "public_read_settings" ON public.provider_landing_settings
  FOR SELECT USING (true);
CREATE POLICY "admin_write_settings" ON public.provider_landing_settings
  FOR ALL USING (public.has_admin_access(auth.uid())) WITH CHECK (public.has_admin_access(auth.uid()));

-- Metrics: anyone can insert (anonymous tracking), only admins read
CREATE POLICY "public_insert_metrics" ON public.provider_landing_metrics
  FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_read_metrics" ON public.provider_landing_metrics
  FOR SELECT USING (public.has_admin_access(auth.uid()));
CREATE POLICY "admin_delete_metrics" ON public.provider_landing_metrics
  FOR DELETE USING (public.has_admin_access(auth.uid()));

-- ============================================================================
-- Seed initial content
-- ============================================================================
INSERT INTO public.provider_landing_content (section_key, title_ar, title_en, subtitle_ar, subtitle_en, body_ar, body_en, cta_primary_label_ar, cta_primary_label_en, cta_primary_href, cta_secondary_label_ar, cta_secondary_label_en, cta_secondary_href, sort_order) VALUES
('hero',
 'انضم لأكبر منصة لورش الألمنيوم والحديد والزجاج في السعودية والخليج',
 'Join the Leading Platform for Aluminum, Steel & Glass Workshops in the Gulf',
 'وصول لآلاف العملاء المحتملين، إدارة احترافية للعقود والفواتير، وأدوات ذكاء اصطناعي لتنمية أعمالك',
 'Reach thousands of clients, manage VAT contracts professionally, and grow with AI-powered tools',
 'قِطاعات هي المنصة الرائدة المتخصصة في الصناعات الخفيفة بالخليج. سجّل ورشتك أو مصنعك مجاناً وابدأ استقبال طلبات العملاء اليوم.',
 'Qitaat is the leading directory for light industries in the Gulf. Register your workshop or factory for free and start receiving client requests today.',
 'سجّل ورشتك مجاناً', 'Register Free', '/auth?mode=signup&role=provider',
 'شاهد جولة سريعة', 'Watch Tour', '#how-it-works', 1),
('why',
 'لماذا قِطاعات؟',
 'Why Qitaat?',
 'منصة فريدة مصممة خصيصاً لقطاع الصناعات الخفيفة',
 'A unique platform built for the light industries sector',
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2),
('how',
 'كيف تعمل المنصة؟',
 'How It Works',
 '4 خطوات بسيطة للوصول لعملاء جدد',
 '4 simple steps to reach new clients',
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3),
('cta_final',
 'ابدأ تنمية أعمالك اليوم',
 'Start Growing Your Business Today',
 'انضم لأكثر من ألف ورشة ومصنع يستخدمون قِطاعات للوصول لعملاء جدد',
 'Join 1000+ workshops and factories using Qitaat to reach new clients',
 NULL, NULL,
 'ابدأ مجاناً الآن', 'Get Started Free', '/auth?mode=signup&role=provider',
 'تواصل معنا', 'Contact Us', '/contact', 99);

-- Seed features
INSERT INTO public.provider_landing_features (icon_name, title_ar, title_en, desc_ar, desc_en, category, sort_order) VALUES
('Users', 'وصول لعملاء جدد', 'Reach New Clients', 'اظهر أمام آلاف الباحثين عن خدمات الألمنيوم والحديد والزجاج يومياً في منطقتك', 'Get discovered by thousands searching for aluminum, steel and glass services in your area daily', 'growth', 1),
('Building2', 'ملف أعمال احترافي', 'Professional Business Profile', 'صفحة ملف احترافية بصور المشاريع وقائمة الخدمات والأسعار وآراء العملاء', 'Professional profile page with project gallery, services list, pricing, and client reviews', 'profile', 2),
('FileText', 'عقود VAT احترافية', 'Professional VAT Contracts', 'إدارة عقود متكاملة بضريبة القيمة المضافة 15%، دفعات على 3 مراحل، وتوقيع رقمي', 'Full contract management with 15% VAT, 3-stage payments, and digital signatures', 'contracts', 3),
('Calendar', 'حجوزات ومواعيد', 'Bookings & Appointments', 'نظام حجز فوري للعملاء مع تقويم متاح، تذكيرات تلقائية، وإدارة فروع متعددة', 'Real-time client booking with availability calendar, auto-reminders, and multi-branch management', 'operations', 4),
('MessageSquare', 'رسائل وعروض أسعار', 'Messaging & Quotes', 'تواصل مباشر مع العملاء، إرسال عروض أسعار، وقوالب رد جاهزة لتوفير الوقت', 'Direct client messaging, send quotes, and pre-built reply templates to save time', 'communication', 5),
('ShieldCheck', 'ضمانات وصيانة', 'Warranties & Maintenance', 'إدارة ضمانات المنتجات، طلبات الصيانة، وسجل خدمة كامل لكل عميل', 'Product warranty management, maintenance requests, and full service history per client', 'service', 6),
('BarChart3', 'تحليلات احترافية', 'Professional Analytics', 'لوحة تحكم بمؤشرات الأداء، تتبع المشاهدات، التحويلات، والإيرادات بالوقت الفعلي', 'Dashboard with KPIs, view tracking, conversions, and real-time revenue analytics', 'analytics', 7),
('Sparkles', 'مساعد ذكاء اصطناعي', 'AI Assistant', 'مركز AI لكتابة الأوصاف، تحسين SEO، توليد الردود، واقتراح أسعار مناسبة', 'AI center for writing descriptions, SEO optimization, generating replies, and pricing suggestions', 'ai', 8),
('Award', 'شارة التحقق', 'Verification Badge', 'احصل على شارة "ورشة موثقة" بعد التحقق لزيادة الثقة والتحويلات', 'Earn a "Verified Workshop" badge after verification to boost trust and conversions', 'trust', 9),
('CreditCard', 'دفعات وتقسيط', 'Payments & BNPL', 'تكامل مع تابي وتمارا للتقسيط، إيصالات إلكترونية، وتتبع الدفعات', 'Tabby and Tamara BNPL integration, e-receipts, and payment tracking', 'payments', 10),
('Briefcase', 'معرض مشاريع', 'Project Portfolio', 'اعرض أعمالك السابقة بصور احترافية، تفاصيل المواد، والمدة الزمنية', 'Showcase past work with professional photos, materials details, and timelines', 'portfolio', 11),
('Globe', 'دعم عربي/إنجليزي', 'Arabic/English Support', 'منصة ثنائية اللغة بالكامل تستهدف العملاء المحليين والدوليين', 'Fully bilingual platform targeting both local and international clients', 'localization', 12);

-- Seed FAQ
INSERT INTO public.provider_landing_faq (question_ar, question_en, answer_ar, answer_en, sort_order) VALUES
('هل التسجيل في قِطاعات مجاني؟', 'Is registration on Qitaat free?',
 'نعم، التسجيل والاستخدام الأساسي مجاني تماماً. يمكنك إنشاء ملف ورشتك، إضافة خدماتك ومشاريعك، واستقبال رسائل العملاء بدون أي رسوم. هناك خطط متقدمة (Premium وPro) لمن يحتاج ميزات إضافية مثل عدد أكبر من المشاريع، أولوية في الظهور، وتحليلات متقدمة.',
 'Yes, registration and basic usage are completely free. You can create your workshop profile, add services and projects, and receive client messages at no cost. Premium and Pro plans are available for advanced features like unlimited projects, priority listing, and advanced analytics.', 1),
('ما هي القطاعات التي تخدمها قِطاعات؟', 'Which sectors does Qitaat serve?',
 'قِطاعات متخصصة في الصناعات الخفيفة وتشمل: الألمنيوم (نوافذ، أبواب، واجهات)، الحديد (أبواب، شبابيك، مظلات)، الزجاج (سيكوريت، مرايا، فواصل)، الخشب (أبواب، خزائن)، المطابخ، الديكورات الداخلية، والحدادة الفنية.',
 'Qitaat specializes in light industries including: Aluminum (windows, doors, facades), Steel (doors, windows, awnings), Glass (tempered, mirrors, partitions), Wood (doors, cabinets), Kitchens, Interior Decor, and Artistic Blacksmithing.', 2),
('كم من الوقت يستغرق تفعيل ملف الورشة؟', 'How long does workshop activation take?',
 'يمكنك إنشاء ملفك خلال 5 دقائق فقط. بعد إكمال البيانات الأساسية وإضافة خدمة واحدة على الأقل، يصبح ملفك ظاهراً للعملاء فوراً. للحصول على شارة التحقق، تتم المراجعة خلال 24-48 ساعة.',
 'You can create your profile in just 5 minutes. After completing basic info and adding at least one service, your profile is visible to clients immediately. Verification badge review takes 24-48 hours.', 3),
('كيف أحصل على عملاء جدد عبر المنصة؟', 'How do I get new clients through the platform?',
 'بعد تفعيل ملفك، يبدأ عرضه في نتائج البحث، صفحات القطاعات، وصفحات المدن. العملاء يتواصلون معك مباشرة عبر الرسائل، الاتصال، أو حجز موعد. كلما اكتمل ملفك أكثر (مشاريع، تقييمات، صور)، كلما زادت فرص ظهورك.',
 'Once activated, your profile appears in search results, sector pages, and city pages. Clients contact you directly via messages, calls, or appointment booking. The more complete your profile (projects, reviews, photos), the higher your visibility.', 4),
('هل يمكنني إدارة فروع متعددة؟', 'Can I manage multiple branches?',
 'نعم، تدعم قِطاعات إدارة فروع متعددة من حساب واحد. يمكنك إضافة فروع في مدن مختلفة، تحديد موظفين لكل فرع بصلاحيات مختلفة، وتتبع أداء كل فرع منفصلاً.',
 'Yes, Qitaat supports multi-branch management from a single account. Add branches in different cities, assign staff with different permissions per branch, and track each branch performance separately.', 5),
('ما هي ضريبة القيمة المضافة في العقود؟', 'How is VAT handled in contracts?',
 'العقود في قِطاعات تدعم ضريبة القيمة المضافة السعودية 15% بشكل تلقائي (شاملة السعر). الفواتير تُولّد بصيغة معتمدة من هيئة الزكاة والضريبة والجمارك، ويمكن تصديرها PDF.',
 'Contracts on Qitaat automatically support Saudi VAT at 15% (price-inclusive). Invoices are generated in ZATCA-compliant format and exportable as PDF.', 6),
('هل بياناتي وعملائي محمية؟', 'Is my data and clients information protected?',
 'بالتأكيد. نستخدم تشفير بنكي (TLS 1.3)، نظام صلاحيات صارم (RLS)، وتخزين آمن للبيانات. لا نشارك بيانات عملائك مع أي طرف ثالث، وبإمكانك تصدير أو حذف بياناتك في أي وقت.',
 'Absolutely. We use bank-grade encryption (TLS 1.3), strict role-based access (RLS), and secure data storage. We never share your client data with third parties, and you can export or delete your data anytime.', 7),
('هل يوجد تطبيق جوال؟', 'Is there a mobile app?',
 'قِطاعات منصة PWA (تطبيق ويب تقدمي) يمكن تثبيتها على شاشة الجوال الرئيسية وتعمل كتطبيق كامل بدون الحاجة لتنزيل من المتاجر، مع دعم الإشعارات والوصول السريع.',
 'Qitaat is a PWA (Progressive Web App) installable on your phone home screen, working as a full app without store downloads, with notifications support and fast access.', 8),
('ما الفرق بين الخطة المجانية والمدفوعة؟', 'What is the difference between free and paid plans?',
 'الخطة المجانية تشمل: ملف عمل، حتى 5 خدمات، حتى 10 مشاريع، رسائل غير محدودة. خطة Premium تضيف: مشاريع غير محدودة، أولوية في الظهور، تحليلات متقدمة، وإزالة العلامة المائية. خطة Pro تضيف: API للتكاملات، حسابات موظفين متعددة، ودعم أولوية.',
 'Free plan includes: business profile, up to 5 services, up to 10 projects, unlimited messages. Premium adds: unlimited projects, priority listing, advanced analytics, no watermark. Pro adds: API integrations, multiple staff accounts, and priority support.', 9),
('كيف أتواصل مع الدعم الفني؟', 'How do I contact support?',
 'فريق الدعم متاح من الأحد للخميس 9 صباحاً - 6 مساءً عبر صفحة "تواصل معنا"، البريد الإلكتروني support@qitaat.com، أو الواتساب. مشتركو Pro يحصلون على دعم أولوية على مدار الساعة.',
 'Support team available Sunday-Thursday 9 AM - 6 PM via Contact page, email support@qitaat.com, or WhatsApp. Pro subscribers get 24/7 priority support.', 10);
