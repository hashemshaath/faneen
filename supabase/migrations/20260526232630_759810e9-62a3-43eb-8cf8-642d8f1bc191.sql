
-- WORKSPACE-RBAC-6A: seed canonical roles/permissions catalog.
-- All operations idempotent. No schema or RLS changes.

-- ROLES (entity-scoped)
INSERT INTO public.roles_catalog (key, scope, label_ar, label_en, description) VALUES
  ('owner',              'entity', 'المالك',              'Owner',              'Full access to the entity'),
  ('entity_admin',       'entity', 'مدير الكيان',          'Entity Admin',       'Administrative access within the entity'),
  ('business_manager',   'entity', 'مدير الأعمال',         'Business Manager',   'Day-to-day business operations'),
  ('site_manager',       'entity', 'مدير الموقع',          'Site Manager',       'Manages a specific site/branch'),
  ('operations_manager', 'entity', 'مدير العمليات',        'Operations Manager', 'Operational workflows: leads, contracts, bookings'),
  ('contracts_manager',  'entity', 'مدير العقود',          'Contracts Manager',  'Contract lifecycle and related documents'),
  ('finance',            'entity', 'المالية',              'Finance',            'Membership and payment management'),
  ('sales',              'entity', 'المبيعات',             'Sales',              'Lead and quote handling'),
  ('staff',              'entity', 'موظف',                'Staff',              'Read-only operational access'),
  ('viewer',             'entity', 'مشاهد',                'Viewer',             'Minimal read-only entity access')
ON CONFLICT (key) DO NOTHING;

-- PERMISSIONS
INSERT INTO public.permissions_catalog (key, group_key, label_ar, label_en) VALUES
  ('entity.view',         'entity',      'عرض الكيان',          'View entity'),
  ('entity.manage',       'entity',      'إدارة الكيان',         'Manage entity'),
  ('entity.verify',       'entity',      'توثيق الكيان',         'Verify entity'),
  ('staff.view',          'staff',       'عرض الموظفين',         'View staff'),
  ('staff.manage',        'staff',       'إدارة الموظفين',       'Manage staff'),
  ('locations.view',      'locations',   'عرض المواقع',          'View locations'),
  ('locations.manage',    'locations',   'إدارة المواقع',        'Manage locations'),
  ('services.view',       'services',    'عرض الخدمات',          'View services'),
  ('services.manage',     'services',    'إدارة الخدمات',        'Manage services'),
  ('leads.view',          'leads',       'عرض العملاء المحتملين','View leads'),
  ('leads.manage',        'leads',       'إدارة العملاء المحتملين','Manage leads'),
  ('quotes.view',         'quotes',      'عرض عروض الأسعار',     'View quotes'),
  ('quotes.create',       'quotes',      'إنشاء عروض الأسعار',   'Create quotes'),
  ('quotes.respond',      'quotes',      'الرد على عروض الأسعار','Respond to quotes'),
  ('contracts.view',      'contracts',   'عرض العقود',           'View contracts'),
  ('contracts.create',    'contracts',   'إنشاء العقود',         'Create contracts'),
  ('contracts.sign',      'contracts',   'توقيع العقود',         'Sign contracts'),
  ('contracts.manage',    'contracts',   'إدارة العقود',         'Manage contracts'),
  ('bookings.view',       'bookings',    'عرض الحجوزات',         'View bookings'),
  ('bookings.manage',     'bookings',    'إدارة الحجوزات',       'Manage bookings'),
  ('documents.view',      'documents',   'عرض المستندات',        'View documents'),
  ('documents.upload',    'documents',   'رفع المستندات',        'Upload documents'),
  ('documents.manage',    'documents',   'إدارة المستندات',      'Manage documents'),
  ('memberships.view',    'memberships', 'عرض الاشتراكات',       'View memberships'),
  ('memberships.manage',  'memberships', 'إدارة الاشتراكات',     'Manage memberships'),
  ('payments.view',       'payments',    'عرض المدفوعات',        'View payments'),
  ('payments.manage',     'payments',    'إدارة المدفوعات',      'Manage payments'),
  ('settings.view',       'settings',    'عرض الإعدادات',        'View settings'),
  ('settings.manage',     'settings',    'إدارة الإعدادات',      'Manage settings')
