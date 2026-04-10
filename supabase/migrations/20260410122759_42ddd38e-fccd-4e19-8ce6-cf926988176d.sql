
-- ============================================================
-- 1. MEMBERSHIP PLANS
-- ============================================================
CREATE TABLE public.membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier membership_tier NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  currency_code varchar NOT NULL DEFAULT 'SAR',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans viewable by everyone" ON public.membership_plans
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage plans" ON public.membership_plans
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Seed default plans
INSERT INTO public.membership_plans (tier, name_ar, name_en, description_ar, description_en, price_monthly, price_yearly, features, limits, sort_order) VALUES
('free', 'مجانية', 'Free', 'الخطة المجانية الأساسية', 'Basic free plan', 0, 0,
  '["إنشاء حساب أعمال","3 مشاريع في المعرض","5 خدمات","تقييمات العملاء"]'::jsonb,
  '{"max_projects":3,"max_services":5,"max_portfolio":10,"max_promotions":1,"priority_support":false,"verified_badge":false,"analytics":false}'::jsonb, 0),
('basic', 'أساسية', 'Basic', 'خطة أساسية للأعمال الصغيرة', 'Basic plan for small businesses', 99, 990,
  '["كل مميزات المجانية","10 مشاريع","15 خدمة","5 عروض ترويجية","إحصائيات أساسية"]'::jsonb,
  '{"max_projects":10,"max_services":15,"max_portfolio":30,"max_promotions":5,"priority_support":false,"verified_badge":false,"analytics":true}'::jsonb, 1),
('premium', 'احترافية', 'Premium', 'خطة احترافية للأعمال المتوسطة', 'Professional plan for medium businesses', 249, 2490,
  '["كل مميزات الأساسية","مشاريع غير محدودة","خدمات غير محدودة","شارة التوثيق","أولوية في البحث","إحصائيات متقدمة","دعم أولوي"]'::jsonb,
  '{"max_projects":-1,"max_services":-1,"max_portfolio":-1,"max_promotions":20,"priority_support":true,"verified_badge":true,"analytics":true}'::jsonb, 2),
('enterprise', 'مؤسسات', 'Enterprise', 'خطة المؤسسات الكبيرة', 'Enterprise plan for large businesses', 499, 4990,
  '["كل مميزات الاحترافية","كل شيء غير محدود","مدير حساب مخصص","API كامل","تقارير مخصصة","دعم 24/7"]'::jsonb,
  '{"max_projects":-1,"max_services":-1,"max_portfolio":-1,"max_promotions":-1,"priority_support":true,"verified_badge":true,"analytics":true,"dedicated_manager":true,"api_access":true}'::jsonb, 3);

-- ============================================================
-- 2. MEMBERSHIP SUBSCRIPTIONS
-- ============================================================
CREATE TABLE public.membership_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL DEFAULT generate_ref_id('SUB', 'seq_sub'),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.membership_plans(id),
  status varchar NOT NULL DEFAULT 'active',
  billing_cycle varchar NOT NULL DEFAULT 'monthly',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  cancelled_at timestamptz,
  payment_method varchar,
  external_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.seq_sub START WITH 1000001;

CREATE INDEX idx_membership_subs_user ON public.membership_subscriptions(user_id);
CREATE INDEX idx_membership_subs_business ON public.membership_subscriptions(business_id);

ALTER TABLE public.membership_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.membership_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.membership_subscriptions
  FOR SELECT TO authenticated USING (has_admin_access(auth.uid()));

CREATE POLICY "Users can create own subscriptions" ON public.membership_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.membership_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.membership_subscriptions
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- ============================================================
-- 3. TAGS SYSTEM
-- ============================================================
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  slug varchar NOT NULL UNIQUE,
  tag_group varchar NOT NULL DEFAULT 'general',
  icon text,
  color varchar,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tags_group ON public.tags(tag_group);
CREATE INDEX idx_tags_slug ON public.tags(slug);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags viewable by everyone" ON public.tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags" ON public.tags
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Entity-Tag linking table
CREATE TABLE public.entity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  entity_type varchar NOT NULL, -- 'business', 'project', 'service', 'blog_post', 'profile_system'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tag_id, entity_id, entity_type)
);

CREATE INDEX idx_entity_tags_entity ON public.entity_tags(entity_id, entity_type);
CREATE INDEX idx_entity_tags_tag ON public.entity_tags(tag_id);

ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity tags viewable by everyone" ON public.entity_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage entity tags" ON public.entity_tags
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

