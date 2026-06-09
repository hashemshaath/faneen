
DO $$
DECLARE
  v_primary_type uuid;
  v_secondary_type uuid;
BEGIN
  SELECT id INTO v_primary_type   FROM public.taxonomy_types WHERE code = 'primary_activity';
  SELECT id INTO v_secondary_type FROM public.taxonomy_types WHERE code = 'secondary_activity';

  IF v_primary_type IS NULL OR v_secondary_type IS NULL THEN
    RAISE EXCEPTION 'taxonomy_types primary_activity / secondary_activity missing';
  END IF;

  INSERT INTO public.taxonomy_categories
    (taxonomy_type_id, parent_id, slug, name_ar, name_en, sort_order,
     is_active, is_public, is_searchable, is_archived,
     show_in_registration, show_in_search, show_in_seo)
  VALUES
    (v_primary_type, NULL, 'aluminum-works',           'الألمنيوم',                       'Aluminum Works',              10,  true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'glass-securit-works',      'الزجاج والسيكوريت',                'Glass & Securit Works',       20,  true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'steel-metal-works',        'الحديد والمعادن',                  'Steel & Metal Works',         30,  true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'stainless-steel-works',    'الستانلس ستيل',                    'Stainless Steel Works',       40,  true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'wood-carpentry',           'الخشب والنجارة',                   'Wood & Carpentry',            50,  true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'kitchens-works',           'المطابخ',                          'Kitchens',                    60,  true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'facades-cladding',         'الواجهات والكلادينج',              'Facades & Cladding',          70,  true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'contracting-finishing',    'المقاولات والتشطيبات المتخصصة',    'Contracting & Finishing',     80,  true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'elevators-maintenance',    'المصاعد والصيانة',                 'Elevators & Maintenance',     90,  true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'energy-sustainability',    'الطاقة والاستدامة',                'Energy & Sustainability',     100, true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'technology-networks',      'التقنية والشبكات',                 'Technology & Networks',       110, true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'security-control-systems', 'أنظمة الحماية والتحكم',            'Security & Control Systems',  120, true, true, true, false, true, true, true),
    (v_primary_type, NULL, 'equipment-rental',         'تأجير المعدات',                    'Equipment Rental',            130, true, true, true, false, true, true, true)
  ON CONFLICT (slug) DO UPDATE
    SET name_ar              = EXCLUDED.name_ar,
        name_en              = EXCLUDED.name_en,
        taxonomy_type_id     = EXCLUDED.taxonomy_type_id,
        parent_id            = NULL,
        sort_order           = EXCLUDED.sort_order,
        is_active            = true,
        is_public            = true,
        is_searchable        = true,
        is_archived          = false,
        show_in_registration = true,
        show_in_search       = true,
        show_in_seo          = true,
        updated_at           = now();

  INSERT INTO public.taxonomy_categories
    (taxonomy_type_id, parent_id, slug, name_ar, name_en, sort_order,
     is_active, is_public, is_searchable, is_archived,
     show_in_registration, show_in_search, show_in_seo)
  SELECT v_secondary_type, parent.id, s.slug, s.name_ar, s.name_en, s.sort_order,
         true, true, true, false, true, true, true
  FROM (VALUES
    ('aluminum-works','alum-doors',                  'أبواب ألمنيوم',             'Aluminum Doors',                 10),
    ('aluminum-works','alum-windows',                'شبابيك ألمنيوم',            'Aluminum Windows',               20),
    ('aluminum-works','alum-facades',                'واجهات ألمنيوم',            'Aluminum Facades',               30),
    ('aluminum-works','alum-railings',               'درابزين ألمنيوم',           'Aluminum Railings',              40),
    ('aluminum-works','alum-kitchens',               'مطابخ ألمنيوم',             'Aluminum Kitchens',              50),
    ('aluminum-works','alum-custom',                 'أعمال ألمنيوم مخصصة',       'Custom Aluminum Works',          60),
    ('aluminum-works','alum-install-maintenance',    'تركيب وصيانة ألمنيوم',      'Aluminum Install & Maintenance', 70),
    ('glass-securit-works','tempered-glass',         'زجاج سيكوريت',              'Tempered Glass',                 10),
    ('glass-securit-works','glass-facades',          'واجهات زجاجية',             'Glass Facades',                  20),
    ('glass-securit-works','glass-doors',            'أبواب زجاجية',              'Glass Doors',                    30),
    ('glass-securit-works','glass-partitions',       'قواطع زجاجية',              'Glass Partitions',               40),
    ('glass-securit-works','glass-railings',         'درابزين زجاج',              'Glass Railings',                 50),
    ('glass-securit-works','mirrors-decor-glass',    'مرايا وزجاج ديكور',         'Mirrors & Decor Glass',          60),
    ('glass-securit-works','glass-install-maintenance','تركيب وصيانة زجاج',       'Glass Install & Maintenance',    70),
    ('steel-metal-works','steel-doors',              'أبواب حديد',                'Steel Doors',                    10),
    ('steel-metal-works','steel-railings',           'درابزين حديد',              'Steel Railings',                 20),
    ('steel-metal-works','steel-structures',         'هياكل معدنية',              'Steel Structures',               30),
    ('steel-metal-works','steel-awnings',            'مظلات حديد',                'Steel Awnings',                  40),
    ('steel-metal-works','steel-mesh-protection',    'شبك وأسوار',                'Steel Mesh & Fencing',           50),
    ('steel-metal-works','steel-blacksmith',         'أعمال حدادة',               'Blacksmith Works',               60),
    ('steel-metal-works','steel-fab-install',        'تصنيع وتركيب معادن',        'Metal Fabrication & Install',    70),
    ('stainless-steel-works','ss-railings',          'درابزين ستانلس',            'Stainless Railings',             10),
    ('stainless-steel-works','ss-commercial-kitchens','مطابخ ستانلس',             'Stainless Kitchens',             20),
    ('stainless-steel-works','ss-tables',            'طاولات وتجهيزات ستانلس',    'Stainless Tables & Fixtures',    30),
    ('stainless-steel-works','ss-facades',           'واجهات ستانلس',             'Stainless Facades',              40),
    ('stainless-steel-works','ss-custom',            'أعمال ستانلس مخصصة',        'Custom Stainless Works',         50),
    ('stainless-steel-works','ss-maintenance',       'صيانة وتلميع ستانلس',       'Stainless Maintenance & Polish', 60),
    ('wood-carpentry','wood-doors',                  'أبواب خشبية',               'Wood Doors',                     10),
    ('wood-carpentry','wood-kitchens',               'مطابخ خشب',                 'Wood Kitchens',                  20),
    ('wood-carpentry','wood-decor',                  'ديكورات خشبية',             'Wood Decor',                     30),
    ('wood-carpentry','wood-wardrobes',              'خزائن',                     'Wardrobes',                      40),
    ('wood-carpentry','wood-partitions',             'قواطع خشبية',               'Wood Partitions',                50),
    ('wood-carpentry','wood-custom-furniture',       'أثاث تفصيل',                'Custom Furniture',               60),
    ('wood-carpentry','wood-custom-works',           'أعمال نجارة مخصصة',         'Custom Carpentry',               70),
    ('kitchens-works','kitchens-alum',               'مطابخ ألمنيوم',             'Aluminum Kitchens',              10),
    ('kitchens-works','kitchens-wood',               'مطابخ خشب',                 'Wood Kitchens',                  20),
    ('kitchens-works','kitchens-ss',                 'مطابخ ستانلس',              'Stainless Kitchens',             30),
    ('kitchens-works','kitchens-countertops',        'أسطح مطابخ',                'Kitchen Countertops',            40),
    ('kitchens-works','kitchens-maintenance',        'صيانة مطابخ',               'Kitchen Maintenance',            50),
    ('kitchens-works','kitchens-custom-install',     'تفصيل وتركيب مطابخ',        'Custom Kitchen Install',         60),
    ('facades-cladding','facades-glass',             'واجهات زجاجية',             'Glass Facades',                  10),
    ('facades-cladding','facades-alum',              'واجهات ألمنيوم',            'Aluminum Facades',               20),
    ('facades-cladding','cladding',                  'كلادينج',                   'Cladding',                       30),
    ('facades-cladding','facades-commercial',        'واجهات تجارية',             'Commercial Facades',             40),
    ('facades-cladding','facades-canopies',          'مظلات وواجهات خارجية',      'Canopies & Exterior Facades',    50),
    ('facades-cladding','facades-maintenance',       'صيانة واجهات',              'Facades Maintenance',            60),
    ('contracting-finishing','finishing-interior',           'تشطيب داخلي',          'Interior Finishing',          10),
    ('contracting-finishing','finishing-exterior',           'تشطيب خارجي',          'Exterior Finishing',          20),
    ('contracting-finishing','finishing-install-works',      'أعمال تركيب',          'Installation Works',          30),
    ('contracting-finishing','finishing-decor',              'أعمال ديكور',          'Decoration Works',            40),
    ('contracting-finishing','finishing-commercial-sites',   'أعمال مواقع تجارية',   'Commercial Site Works',       50),
    ('contracting-finishing','finishing-small-pm',           'إدارة تنفيذية صغيرة',  'Small Project Management',    60),
    ('elevators-maintenance','elevators-install',            'تركيب مصاعد',          'Elevator Installation',       10),
    ('elevators-maintenance','elevators-maintenance-svc',    'صيانة مصاعد',          'Elevator Maintenance',        20),
    ('elevators-maintenance','elevators-residential',        'مصاعد منزلية',         'Residential Elevators',       30),
    ('elevators-maintenance','elevators-commercial',         'مصاعد تجارية',         'Commercial Elevators',        40),
    ('elevators-maintenance','escalators',                   'سلالم كهربائية',       'Escalators',                  50),
    ('elevators-maintenance','elevators-parts',              'قطع غيار مصاعد',       'Elevator Parts',              60),
    ('elevators-maintenance','elevators-service-contracts',  'عقود صيانة مصاعد',     'Elevator Service Contracts',  70),
    ('energy-sustainability','energy-solar',                 'الطاقة الشمسية',       'Solar Energy',                10),
    ('energy-sustainability','energy-conservation',          'أنظمة الترشيد',        'Energy Conservation Systems', 20),
    ('energy-sustainability','energy-thermal-insulation',    'العزل الحراري',        'Thermal Insulation',          30),
    ('energy-sustainability','energy-efficiency-solutions',  'حلول كفاءة الطاقة',    'Energy Efficiency Solutions', 40),
    ('energy-sustainability','energy-ev-chargers',           'شواحن المركبات الكهربائية','EV Chargers',             50),
    ('energy-sustainability','energy-sustainable-electrical','أنظمة كهربائية مستدامة','Sustainable Electrical',     60),
    ('energy-sustainability','energy-env-consulting',        'استشارات بيئية وطاقة', 'Environmental Consulting',    70),
    ('technology-networks','net-cabling',                    'تمديد شبكات',          'Network Cabling',             10),
    ('technology-networks','net-cctv',                       'كاميرات مراقبة',       'CCTV Cameras',                20),
    ('technology-networks','net-wifi',                       'أنظمة Wi-Fi',          'Wi-Fi Systems',               30),
    ('technology-networks','net-pbx',                        'سنترالات واتصالات',    'PBX & Telecom',               40),
    ('technology-networks','net-pos',                        'أنظمة نقاط البيع',     'Point-of-Sale Systems',       50),
    ('technology-networks','net-server-rooms',               'غرف سيرفر',            'Server Rooms',                60),
    ('technology-networks','net-maintenance',                'صيانة شبكات',          'Network Maintenance',         70),
    ('security-control-systems','sec-alarms',                'أنظمة إنذار',          'Alarm Systems',               10),
    ('security-control-systems','sec-access-control',        'تحكم دخول',            'Access Control',              20),
    ('security-control-systems','sec-gates-parking',         'بوابات ومواقف',        'Gates & Parking',             30),
    ('security-control-systems','sec-attendance',            'أنظمة حضور وانصراف',   'Attendance Systems',          40),
    ('security-control-systems','sec-fire-alarm',            'إنذار حريق',           'Fire Alarm',                  50),
    ('security-control-systems','sec-smart-control',         'أنظمة تحكم ذكية',      'Smart Control Systems',       60),
    ('security-control-systems','sec-bms',                   'BMS وأنظمة مباني ذكية','BMS & Smart Buildings',       70),
    ('equipment-rental','rent-lifting',                      'معدات رفع',            'Lifting Equipment',           10),
    ('equipment-rental','rent-scaffolding',                  'سقالات',               'Scaffolding',                 20),
    ('equipment-rental','rent-site-equipment',               'معدات موقع',           'Site Equipment',              30),
    ('equipment-rental','rent-generators',                   'مولدات',               'Generators',                  40),
    ('equipment-rental','rent-compressors',                  'ضواغط',                'Compressors',                 50),
    ('equipment-rental','rent-light-tools',                  'أدوات ومعدات خفيفة',   'Light Tools & Equipment',     60),
    ('equipment-rental','rent-ops-maintenance',              'معدات تشغيل وصيانة',   'Operations & Maintenance Equipment', 70)
  ) AS s(parent_slug, slug, name_ar, name_en, sort_order)
  JOIN public.taxonomy_categories parent ON parent.slug = s.parent_slug
  ON CONFLICT (slug) DO UPDATE
    SET parent_id            = EXCLUDED.parent_id,
        taxonomy_type_id     = EXCLUDED.taxonomy_type_id,
        name_ar              = EXCLUDED.name_ar,
        name_en              = COALESCE(EXCLUDED.name_en, public.taxonomy_categories.name_en),
        is_active            = true,
        is_public            = true,
        is_searchable        = true,
        is_archived          = false,
        show_in_registration = true,
        show_in_search       = true,
        updated_at           = now();

  INSERT INTO public.taxonomy_aliases (category_id, alias_ar, alias_en, normalized_alias, source)
  SELECT c.id, a.alias_ar, a.alias_en, lower(a.alias_en), 'system'
  FROM (VALUES
    ('aluminum-works','ألمنيوم','Aluminum'),
    ('aluminum-works','الومنيوم','Alumnium'),
    ('glass-securit-works','زجاج','Glass'),
    ('glass-securit-works','سيكوريت','Securit'),
    ('steel-metal-works','حديد','Steel'),
    ('steel-metal-works','معادن','Metals'),
    ('stainless-steel-works','ستانلس','Stainless'),
    ('stainless-steel-works','ستانلس ستيل','Stainless Steel'),
    ('wood-carpentry','خشب','Wood'),
    ('wood-carpentry','نجارة','Carpentry'),
    ('kitchens-works','مطابخ','Kitchens'),
    ('facades-cladding','واجهات','Facades'),
    ('facades-cladding','كلادينج','Cladding'),
    ('contracting-finishing','مقاولات','Contracting'),
    ('contracting-finishing','تشطيبات','Finishing'),
    ('elevators-maintenance','مصاعد','Elevators'),
    ('energy-sustainability','طاقة','Energy'),
    ('energy-sustainability','طاقة شمسية','Solar'),
    ('technology-networks','تقنية','Technology'),
    ('technology-networks','شبكات','Networks'),
    ('security-control-systems','حماية','Security'),
    ('security-control-systems','تحكم','Control'),
    ('equipment-rental','تأجير معدات','Equipment Rental'),
    ('equipment-rental','معدات','Equipment')
  ) AS a(target_slug, alias_ar, alias_en)
  JOIN public.taxonomy_categories c ON c.slug = a.target_slug
  WHERE NOT EXISTS (
    SELECT 1 FROM public.taxonomy_aliases x
    WHERE x.category_id = c.id AND lower(coalesce(x.alias_en,'')) = lower(a.alias_en)
  );

  INSERT INTO public.taxonomy_legacy_mappings
    (legacy_source, legacy_slug, taxonomy_category_id, mapping_status, confidence, notes)
  SELECT 'sector_slug', m.legacy_slug, c.id, 'mapped', 'exact',
         'Taxonomy Restructure P1 — canonical mapping'
  FROM (VALUES
    ('aluminum','aluminum-works'),
    ('alumnium','aluminum-works'),
    ('aluminum_glass','aluminum-works'),
    ('aluminum-glass','aluminum-works'),
    ('aluminum-glass-facades','aluminum-works'),
    ('storefronts','aluminum-works'),
    ('glass','glass-securit-works'),
    ('securit','glass-securit-works'),
    ('steel','steel-metal-works'),
    ('iron','steel-metal-works'),
    ('iron-steel','steel-metal-works'),
    ('metals','steel-metal-works'),
    ('stainless','stainless-steel-works'),
    ('stainless-steel','stainless-steel-works'),
    ('stainless_steel','stainless-steel-works'),
    ('stainless-steel-fabrication','stainless-steel-works'),
    ('wood','wood-carpentry'),
    ('cabinets','wood-carpentry'),
    ('wood-cabinets','wood-carpentry'),
    ('kitchens','kitchens-works'),
    ('facades','facades-cladding'),
    ('cladding-facades','facades-cladding'),
    ('fabrication','contracting-finishing'),
    ('fabrication-installation','contracting-finishing'),
    ('finishing','contracting-finishing'),
    ('project-fitout','contracting-finishing'),
    ('construction','contracting-finishing'),
    ('elevators','elevators-maintenance'),
    ('escalators','elevators-maintenance'),
    ('energy','energy-sustainability'),
    ('solar','energy-sustainability'),
    ('sustainability','energy-sustainability'),
    ('technology','technology-networks'),
    ('technology-systems','technology-networks'),
    ('networks','technology-networks'),
    ('security','security-control-systems'),
    ('cctv','security-control-systems'),
    ('equipment','equipment-rental'),
    ('rental','equipment-rental'),
    ('heavy-equipment-rental','equipment-rental'),
    ('maintenance','elevators-maintenance'),
    ('operations','contracting-finishing')
  ) AS m(legacy_slug, target_slug)
  JOIN public.taxonomy_categories c ON c.slug = m.target_slug
  WHERE NOT EXISTS (
    SELECT 1 FROM public.taxonomy_legacy_mappings x
    WHERE x.legacy_source = 'sector_slug' AND x.legacy_slug = m.legacy_slug
  );

END $$;
