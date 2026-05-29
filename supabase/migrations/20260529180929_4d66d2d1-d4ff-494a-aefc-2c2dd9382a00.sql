
-- Enums
DO $$ BEGIN CREATE TYPE public.help_audience AS ENUM ('general','provider','customer','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.help_article_status AS ENUM ('draft','published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.help_issue_type AS ENUM ('bug','ui','performance','data','security','content','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.help_issue_priority AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.help_issue_status AS ENUM ('open','reviewing','planned','resolved','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.help_feature_status AS ENUM ('new','reviewing','planned','in_progress','completed','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SEQUENCE IF NOT EXISTS public.seq_help_category START WITH 1000001;
CREATE SEQUENCE IF NOT EXISTS public.seq_help_article  START WITH 1000001;
CREATE SEQUENCE IF NOT EXISTS public.seq_help_issue    START WITH 1000001;
CREATE SEQUENCE IF NOT EXISTS public.seq_help_request  START WITH 1000001;

CREATE TABLE public.help_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  slug text NOT NULL UNIQUE,
  audience public.help_audience NOT NULL DEFAULT 'general',
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description_ar text,
  description_en text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_help_category_ref_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN NEW.ref_id := 'HCAT-' || nextval('public.seq_help_category')::text; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_help_categories_ref_id BEFORE INSERT ON public.help_categories FOR EACH ROW EXECUTE FUNCTION public.set_help_category_ref_id();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_categories TO authenticated;
GRANT ALL ON public.help_categories TO service_role;
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hc_read_active" ON public.help_categories FOR SELECT TO authenticated USING (is_active = true OR has_admin_access(auth.uid()));
CREATE POLICY "hc_admin_all" ON public.help_categories FOR ALL TO authenticated USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));

CREATE TABLE public.help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  category_id uuid REFERENCES public.help_categories(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  audience public.help_audience NOT NULL DEFAULT 'general',
  status public.help_article_status NOT NULL DEFAULT 'draft',
  title_ar text NOT NULL,
  title_en text NOT NULL,
  summary_ar text,
  summary_en text,
  content_ar text,
  content_en text,
  keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  views_count integer NOT NULL DEFAULT 0,
  helpful_count integer NOT NULL DEFAULT 0,
  not_helpful_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_help_articles_category ON public.help_articles(category_id);
CREATE INDEX idx_help_articles_status ON public.help_articles(status);
CREATE INDEX idx_help_articles_audience ON public.help_articles(audience);
CREATE INDEX idx_help_articles_keywords ON public.help_articles USING GIN(keywords);

CREATE OR REPLACE FUNCTION public.set_help_article_ref_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN NEW.ref_id := 'HELP-' || nextval('public.seq_help_article')::text; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_help_articles_ref_id BEFORE INSERT ON public.help_articles FOR EACH ROW EXECUTE FUNCTION public.set_help_article_ref_id();
CREATE TRIGGER trg_help_articles_updated_at BEFORE UPDATE ON public.help_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_articles TO authenticated;
GRANT ALL ON public.help_articles TO service_role;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ha_read_pub" ON public.help_articles FOR SELECT TO authenticated USING (status = 'published' OR has_admin_access(auth.uid()));
CREATE POLICY "ha_admin_all" ON public.help_articles FOR ALL TO authenticated USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));

CREATE TABLE public.help_issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  business_id uuid,
  reporter_user_id uuid,
  page_key text,
  issue_type public.help_issue_type NOT NULL DEFAULT 'other',
  priority public.help_issue_priority NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  screenshot_url text,
  status public.help_issue_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_help_issue_reporter ON public.help_issue_reports(reporter_user_id);
CREATE INDEX idx_help_issue_status ON public.help_issue_reports(status);

CREATE OR REPLACE FUNCTION public.set_help_issue_ref_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN NEW.ref_id := 'ISS-' || nextval('public.seq_help_issue')::text; END IF;
  IF NEW.reporter_user_id IS NULL THEN NEW.reporter_user_id := auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_help_issue_ref_id BEFORE INSERT ON public.help_issue_reports FOR EACH ROW EXECUTE FUNCTION public.set_help_issue_ref_id();