CREATE POLICY "Business owners can tag their entities" ON public.entity_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    (entity_type = 'business' AND EXISTS (SELECT 1 FROM businesses WHERE id = entity_id AND user_id = auth.uid()))
    OR (entity_type = 'project' AND EXISTS (SELECT 1 FROM projects p JOIN businesses b ON b.id = p.business_id WHERE p.id = entity_id AND b.user_id = auth.uid()))
    OR (entity_type = 'service' AND EXISTS (SELECT 1 FROM business_services s JOIN businesses b ON b.id = s.business_id WHERE s.id = entity_id AND b.user_id = auth.uid()))
  );

CREATE POLICY "Business owners can untag their entities" ON public.entity_tags
  FOR DELETE TO authenticated
  USING (
    (entity_type = 'business' AND EXISTS (SELECT 1 FROM businesses WHERE id = entity_id AND user_id = auth.uid()))
    OR (entity_type = 'project' AND EXISTS (SELECT 1 FROM projects p JOIN businesses b ON b.id = p.business_id WHERE p.id = entity_id AND b.user_id = auth.uid()))
    OR (entity_type = 'service' AND EXISTS (SELECT 1 FROM business_services s JOIN businesses b ON b.id = s.business_id WHERE s.id = entity_id AND b.user_id = auth.uid()))
  );

-- Seed common tags
INSERT INTO public.tags (name_ar, name_en, slug, tag_group, sort_order) VALUES
('نوافذ منزلقة', 'Sliding Windows', 'sliding-windows', 'product', 1),
('نوافذ مفصلية', 'Hinged Windows', 'hinged-windows', 'product', 2),
('أبواب أمان', 'Security Doors', 'security-doors', 'product', 3),
('واجهات زجاجية', 'Glass Facades', 'glass-facades', 'product', 4),
('شتر كهربائي', 'Electric Shutters', 'electric-shutters', 'product', 5),
('مطابخ حديثة', 'Modern Kitchens', 'modern-kitchens', 'product', 6),
('درابزين استيل', 'Steel Railings', 'steel-railings', 'product', 7),
('زجاج عازل', 'Insulated Glass', 'insulated-glass', 'material', 8),
('ألمنيوم مكسور الجسر الحراري', 'Thermal Break Aluminum', 'thermal-break', 'material', 9),
('تصميم داخلي', 'Interior Design', 'interior-design', 'service', 10),
('تركيب وتوريد', 'Supply & Install', 'supply-install', 'service', 11),
('صيانة دورية', 'Periodic Maintenance', 'periodic-maintenance', 'service', 12),
('ضمان 10 سنوات', '10 Year Warranty', 'warranty-10y', 'feature', 13),
('توصيل مجاني', 'Free Delivery', 'free-delivery', 'feature', 14),
('عروض خاصة', 'Special Offers', 'special-offers', 'promo', 15);

-- ============================================================
-- 4. HIERARCHICAL CATEGORIES IMPROVEMENTS
-- ============================================================
-- parent_id already exists on categories table, add depth index
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- Seed sub-categories for existing main categories
-- First, get parent IDs and insert sub-categories
DO $$
DECLARE
  _aluminum_id uuid;
  _iron_id uuid;
  _glass_id uuid;
  _wood_id uuid;
  _accessories_id uuid;
  _designers_id uuid;
