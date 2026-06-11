INSERT INTO public.system_modules
  (key, category, label_ar, label_en, description_ar, description_en, icon, route, is_core, default_enabled, default_account_types, sort_order, is_active)
VALUES
  ('assets', 'business', 'الأصول', 'Assets',
   'إدارة الأصول والمعدات والصيانة والفحوصات',
   'Manage assets, equipment, maintenance and inspections',
   'Boxes', '/dashboard/assets',
   false, true, ARRAY['provider','client','individual']::text[], 150, true),

  ('procurement', 'business', 'المشتريات', 'Procurement',
   'طلبات الشراء وعروض الموردين وأوامر التوريد',
   'Purchase requests, supplier quotes and purchase orders',
   'ShoppingCart', '/dashboard/procurement',
   false, true, ARRAY['provider','client']::text[], 155, true),

  ('branches', 'business', 'الفروع', 'Branches',
   'إدارة فروع المنشأة ومواقعها',
   'Manage business branches and locations',
   'Building2', '/dashboard/branches',
   false, true, ARRAY['provider']::text[], 160, true),

  ('client_sites', 'business', 'مواقع العميل', 'Client Sites',
   'إدارة مواقع المشاريع والوصول للزوار',
   'Manage project sites and visitor access',
   'MapPin', '/dashboard/sites',
   false, true, ARRAY['client','individual']::text[], 165, true),

  ('brands', 'marketing', 'العلامات التجارية', 'Brands',
   'كتالوج العلامات التجارية والمنتجات',
   'Brand catalog and products',
   'Tag', '/dashboard/brands',
   false, true, ARRAY['provider']::text[], 170, true),

  ('inquiries', 'communication', 'الاستفسارات', 'Inquiries',
   'صندوق وارد استفسارات الفروع والعملاء',
   'Branch and customer inquiries inbox',
   'Inbox', '/dashboard/inquiries',
   false, true, ARRAY['provider']::text[], 175, true),

  ('showcase', 'marketing', 'معرض الشراكات', 'Partner Showcase',
   'عرض الشراكات والمشاريع المميزة',
   'Showcase partnerships and featured projects',
   'Star', '/dashboard/showcase',
   false, true, ARRAY['provider']::text[], 180, true),

  ('bookmarks', 'core', 'المحفوظات', 'Bookmarks',
   'العناصر المحفوظة والمفضلة',
   'Saved and favorited items',
   'Bookmark', '/dashboard/bookmarks',
   false, true, ARRAY['provider','client','individual']::text[], 185, true),

  ('my_requests', 'business', 'طلباتي', 'My Requests',
   'طلبات الأسعار والمشتريات الخاصة بي',
   'My quote requests and purchases',
   'FileText', '/dashboard/my-requests',
   false, true, ARRAY['client','individual']::text[], 190, true)
ON CONFLICT (key) DO UPDATE SET
  route = EXCLUDED.route,
  label_ar = EXCLUDED.label_ar,
  label_en = EXCLUDED.label_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();