ON CONFLICT (key) DO NOTHING;

-- ROLE -> PERMISSION MAPPINGS

-- owner: all permissions
INSERT INTO public.role_permissions (role_key, permission_key)
SELECT 'owner', key FROM public.permissions_catalog
ON CONFLICT DO NOTHING;

-- entity_admin: all permissions (admin within entity; platform admin is separate via app_role)
INSERT INTO public.role_permissions (role_key, permission_key)
SELECT 'entity_admin', key FROM public.permissions_catalog
ON CONFLICT DO NOTHING;

-- business_manager
INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('business_manager','entity.view'),
  ('business_manager','staff.view'),
  ('business_manager','locations.view'),
  ('business_manager','locations.manage'),
  ('business_manager','services.view'),
  ('business_manager','services.manage'),
  ('business_manager','leads.view'),
  ('business_manager','leads.manage'),
  ('business_manager','quotes.view'),
  ('business_manager','quotes.respond'),
  ('business_manager','contracts.view'),
  ('business_manager','contracts.manage'),
  ('business_manager','bookings.view'),
  ('business_manager','bookings.manage'),
  ('business_manager','documents.view'),
  ('business_manager','documents.upload'),
  ('business_manager','documents.manage'),
  ('business_manager','memberships.view'),
  ('business_manager','payments.view'),
  ('business_manager','settings.view')
ON CONFLICT DO NOTHING;

-- site_manager
INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('site_manager','entity.view'),
  ('site_manager','locations.view'),
  ('site_manager','leads.view'),
  ('site_manager','leads.manage'),
  ('site_manager','quotes.view'),
  ('site_manager','quotes.respond'),
  ('site_manager','contracts.view'),
  ('site_manager','bookings.view'),
  ('site_manager','bookings.manage'),
  ('site_manager','documents.view'),
  ('site_manager','documents.upload')
ON CONFLICT DO NOTHING;

-- operations_manager
INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('operations_manager','entity.view'),
  ('operations_manager','leads.view'),
  ('operations_manager','leads.manage'),
  ('operations_manager','quotes.view'),
  ('operations_manager','quotes.respond'),
  ('operations_manager','contracts.view'),
  ('operations_manager','contracts.manage'),
  ('operations_manager','bookings.view'),
  ('operations_manager','bookings.manage'),
  ('operations_manager','documents.view'),
  ('operations_manager','documents.upload')
ON CONFLICT DO NOTHING;

-- contracts_manager
INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('contracts_manager','entity.view'),
  ('contracts_manager','contracts.view'),
  ('contracts_manager','contracts.create'),
  ('contracts_manager','contracts.sign'),
  ('contracts_manager','contracts.manage'),
  ('contracts_manager','documents.view'),
  ('contracts_manager','documents.upload'),
  ('contracts_manager','documents.manage')
ON CONFLICT DO NOTHING;

-- finance
INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('finance','entity.view'),
  ('finance','memberships.view'),
  ('finance','memberships.manage'),
  ('finance','payments.view'),
  ('finance','payments.manage'),
  ('finance','contracts.view'),
  ('finance','documents.view')
ON CONFLICT DO NOTHING;

-- sales
INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('sales','entity.view'),
  ('sales','leads.view'),
  ('sales','leads.manage'),
  ('sales','quotes.view'),
  ('sales','quotes.respond'),
  ('sales','services.view')
ON CONFLICT DO NOTHING;

-- staff
INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('staff','entity.view'),
  ('staff','locations.view'),
  ('staff','leads.view'),
  ('staff','quotes.view'),
  ('staff','contracts.view'),
  ('staff','bookings.view'),
  ('staff','documents.view')
ON CONFLICT DO NOTHING;

-- viewer
INSERT INTO public.role_permissions (role_key, permission_key) VALUES
  ('viewer','entity.view')
ON CONFLICT DO NOTHING;