BEGIN
  SELECT id INTO _aluminum_id FROM categories WHERE slug = 'aluminum' LIMIT 1;
  SELECT id INTO _iron_id FROM categories WHERE slug = 'iron' LIMIT 1;
  SELECT id INTO _glass_id FROM categories WHERE slug = 'glass' LIMIT 1;
  SELECT id INTO _wood_id FROM categories WHERE slug = 'wood' LIMIT 1;
  SELECT id INTO _accessories_id FROM categories WHERE slug = 'accessories' LIMIT 1;
  SELECT id INTO _designers_id FROM categories WHERE slug = 'designers' LIMIT 1;

  -- Aluminum sub-categories
  IF _aluminum_id IS NOT NULL THEN
    INSERT INTO categories (name_ar, name_en, slug, parent_id, sort_order) VALUES
    ('نوافذ', 'Windows', 'aluminum-windows', _aluminum_id, 1),
    ('أبواب', 'Doors', 'aluminum-doors', _aluminum_id, 2),
    ('واجهات', 'Facades', 'aluminum-facades', _aluminum_id, 3),
    ('شتر', 'Shutters', 'aluminum-shutters', _aluminum_id, 4),
    ('قطاعات', 'Profiles', 'aluminum-profiles', _aluminum_id, 5)
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  -- Iron sub-categories
  IF _iron_id IS NOT NULL THEN
    INSERT INTO categories (name_ar, name_en, slug, parent_id, sort_order) VALUES
    ('أبواب حديد', 'Iron Doors', 'iron-doors', _iron_id, 1),
    ('درابزين', 'Railings', 'iron-railings', _iron_id, 2),
    ('هياكل معدنية', 'Metal Structures', 'metal-structures', _iron_id, 3),
    ('بوابات', 'Gates', 'iron-gates', _iron_id, 4)
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  -- Glass sub-categories
  IF _glass_id IS NOT NULL THEN
    INSERT INTO categories (name_ar, name_en, slug, parent_id, sort_order) VALUES
    ('زجاج سيكوريت', 'Securit Glass', 'securit-glass', _glass_id, 1),
    ('زجاج مزدوج', 'Double Glass', 'double-glass', _glass_id, 2),
    ('مرايا', 'Mirrors', 'mirrors', _glass_id, 3),
    ('زجاج ملون', 'Colored Glass', 'colored-glass', _glass_id, 4)
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  -- Wood sub-categories
  IF _wood_id IS NOT NULL THEN
    INSERT INTO categories (name_ar, name_en, slug, parent_id, sort_order) VALUES
    ('مطابخ', 'Kitchens', 'wood-kitchens', _wood_id, 1),
    ('غرف ملابس', 'Wardrobes', 'wood-wardrobes', _wood_id, 2),
    ('أبواب خشبية', 'Wooden Doors', 'wood-doors', _wood_id, 3),
    ('أثاث مكتبي', 'Office Furniture', 'office-furniture', _wood_id, 4)
    ON CONFLICT (slug) DO NOTHING;
  END IF;

  -- Accessories sub-categories
  IF _accessories_id IS NOT NULL THEN
    INSERT INTO categories (name_ar, name_en, slug, parent_id, sort_order) VALUES
    ('مقابض', 'Handles', 'handles', _accessories_id, 1),
    ('مفصلات', 'Hinges', 'hinges', _accessories_id, 2),
    ('إغلاقات', 'Closures', 'closures', _accessories_id, 3),
    ('عجلات', 'Rollers', 'rollers', _accessories_id, 4)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- 5. MESSAGE TEMPLATES
-- ============================================================
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  title_ar text NOT NULL,
  title_en text,
  content_ar text NOT NULL,
  content_en text,
  category varchar NOT NULL DEFAULT 'general',
  is_global boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_msg_templates_business ON public.message_templates(business_id);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates viewable by owner or global" ON public.message_templates
  FOR SELECT TO authenticated
  USING (
    is_global = true
    OR (business_id IS NOT NULL AND EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND user_id = auth.uid()))
    OR has_admin_access(auth.uid())
  );

CREATE POLICY "Business owners can manage their templates" ON public.message_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    (business_id IS NOT NULL AND EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND user_id = auth.uid()))
    OR has_admin_access(auth.uid())
  );

CREATE POLICY "Business owners can update their templates" ON public.message_templates
  FOR UPDATE TO authenticated
  USING (
    (business_id IS NOT NULL AND EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND user_id = auth.uid()))
    OR has_admin_access(auth.uid())
  );

CREATE POLICY "Business owners can delete their templates" ON public.message_templates
  FOR DELETE TO authenticated
  USING (
    (business_id IS NOT NULL AND EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND user_id = auth.uid()))
    OR has_admin_access(auth.uid())
  );

-- Seed global templates
INSERT INTO public.message_templates (title_ar, title_en, content_ar, content_en, category, is_global) VALUES
('استفسار عن خدمة', 'Service Inquiry', 'السلام عليكم، أود الاستفسار عن خدماتكم وأسعاركم. هل يمكنكم مساعدتي؟', 'Hello, I would like to inquire about your services and prices. Can you help?', 'inquiry', true),
('طلب عرض سعر', 'Price Quote Request', 'السلام عليكم، أرغب في الحصول على عرض سعر للمشروع التالي:', 'Hello, I would like to get a price quote for the following project:', 'quote', true),
('شكر وتقدير', 'Thank You', 'شكراً لكم على الخدمة الممتازة والتعامل الراقي. نتمنى لكم التوفيق.', 'Thank you for the excellent service and professional treatment. We wish you success.', 'thanks', true),
('متابعة مشروع', 'Project Follow-up', 'السلام عليكم، أود متابعة حالة المشروع رقم [رقم المشروع]. ما هي آخر المستجدات؟', 'Hello, I would like to follow up on project #[project number]. What are the latest updates?', 'follow_up', true),
('طلب صيانة', 'Maintenance Request', 'السلام عليكم، أحتاج إلى خدمة صيانة للمنتج/المشروع المنفذ سابقاً. التفاصيل:', 'Hello, I need maintenance service for a previously completed product/project. Details:', 'maintenance', true);

