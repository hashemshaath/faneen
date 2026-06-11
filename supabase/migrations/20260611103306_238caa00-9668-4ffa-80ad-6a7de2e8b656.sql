INSERT INTO public.system_modules
  (key, category, label_ar, label_en, description_ar, description_en, icon, route, is_core, default_enabled, default_account_types, sort_order, is_active)
VALUES
  ('rentals', 'commerce', 'التأجير', 'Rentals',
   'إدارة عناصر التأجير والحجوزات والتقويم والتحليلات',
   'Manage rental items, bookings, calendar and analytics',
   'CalendarRange', '/dashboard/rentals',
   false, true, ARRAY['provider','client','individual']::text[], 145, true)
ON CONFLICT (key) DO UPDATE SET
  route = EXCLUDED.route,
  label_ar = EXCLUDED.label_ar,
  label_en = EXCLUDED.label_en,
  is_active = true,
  updated_at = now();