CREATE TRIGGER trg_help_issue_updated_at BEFORE UPDATE ON public.help_issue_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.help_issue_reports TO authenticated;
GRANT ALL ON public.help_issue_reports TO service_role;
ALTER TABLE public.help_issue_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hi_insert_auth" ON public.help_issue_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "hi_read_own" ON public.help_issue_reports FOR SELECT TO authenticated USING (reporter_user_id = auth.uid() OR has_admin_access(auth.uid()));
CREATE POLICY "hi_admin_update" ON public.help_issue_reports FOR UPDATE TO authenticated USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));

CREATE TABLE public.help_feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  business_id uuid,
  user_id uuid,
  category text,
  title text NOT NULL,
  description text,
  votes_count integer NOT NULL DEFAULT 0,
  status public.help_feature_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_help_feature_user ON public.help_feature_requests(user_id);
CREATE INDEX idx_help_feature_status ON public.help_feature_requests(status);

CREATE OR REPLACE FUNCTION public.set_help_feature_ref_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN NEW.ref_id := 'REQ-' || nextval('public.seq_help_request')::text; END IF;
  IF NEW.user_id IS NULL THEN NEW.user_id := auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_help_feature_ref_id BEFORE INSERT ON public.help_feature_requests FOR EACH ROW EXECUTE FUNCTION public.set_help_feature_ref_id();