-- ============================================================
-- 6. GROUP CONVERSATIONS
-- ============================================================
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS group_name text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS group_avatar_url text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role varchar NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_members_conv ON public.conversation_members(conversation_id);
CREATE INDEX idx_conv_members_user ON public.conversation_members(user_id);

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their group memberships" ON public.conversation_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid() AND cm.is_active = true
    )
  );

CREATE POLICY "Group admin can manage members" ON public.conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid() AND cm.role = 'admin' AND cm.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_members.conversation_id AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Group admin can update members" ON public.conversation_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid() AND cm.role = 'admin' AND cm.is_active = true
    )
  );

-- ============================================================
-- 7. OPERATIONS LOG (User-facing activity tracking)
-- ============================================================
CREATE TABLE public.operations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL DEFAULT generate_ref_id('OPS', 'seq_ops'),
  user_id uuid NOT NULL,
  operation_type varchar NOT NULL,
  entity_type varchar NOT NULL,
  entity_id uuid,
  title_ar text NOT NULL,
  title_en text,
  details jsonb DEFAULT '{}'::jsonb,
  status varchar NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.seq_ops START WITH 1000001;

CREATE INDEX idx_operations_log_user ON public.operations_log(user_id);
CREATE INDEX idx_operations_log_type ON public.operations_log(operation_type);
CREATE INDEX idx_operations_log_entity ON public.operations_log(entity_id, entity_type);
CREATE INDEX idx_operations_log_created ON public.operations_log(created_at DESC);

ALTER TABLE public.operations_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own operations" ON public.operations_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert operations" ON public.operations_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all operations" ON public.operations_log
  FOR SELECT TO authenticated USING (has_admin_access(auth.uid()));

-- ============================================================
-- 8. AUTO-LOG OPERATIONS TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_contract_operation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO operations_log (user_id, operation_type, entity_type, entity_id, title_ar, title_en, details)
    VALUES (NEW.client_id, 'create', 'contract', NEW.id,
      'إنشاء عقد جديد: ' || NEW.title_ar,
      'New contract created: ' || COALESCE(NEW.title_en, NEW.title_ar),
      jsonb_build_object('contract_number', NEW.contract_number, 'amount', NEW.total_amount, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO operations_log (user_id, operation_type, entity_type, entity_id, title_ar, title_en, details)
    VALUES (NEW.client_id, 'status_change', 'contract', NEW.id,
      'تغيير حالة العقد ' || NEW.contract_number || ' إلى ' || NEW.status,
      'Contract ' || NEW.contract_number || ' status changed to ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_contract_ops
  AFTER INSERT OR UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION log_contract_operation();

CREATE OR REPLACE FUNCTION public.log_project_operation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_id uuid;
BEGIN
  SELECT user_id INTO _user_id FROM businesses WHERE id = NEW.business_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO operations_log (user_id, operation_type, entity_type, entity_id, title_ar, title_en, details)
    VALUES (_user_id, 'create', 'project', NEW.id,
      'إضافة مشروع جديد: ' || NEW.title_ar,
      'New project added: ' || COALESCE(NEW.title_en, NEW.title_ar),
      jsonb_build_object('status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_project_ops
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION log_project_operation();

CREATE OR REPLACE FUNCTION public.log_review_operation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _biz_user uuid;
BEGIN
  SELECT user_id INTO _biz_user FROM businesses WHERE id = NEW.business_id;
  -- Log for business owner
  INSERT INTO operations_log (user_id, operation_type, entity_type, entity_id, title_ar, title_en, details)
  VALUES (_biz_user, 'review_received', 'review', NEW.id,
    'تقييم جديد بقيمة ' || NEW.rating || ' نجوم',
    'New ' || NEW.rating || '-star review received',
    jsonb_build_object('rating', NEW.rating, 'reviewer_id', NEW.user_id));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_review_ops
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION log_review_operation();

-- Updated at triggers for new tables
CREATE TRIGGER update_membership_plans_updated_at
  BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_subs_updated_at
  BEFORE UPDATE ON public.membership_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
