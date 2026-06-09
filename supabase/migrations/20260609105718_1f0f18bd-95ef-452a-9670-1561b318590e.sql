-- 1) Table
CREATE TABLE public.home_faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL DEFAULT 0,
  question_ar text NOT NULL,
  answer_ar text NOT NULL,
  question_en text,
  answer_en text,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- 2) Grants
GRANT SELECT ON public.home_faq_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_faq_items TO authenticated;
GRANT ALL ON public.home_faq_items TO service_role;

-- 3) RLS
ALTER TABLE public.home_faq_items ENABLE ROW LEVEL SECURITY;

-- 4) Policies
CREATE POLICY "home_faq_items_public_read_enabled"
  ON public.home_faq_items FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "home_faq_items_admin_read_all"
  ON public.home_faq_items FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "home_faq_items_admin_insert"
  ON public.home_faq_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "home_faq_items_admin_update"
  ON public.home_faq_items FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "home_faq_items_admin_delete"
  ON public.home_faq_items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) Validation trigger (length checks)
CREATE OR REPLACE FUNCTION public.home_faq_items_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.question_ar) < 5 OR length(NEW.question_ar) > 180 THEN
    RAISE EXCEPTION 'question_ar length must be between 5 and 180 chars';
  END IF;
  IF length(NEW.answer_ar) < 10 OR length(NEW.answer_ar) > 1200 THEN
    RAISE EXCEPTION 'answer_ar length must be between 10 and 1200 chars';
  END IF;
  IF NEW.question_en IS NOT NULL AND length(NEW.question_en) > 180 THEN
    RAISE EXCEPTION 'question_en length must be <= 180 chars';
  END IF;
  IF NEW.answer_en IS NOT NULL AND length(NEW.answer_en) > 1200 THEN
    RAISE EXCEPTION 'answer_en length must be <= 1200 chars';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_home_faq_items_validate
  BEFORE INSERT OR UPDATE ON public.home_faq_items
  FOR EACH ROW EXECUTE FUNCTION public.home_faq_items_validate();

-- 6) Index
CREATE INDEX idx_home_faq_items_enabled_sort
  ON public.home_faq_items (is_enabled, sort_order);

-- 7) Seed from faqItems.ts (5 items)
INSERT INTO public.home_faq_items (sort_order, question_ar, answer_ar, question_en, answer_en, is_enabled) VALUES
  (10, 'ما هي قطاعات؟', 'منصة تساعدك على الوصول إلى مزودي خدمات الصناعات الخفيفة وطلب عروض أسعار بطريقة منظمة.', 'What is Qitaat?', 'A platform that helps you reach light-industry service providers and request quotes in an organized way.', true),
  (20, 'هل قطاعات تنفذ الأعمال؟', 'لا. قطاعات تساعد على الربط بين العميل ومزودي الخدمة، ولا تنفذ الأعمال مباشرة.', 'Does Qitaat execute the work?', 'No. Qitaat connects clients with providers and does not execute work directly.', true),
  (30, 'كيف أطلب عرض سعر؟', 'اختر القطاع، أضف تفاصيل مشروعك، ثم أرسل الطلب للمزودين المناسبين.', 'How do I request a quote?', 'Pick a sector, add your project details, then send the request to suitable providers.', true),
  (40, 'هل يمكن للمزودين التسجيل؟', 'نعم. يمكن للورش والمصانع والمعارض وفرق التنفيذ إنشاء ملف لعرض خدماتهم.', 'Can providers register?', 'Yes. Workshops, factories, showrooms and install teams can create a profile.', true),
  (50, 'هل المنصة مناسبة للمقاولين؟', 'نعم. تساعد المقاولين على الوصول إلى مزودي تنفيذ حسب القطاع والمدينة.', 'Is the platform good for contractors?', 'Yes. It helps contractors find execution partners by sector and city.', true);
