
CREATE TABLE IF NOT EXISTS public.system_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  label_ar TEXT NOT NULL,
  label_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon TEXT,
  route TEXT,
  is_core BOOLEAN NOT NULL DEFAULT false,
  default_enabled BOOLEAN NOT NULL DEFAULT true,
  default_account_types TEXT[] NOT NULL DEFAULT ARRAY['provider','client','individual']::TEXT[],
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_modules TO anon, authenticated;
GRANT ALL ON public.system_modules TO service_role;
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_modules readable by everyone" ON public.system_modules;
CREATE POLICY "system_modules readable by everyone"
  ON public.system_modules FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "system_modules admin manage" ON public.system_modules;
CREATE POLICY "system_modules admin manage"
  ON public.system_modules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE IF NOT EXISTS public.system_module_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL REFERENCES public.system_modules(key) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global_default','account_type','user')),
  scope_value TEXT,
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  set_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_key, scope_type, scope_value)
);

CREATE INDEX IF NOT EXISTS idx_sysmod_overrides_lookup
  ON public.system_module_overrides (scope_type, scope_value, module_key);

GRANT SELECT ON public.system_module_overrides TO authenticated;
GRANT ALL ON public.system_module_overrides TO service_role;
ALTER TABLE public.system_module_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sysmod_overrides self read" ON public.system_module_overrides;
CREATE POLICY "sysmod_overrides self read"
  ON public.system_module_overrides FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR scope_type = 'global_default'
    OR (scope_type = 'user' AND scope_value = auth.uid()::text)
    OR (scope_type = 'account_type' AND scope_value IN (
       SELECT account_type::text FROM public.profiles WHERE user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "sysmod_overrides admin manage" ON public.system_module_overrides;
CREATE POLICY "sysmod_overrides admin manage"
  ON public.system_module_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS trg_sysmod_updated_at ON public.system_modules;
CREATE TRIGGER trg_sysmod_updated_at
  BEFORE UPDATE ON public.system_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sysmod_ov_updated_at ON public.system_module_overrides;
CREATE TRIGGER trg_sysmod_ov_updated_at
  BEFORE UPDATE ON public.system_module_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_user_visible_modules(_user_id UUID)
RETURNS TABLE (
  module_key TEXT,
  enabled BOOLEAN,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account_type TEXT;
BEGIN
  SELECT account_type::text INTO _account_type FROM public.profiles WHERE user_id = _user_id;

  RETURN QUERY
  SELECT
    m.key AS module_key,
    COALESCE(uo.enabled, ato.enabled, go.enabled, m.default_enabled) AS enabled,
    CASE
      WHEN m.is_core THEN 'core'
      WHEN uo.enabled IS NOT NULL THEN 'user'
      WHEN ato.enabled IS NOT NULL THEN 'account_type'
      WHEN go.enabled IS NOT NULL THEN 'global_default'
      ELSE 'module_default'
    END AS source
  FROM public.system_modules m
  LEFT JOIN public.system_module_overrides uo
    ON uo.module_key = m.key AND uo.scope_type = 'user' AND uo.scope_value = _user_id::text
  LEFT JOIN public.system_module_overrides ato
    ON ato.module_key = m.key AND ato.scope_type = 'account_type' AND ato.scope_value = _account_type
  LEFT JOIN public.system_module_overrides go
    ON go.module_key = m.key AND go.scope_type = 'global_default'
  WHERE m.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_visible_modules(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_module_override(
  _module_key TEXT,
  _scope_type TEXT,
  _scope_value TEXT,
  _enabled BOOLEAN,
  _reason TEXT DEFAULT NULL
)
RETURNS public.system_module_overrides
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.system_module_overrides;
  _is_core BOOLEAN;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT is_core INTO _is_core FROM public.system_modules WHERE key = _module_key;
  IF _is_core IS NULL THEN
    RAISE EXCEPTION 'unknown module: %', _module_key;
  END IF;
  IF _is_core AND _enabled = false THEN
    RAISE EXCEPTION 'core module cannot be disabled';
  END IF;

  INSERT INTO public.system_module_overrides
    (module_key, scope_type, scope_value, enabled, reason, set_by)
  VALUES
    (_module_key, _scope_type, _scope_value, _enabled, _reason, auth.uid())
  ON CONFLICT (module_key, scope_type, scope_value)
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    reason = EXCLUDED.reason,
    set_by = EXCLUDED.set_by,
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_module_override(TEXT,TEXT,TEXT,BOOLEAN,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_clear_module_override(
  _module_key TEXT,
  _scope_type TEXT,
  _scope_value TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.system_module_overrides
   WHERE module_key = _module_key AND scope_type = _scope_type
     AND (scope_value IS NOT DISTINCT FROM _scope_value);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clear_module_override(TEXT,TEXT,TEXT) TO authenticated;

INSERT INTO public.system_modules (key, category, label_ar, label_en, description_ar, description_en, icon, route, is_core, default_enabled, default_account_types, sort_order) VALUES
  ('dashboard',        'core',         'لوحة التحكم',     'Dashboard',        'الصفحة الرئيسية للوحة التحكم',  'Main dashboard home',         'LayoutDashboard', '/dashboard',                  true,  true,  ARRAY['provider','client','individual'], 1),
  ('profile',          'core',         'الملف الشخصي',    'Profile',          'إعدادات الحساب الشخصي',         'Personal account settings',   'User',            '/dashboard/profile',          true,  true,  ARRAY['provider','client','individual'], 2),
  ('notifications',    'core',         'الإشعارات',       'Notifications',    'مركز الإشعارات',                'Notifications center',        'Bell',            '/dashboard/notifications',    true,  true,  ARRAY['provider','client','individual'], 3),
  ('messaging',        'communication','الرسائل',         'Messaging',        'المحادثات والرسائل',            'Conversations and DMs',       'MessageSquare',   '/dashboard/messages',         false, true,  ARRAY['provider','client','individual'], 10),
  ('leads',            'business',     'الفرص',           'Leads',            'طلبات العملاء الواردة',         'Incoming customer leads',     'Target',          '/dashboard/leads',            false, true,  ARRAY['provider'],                       20),
  ('quotes',           'business',     'عروض الأسعار',    'Quotes',           'إنشاء والرد على عروض الأسعار', 'Create/respond to quotes',    'FileText',        '/dashboard/quotes',           false, true,  ARRAY['provider','client'],              21),
  ('contracts',        'business',     'العقود',          'Contracts',        'إدارة دورة حياة العقود',        'Contract lifecycle',          'FileSignature',   '/dashboard/contracts',        false, true,  ARRAY['provider','client'],              22),
  ('bookings',         'business',     'الحجوزات',        'Bookings',         'جدولة المواعيد والزيارات',      'Schedule appointments',       'CalendarCheck',   '/dashboard/bookings',         false, true,  ARRAY['provider','client'],              23),
  ('services',         'business',     'كتالوج الخدمات',  'Services Catalog', 'إدارة الخدمات والمنتجات',       'Services and products',       'Package',         '/dashboard/services',         false, true,  ARRAY['provider'],                       24),
  ('entities',         'business',     'الكيانات',        'Entities',         'الفروع والكيانات التجارية',     'Branches and entities',       'Building2',       '/dashboard/entities',         false, true,  ARRAY['provider'],                       25),
  ('projects',         'business',     'المشاريع',        'Projects',         'محفظة المشاريع والأعمال',       'Projects and portfolio',      'Briefcase',       '/dashboard/projects',         false, true,  ARRAY['provider'],                       26),
  ('reviews',          'business',     'التقييمات',       'Reviews',          'تقييمات العملاء',               'Customer reviews',            'Star',            '/dashboard/reviews',          false, true,  ARRAY['provider','client'],              27),
  ('payments',         'finance',      'المدفوعات',       'Payments',         'الفواتير والمعاملات',           'Invoices and transactions',   'CreditCard',      '/dashboard/payments',         false, true,  ARRAY['provider','client'],              30),
  ('memberships',      'finance',      'العضويات',        'Memberships',      'باقات الاشتراك والترقيات',      'Subscription tiers',          'Crown',           '/dashboard/memberships',      false, true,  ARRAY['provider'],                       31),
  ('credits',          'finance',      'الرصيد',          'Credits',          'رصيد الفرص والمعاملات',         'Lead credits',                'Coins',           '/dashboard/credits',          false, true,  ARRAY['provider'],                       32),
  ('ai_assistant',     'ai',           'المساعد الذكي',   'AI Assistant',     'مساعد الذكاء الاصطناعي',        'AI assistant',                'Sparkles',        '/dashboard/ai',               false, true,  ARRAY['provider','client','individual'], 40),
  ('ai_tools',         'ai',           'أدوات الذكاء',    'AI Tools',         'مجموعة أدوات الذكاء',           'AI productivity tools',       'Wand2',           '/dashboard/ai-tools',         false, true,  ARRAY['provider'],                       41),
  ('analytics',        'insights',     'التحليلات',       'Analytics',        'لوحات التحليلات والأداء',       'Analytics and KPIs',          'BarChart3',       '/dashboard/analytics',        false, true,  ARRAY['provider'],                       50),
  ('activity_log',     'insights',     'سجل النشاط',      'Activity Log',     'الخط الزمني للنشاط',            'Activity timeline',           'Activity',        '/dashboard/activity',         false, true,  ARRAY['provider','client','individual'], 51),
  ('marketing',        'marketing',    'العروض والترويج', 'Promotions',       'العروض الترويجية',              'Promotions and offers',       'Megaphone',       '/dashboard/promotions',       false, true,  ARRAY['provider'],                       60),
  ('blog',             'marketing',    'المدونة',         'Blog',             'إدارة المدونة',                 'Blog management',             'BookOpen',        '/dashboard/blog',             false, false, ARRAY['provider'],                       61),
  ('documents',        'workspace',    'المستندات',       'Documents',        'إدارة المستندات والملفات',      'Documents and files',         'FolderOpen',      '/dashboard/documents',        false, true,  ARRAY['provider','client'],              70),
  ('staff',            'workspace',    'الفريق',          'Team',             'إدارة أعضاء الفريق',            'Team members',                'Users',           '/dashboard/team',             false, true,  ARRAY['provider'],                       71),
  ('warranty',         'workspace',    'الضمانات',        'Warranty',         'إدارة الضمانات',                'Warranty management',         'ShieldCheck',     '/dashboard/warranty',         false, false, ARRAY['provider'],                       72),
  ('settings',         'core',         'الإعدادات',       'Settings',         'إعدادات الحساب والتطبيق',       'Account/app settings',        'Settings',        '/dashboard/settings',         true,  true,  ARRAY['provider','client','individual'], 90)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  label_ar = EXCLUDED.label_ar,
  label_en = EXCLUDED.label_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  is_core = EXCLUDED.is_core,
  default_account_types = EXCLUDED.default_account_types,
  sort_order = EXCLUDED.sort_order;
