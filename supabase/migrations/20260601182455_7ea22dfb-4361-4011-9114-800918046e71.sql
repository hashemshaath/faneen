INSERT INTO public.system_modules
  (key, category, label_ar, label_en, description_ar, description_en,
   icon, route, is_core, default_enabled, default_account_types,
   sort_order, is_active)
VALUES
  ('operations_log', 'insights',
   'سجل العمليات', 'Operations Log',
   'سجل العمليات والأحداث والمراجعة عبر المنشأة.',
   'Operations, events and audit history across the organization.',
   'activity', '/dashboard/operations/feed',
   false, true, ARRAY['business','provider']::text[],
   620, true),
  ('staff_management', 'workspace',
   'الموظفون والفرق', 'Staff & Teams',
   'إدارة الموظفين والفرق والصلاحيات.',
   'Manage staff, teams, and permissions.',
   'users', '/dashboard/team',
   false, true, ARRAY['business','provider']::text[],
   720, true)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  label_ar = EXCLUDED.label_ar,
  label_en = EXCLUDED.label_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  sort_order = EXCLUDED.sort_order,
  is_active = true;