CREATE TRIGGER trg_help_feature_updated_at BEFORE UPDATE ON public.help_feature_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.help_feature_requests TO authenticated;
GRANT ALL ON public.help_feature_requests TO service_role;
ALTER TABLE public.help_feature_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hf_insert_auth" ON public.help_feature_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "hf_read_own" ON public.help_feature_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_admin_access(auth.uid()));
CREATE POLICY "hf_admin_update" ON public.help_feature_requests FOR UPDATE TO authenticated USING (has_admin_access(auth.uid())) WITH CHECK (has_admin_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.bump_help_article_view(_slug text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.help_articles SET views_count = views_count + 1 WHERE slug = _slug AND status = 'published'; END $$;

CREATE OR REPLACE FUNCTION public.bump_help_article_helpful(_slug text, _helpful boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _helpful THEN UPDATE public.help_articles SET helpful_count = helpful_count + 1 WHERE slug = _slug AND status='published';
  ELSE UPDATE public.help_articles SET not_helpful_count = not_helpful_count + 1 WHERE slug = _slug AND status='published';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.bump_help_article_view(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_help_article_helpful(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_help_article_view(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bump_help_article_helpful(text, boolean) TO authenticated;

INSERT INTO public.help_categories (slug, audience, title_ar, title_en, description_ar, description_en, sort_order) VALUES
('getting-started','general','البدء السريع','Getting Started','تعرّف على قطاعات وكيفية البدء.','Learn what Qitaat is and how to begin.',1),
('business-profile','provider','الملف التجاري','Business Profile','إنشاء وإدارة الملف التجاري.','Create and manage your business profile.',2),
('publishing','provider','النشر العام','Publishing','كيف يصبح ملفك التجاري ظاهرًا في الدليل.','How your profile becomes public in the directory.',3),
('staff-roles','provider','الفريق والصلاحيات','Staff & Roles','إدارة فريق العمل والصلاحيات.','Manage your team and permissions.',4),
('contracts','provider','العقود','Contracts','إدارة العقود والمراحل.','Manage contracts and stages.',5),
('quotations','provider','عروض الأسعار','Quotations','إعداد وإرسال عروض الأسعار.','Create and send quotations.',6),
('boq','provider','جدول الكميات','BOQ','إعداد جدول الكميات.','Build a bill of quantities.',7),
('procurement','provider','المشتريات','Procurement','طلبات عروض الأسعار من الموردين.','RFQs and supplier quotes.',8),
('work-orders','provider','أوامر العمل','Work Orders','من العقد إلى التنفيذ.','From contract to execution.',9),
('production','provider','الإنتاج','Production','لوحة الإنتاج ومراحلها.','Production board and stages.',10),
('customer-tracking','customer','متابعة العميل','Customer Tracking','رابط المتابعة الخاص بالعميل.','The customer tracking link.',11),
('installation','provider','التركيب','Installation','جدولة وتأكيد التركيب.','Schedule and confirm installation.',12),
('project-closure','provider','إقفال المشروع','Project Closure','إقفال المشاريع رسميًا.','Officially close projects.',13),
('warranty','customer','الضمان','Warranty','شروط الضمان وتاريخ بدئه.','Warranty terms and start date.',14),
('feedback','customer','التقييم','Feedback','تقييم تجربتك مع المزود.','Rate your provider experience.',15),
('operations-center','admin','مركز العمليات','Operations Center','مراقبة العمليات على مستوى المنصة.','Platform-wide operations monitoring.',16),
('identity-center','admin','مركز الهوية','Identity Center','إدارة الهويات والصلاحيات.','Manage identities and access.',17);

WITH c AS (SELECT slug, id FROM public.help_categories)
INSERT INTO public.help_articles
  (category_id, slug, audience, status, title_ar, title_en, summary_ar, summary_en, content_ar, content_en, keywords)
SELECT
  (SELECT id FROM c WHERE c.slug = x.cat),
  x.slug, x.audience::public.help_audience, 'published'::public.help_article_status,
  x.title_ar, x.title_en, x.summary_ar, x.summary_en, x.content_ar, x.content_en,
  x.keywords::text[]
FROM (VALUES
('getting-started','what-is-qitaat','general','ما هو قطاعات؟','What is Qitaat?','دليل صناعي رقمي يربط العملاء بمزودي الألمنيوم والزجاج والخشب والحديد.','A digital industrial directory connecting customers with aluminum, glass, wood, and steel providers.','قطاعات منصة سعودية متخصصة بتسهيل العثور على المزودين الموثوقين في القطاعات الصناعية.','Qitaat is a Saudi platform specialized in connecting customers with trusted providers in industrial sectors.','{قطاعات,مقدمة,intro}'),
('getting-started','create-account','general','إنشاء حساب جديد','Create a new account','ابدأ بإنشاء حساب مستخدم خلال دقيقة.','Create a user account in under a minute.','اضغط على تسجيل، أدخل بريدك الإلكتروني وأكمل التحقق.','Click sign up, enter your email and complete verification.','{حساب,تسجيل,signup}'),
('getting-started','find-provider','customer','كيف أجد مزود خدمة؟','How do I find a provider?','ابحث في الدليل أو تصفح القطاعات.','Search the directory or browse sectors.','استخدم صفحة /search أو افتح صفحة القطاع المطلوب.','Use /search or open the target sector page.','{بحث,مزود,search}'),
('getting-started','navigation','general','التنقل في المنصة','Platform navigation','تعرّف على الأقسام الرئيسية.','Learn the main sections.','الرئيسية، البحث، القطاعات، المشاريع، المدونة، التواصل.','Home, Search, Sectors, Projects, Blog, Contact.','{تنقل,navigation}'),
('getting-started','language-direction','general','تغيير اللغة','Switch language','تبديل بين العربية والإنجليزية.','Switch between Arabic and English.','استخدم زر اللغة في الشريط العلوي.','Use the language toggle in the top bar.','{لغة,language}'),
('business-profile','create-business','provider','إنشاء ملف تجاري','Create a business profile','أنشئ ملف تجاري بمعلوماتك الأساسية.','Create a business profile with your basics.','من لوحة التحكم اختر ملفي التجاري ثم أكمل البيانات.','From dashboard choose My Business and fill the data.','{ملف,شركة,business}'),
('business-profile','edit-business','provider','تعديل بيانات الشركة','Edit business data','عدّل بيانات شركتك في أي وقت.','Edit your business data anytime.','افتح /dashboard/business-edit وحرّر الحقول.','Open /dashboard/business-edit and edit fields.','{تعديل,edit}'),
('business-profile','branches','provider','إضافة فروع','Add branches','أضف فروع شركتك المختلفة.','Add your different branches.','من إدارة الفروع أضف الموقع وبيانات الاتصال.','From branch management add the location and contacts.','{فروع,branches}'),
('business-profile','services','provider','إضافة الخدمات','Add services','حدد الخدمات التي تقدمها.','Define your services.','استخدم /dashboard/services لإضافة كل خدمة.','Use /dashboard/services to add each service.','{خدمات,services}'),
('business-profile','portfolio','provider','معرض الأعمال','Portfolio','أضف صور أعمالك السابقة.','Add past work photos.','افتح /dashboard/portfolio وارفع المشاريع.','Open /dashboard/portfolio and upload projects.','{معرض,portfolio}'),
('business-profile','completeness','provider','اكتمال الملف','Profile completeness','تحقق من نسبة اكتمال ملفك.','Check your profile completeness.','تظهر نسبة الاكتمال في أعلى صفحة الملف.','The completeness bar appears at the top of your profile.','{اكتمال,completeness}'),
('publishing','how-publishing-works','provider','كيف يعمل النشر؟','How publishing works','ملفك ينشر بعد الموافقة الإدارية.','Your profile publishes after admin approval.','يجب أن يكون الملف نشط، الحالة منشور، وليس تجريبي.','Profile must be active, status published, and not demo.','{نشر,publish}'),
('publishing','readiness-checklist','provider','قائمة جاهزية النشر','Publishing readiness checklist','تأكد من اكتمال البيانات قبل النشر.','Ensure data completeness before publish.','اسم، شعار، خدمات، عنوان، اتصال، صور.','Name, logo, services, address, contact, photos.','{جاهزية,readiness}'),
('publishing','username','provider','اختيار اسم المستخدم','Choose username','اسم مستخدم فريد لرابطك العام.','A unique username for your public link.','يظهر رابطك على qitaat.com/username.','Your link becomes qitaat.com/username.','{اسم مستخدم,username}'),
('publishing','draft-vs-published','provider','مسودة مقابل منشور','Draft vs published','الفرق بين الحالتين.','Difference between the two states.','المسودة غير ظاهرة للعموم، المنشور ظاهر في الدليل.','Drafts are private, published profiles appear in the directory.','{مسودة,draft,published}'),
('staff-roles','invite-staff','provider','دعوة موظف','Invite staff','أضف أعضاء فريقك.','Add team members.','من إعدادات الفريق أرسل دعوة بالبريد.','From Team settings send an email invite.','{دعوة,invite}'),
('staff-roles','roles-overview','provider','نظرة على الصلاحيات','Roles overview','أدوار وصلاحيات الفريق.','Team roles and permissions.','مالك، مدير، فني، مشاهد.','Owner, Manager, Technician, Viewer.','{أدوار,roles}'),
('staff-roles','accept-invite','provider','قبول الدعوة','Accept invite','الموظف الجديد يقبل الدعوة.','New staff accepts the invite.','افتح رابط الدعوة من البريد وأكمل الحساب.','Open the invite link in email and complete the account.','{قبول,accept}'),
('staff-roles','remove-staff','provider','إزالة موظف','Remove staff','إزالة عضو من الفريق.','Remove a team member.','من قائمة الفريق اختر إزالة.','From the team list choose remove.','{إزالة,remove}'),
('contracts','contract-lifecycle','provider','دورة حياة العقد','Contract lifecycle','مسودة، نشط، مكتمل.','Draft, Active, Completed.','يقفل العقد فور تفعيله ولا يقبل تعديلات إلا بالملاحق.','Contract locks on activation; only amendments are allowed.','{عقد,contract}'),
('contracts','create-contract','provider','إنشاء عقد','Create a contract','أنشئ عقدًا جديدًا.','Create a new contract.','من /dashboard/contracts اختر إضافة عقد.','From /dashboard/contracts choose Add contract.','{إنشاء,create}'),
('contracts','payments','provider','الدفعات','Payments','30% بداية، 40% مرحلة، 30% تسليم.','30% start, 40% milestone, 30% delivery.','هذا هو الجدول الافتراضي ويمكن تخصيصه.','This is the default schedule, customizable.','{دفعات,payments}'),
('contracts','vat','provider','ضريبة القيمة المضافة','VAT','ضريبة 15% شاملة.','15% VAT inclusive.','الأسعار في قطاعات شاملة للضريبة.','Prices in Qitaat are VAT-inclusive.','{ضريبة,vat}'),
('contracts','amendments','provider','ملاحق العقد','Contract amendments','تعديلات على عقد نشط.','Edits on an active contract.','أضف ملحقًا موقعًا من الطرفين.','Add an amendment signed by both parties.','{ملحق,amendment}'),
('contracts','export-pdf','provider','تصدير العقد PDF','Export contract PDF','تنزيل العقد كملف PDF.','Download contract as PDF.','استخدم زر التصدير في صفحة العقد.','Use the Export button on the contract page.','{تصدير,pdf}'),
('quotations','create-quote','provider','إنشاء عرض سعر','Create a quotation','أنشئ عرض سعر جديد.','Create a new quotation.','من قائمة العملاء أضف عرضًا جديدًا.','From clients list add a new quote.','{عرض,quote}'),
('quotations','quote-to-contract','provider','من العرض إلى العقد','Quotation to contract','تحويل عرض مقبول إلى عقد.','Convert an accepted quote to a contract.','اضغط تحويل إلى عقد من صفحة العرض.','Press Convert to Contract on the quote.','{تحويل,convert}'),
('quotations','quote-pdf','provider','تصدير عرض PDF','Export quote PDF','حمّل عرضك بصيغة PDF.','Download your quote as PDF.','استخدم زر التصدير في الأعلى.','Use the Export button on top.','{تصدير,pdf}'),
('quotations','quote-validity','provider','صلاحية العرض','Quote validity','حدد مدة صلاحية العرض.','Set the quote validity period.','الافتراضي 14 يوم وقابل للتعديل.','Default is 14 days, editable.','{صلاحية,validity}'),
('quotations','quote-followup','provider','متابعة العرض','Follow up on quote','إشعار العميل بعرضك.','Notify the customer about your quote.','يتم الإرسال تلقائيًا عند الحفظ.','It is sent automatically on save.','{متابعة,followup}'),
('boq','what-is-boq','provider','ما هو جدول الكميات؟','What is BOQ?','جدول مفصل للبنود والكميات.','A detailed schedule of items and quantities.','يستخدم لتقدير التكلفة بدقة.','Used to estimate cost precisely.','{جدول,boq}'),
('boq','import-csv','provider','استيراد BOQ من CSV','Import BOQ from CSV','حمّل ملف CSV لاستيراد البنود.','Upload a CSV file to import items.','استخدم زر استيراد في صفحة BOQ.','Use the Import button on the BOQ page.','{استيراد,csv}'),
('boq','units','provider','وحدات القياس','Units','يستخدم النظام المليمتر للقياسات.','The system uses millimeters for measurements.','المساحات بالمتر المربع، الأسعار بالريال.','Areas in m², prices in SAR.','{وحدات,units}'),
('boq','boq-totals','provider','المجاميع التلقائية','Auto totals','حساب المجموع تلقائيًا.','Auto totals calculation.','تتحدّث المجاميع فور تعديل البنود.','Totals update on item changes.','{مجاميع,totals}'),
('procurement','what-is-rfq','provider','ما هو RFQ؟','What is an RFQ?','طلب عرض سعر من المورّدين.','Request for Quotation from suppliers.','أرسل RFQ لعدة موردين وقارن العروض.','Send RFQs to multiple suppliers and compare.','{rfq}'),
('procurement','create-rfq','provider','إنشاء RFQ','Create an RFQ','أنشئ طلب عرض جديد.','Create a new RFQ.','من /dashboard/procurement أنشئ طلبًا.','From /dashboard/procurement create a request.','{إنشاء,create}'),
('procurement','supplier-quotes','provider','عروض الموردين','Supplier quotes','استلام ومقارنة عروض الموردين.','Receive and compare supplier quotes.','تظهر الأسعار في جدول مقارنة.','Prices appear in a comparison table.','{عروض,quotes}'),
('procurement','award','provider','ترسية الطلب','Award the order','اختر الفائز.','Pick the winner.','اضغط ترسية على عرض المورد.','Press Award on a supplier quote.','{ترسية,award}'),
('procurement','po-draft','provider','مسودة أمر الشراء','PO draft','إنشاء مسودة أمر شراء.','Create a purchase order draft.','تنتج تلقائيًا بعد الترسية.','Auto-generated after award.','{po}'),
('work-orders','what-is-wo','provider','ما هو أمر العمل؟','What is a work order?','مهمة تنفيذية مرتبطة بعقد.','An execution task linked to a contract.','يحوي القياسات، BOQ، المهام.','Contains measurements, BOQ, tasks.','{أمر,work}'),
('work-orders','create-wo','provider','إنشاء أمر عمل','Create a work order','أنشئ أمر عمل من عقد.','Create a work order from a contract.','افتح العقد ثم أضف أمر عمل.','Open the contract then add a work order.','{إنشاء,create}'),
('work-orders','measurements','provider','القياسات','Measurements','إضافة قياسات الموقع.','Add site measurements.','استخدم الملليمتر، يمكن الاستيراد من CSV.','Use millimeters, CSV import available.','{قياسات,measurements}'),
('work-orders','wo-boq','provider','BOQ لأمر العمل','BOQ for work order','اربط BOQ بأمر العمل.','Link BOQ to a work order.','من تبويب BOQ في تفاصيل الأمر.','From the BOQ tab in the order details.','{boq}'),
('work-orders','wo-rfq','provider','RFQ لأمر العمل','RFQ for work order','أنشئ RFQ من داخل الأمر.','Create an RFQ from inside the order.','افتح تبويب المشتريات وأنشئ طلبًا.','Open Procurement tab and create a request.','{rfq}'),
('work-orders','wo-production','provider','الإنتاج لأمر العمل','Production for work order','تتبع مراحل الإنتاج.','Track production stages.','تظهر اللوحة في تبويب الإنتاج.','The board appears in the Production tab.','{production}'),
('production','production-board','provider','لوحة الإنتاج','Production board','عرض كانبان لمراحل الإنتاج.','Kanban view of production stages.','اسحب البطاقات بين الأعمدة.','Drag cards between columns.','{kanban}'),
('production','stages','provider','مراحل الإنتاج','Production stages','من الورشة إلى التسليم.','From workshop to delivery.','تخصيص، تصنيع، تجميع، فحص، تسليم.','Cutting, fabrication, assembly, QC, delivery.','{stages}'),
('production','realtime','provider','تحديث فوري','Realtime updates','تحديثات لحظية للوحة.','Live updates on the board.','يعتمد على Supabase Realtime.','Powered by Realtime.','{realtime}'),
('production','reassign','provider','إعادة تعيين','Reassign','إعادة توزيع المهام.','Reassign tasks.','من قائمة البطاقة اختر الفني.','From card menu pick a technician.','{reassign}'),
('customer-tracking','tracking-link','customer','رابط المتابعة','Tracking link','رابط فريد لمتابعة مشروعك.','A unique link to track your project.','يصلك الرابط من المزود ولا يحتاج تسجيل دخول.','You receive the link from the provider; no login needed.','{tracking}'),
('customer-tracking','what-you-see','customer','ماذا أرى؟','What you see','تقدّم المشروع والمواعيد.','Progress and appointments.','مراحل الإنتاج، التركيب، الإقفال.','Production, installation, closure.','{stages}'),
('customer-tracking','privacy','customer','الخصوصية','Privacy','بياناتك محمية.','Your data is protected.','لا تظهر أرقام داخلية ولا معرّفات حساسة.','No internal IDs or sensitive data shown.','{privacy}'),
('customer-tracking','support','customer','الدعم','Support','تواصل مع المزود مباشرة.','Contact the provider directly.','زر التواصل ظاهر داخل الرابط.','A Contact button is visible inside the link.','{support}'),
('installation','schedule','provider','جدولة التركيب','Schedule installation','حدد موعد تركيب.','Schedule an installation.','من تبويب التركيب اختر تاريخ.','From Installation tab pick a date.','{schedule}'),
('installation','confirm','customer','تأكيد التركيب','Confirm installation','أكّد الموعد عبر رابط المتابعة.','Confirm via tracking link.','اضغط تأكيد الموعد المقترح.','Press Confirm on the proposed time.','{confirm}'),
('installation','reschedule','provider','إعادة الجدولة','Reschedule','تغيير موعد التركيب.','Change the installation time.','اقترح موعدًا بديلًا للعميل.','Propose an alternative time to the customer.','{reschedule}'),
('project-closure','closure-flow','provider','تدفق الإقفال','Closure flow','خطوات إقفال المشروع.','Project closure steps.','تسليم، تأكيد العميل، بدء الضمان.','Handover, customer confirm, warranty start.','{closure}'),
('project-closure','customer-confirm','customer','تأكيد التسليم','Customer confirmation','تأكيد استلام المشروع.','Confirm project receipt.','من رابط المتابعة اضغط استلمت.','From tracking link press Received.','{received}'),
('project-closure','closure-pdf','provider','تقرير الإقفال','Closure report','تقرير الإقفال بصيغة PDF.','Closure report as PDF.','يصدر من صفحة المشروع.','Exported from the project page.','{report}'),
('warranty','warranty-start','customer','متى يبدأ الضمان؟','When does warranty start?','يبدأ بعد تأكيد العميل التسليم.','Starts after customer confirms handover.','تحسب المدة من تاريخ التأكيد.','Duration counts from confirmation date.','{warranty}'),
('warranty','coverage','customer','ما هو المغطى؟','What is covered?','يوضح المزود تغطية الضمان.','Provider declares coverage.','اقرأ بنود الضمان في عقدك.','Read warranty terms in your contract.','{coverage}'),
('warranty','file-claim','customer','تقديم مطالبة','File a claim','بلّغ المزود عن أي عطل.','Report a defect to the provider.','استخدم زر التواصل في رابط المتابعة.','Use the Contact button in your tracking link.','{claim}'),
('warranty','warranty-expiry','customer','انتهاء الضمان','Warranty expiry','تاريخ انتهاء الضمان.','Warranty expiry date.','يظهر في صفحة الضمان لديك.','Shown on your warranty page.','{expiry}'),
('feedback','rate-provider','customer','تقييم المزود','Rate provider','قيّم تجربتك بعد التسليم.','Rate your experience after handover.','من رابط المتابعة بعد الإقفال.','From tracking link after closure.','{rate}'),
('feedback','nps','customer','مؤشر الرضا NPS','NPS satisfaction','سؤال واحد لقياس الرضا.','A single satisfaction question.','اختر رقمًا من 0 إلى 10.','Pick a number from 0 to 10.','{nps}'),
('operations-center','overview','admin','نظرة عامة','Overview','مؤشرات المنصة الشاملة.','Platform-wide KPIs.','الإيرادات، أزمنة الدورات، سلامة البيانات.','Revenue, cycle times, data integrity.','{operations}'),
('operations-center','data-integrity','admin','سلامة البيانات','Data integrity','فحوصات سلامة البيانات الدورية.','Periodic data integrity checks.','عقود بلا أوامر عمل، ضمانات منتهية.','Contracts without work orders, expired warranties.','{integrity}'),
('operations-center','cycle-times','admin','أزمنة الدورات','Cycle times','متوسطات الأزمنة.','Average cycle times.','الموافقة، التحويل، الإكمال.','Approval, conversion, completion.','{cycle}'),
('operations-center','revenue','admin','مسار الإيرادات','Revenue pipeline','تجميع قمع المبيعات.','Sales funnel summary.','عروض مفتوحة وعقود نشطة.','Open quotations and active contracts.','{revenue}'),
('identity-center','identity-overview','admin','نظرة على الهويات','Identity overview','إدارة الهويات والصلاحيات.','Manage identities and access.','المستخدمين، الأدوار، الإجراءات.','Users, roles, actions.','{identity}'),
('identity-center','approve-providers','admin','اعتماد المزودين','Approve providers','مراجعة المزودين الجدد.','Review new providers.','من /admin/provider-review اعتمد ثم انشر.','From /admin/provider-review approve then publish.','{approve}'),
('identity-center','diagnostics','admin','أدوات التشخيص','Diagnostics','أدوات تشخيص الحساب.','Account diagnostics tools.','من /admin/diagnostics افحص أي حساب.','From /admin/diagnostics inspect any account.','{diagnostics}')
) AS x(cat, slug, audience, title_ar, title_en, summary_ar, summary_en, content_ar, content_en, keywords);
