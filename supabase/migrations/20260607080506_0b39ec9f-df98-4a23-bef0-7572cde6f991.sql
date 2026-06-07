-- Phase 12 — Idempotent seed for core taxonomy categories.
-- Strict rules: only fill NULL / empty values; never overwrite admin edits;
-- never touch slug / is_active / is_public.

DO $seed$
DECLARE
  rec RECORD;
  defaults JSONB := '{
    "entity_type": {
      "sole-establishment":              {"icon": "User",            "short": "مؤسسة مملوكة لشخص واحد بسجل تجاري مستقل.",                    "kw": ["مؤسسة فردية","مالك واحد","سجل تجاري"]},
      "company":                         {"icon": "Building2",       "short": "شركة تجارية مسجلة بشكل رسمي (ذات مسؤولية محدودة، مساهمة، ...).", "kw": ["شركة","ذمم مستقلة","سجل تجاري"]},
      "factory":                         {"icon": "Factory",         "short": "منشأة صناعية للإنتاج والتصنيع.",                             "kw": ["مصنع","إنتاج","تصنيع","صناعي"]},
      "workshop":                        {"icon": "Wrench",          "short": "ورشة متخصصة في التصنيع أو الصيانة على نطاق محدود.",            "kw": ["ورشة","تصنيع","صيانة"]},
      "showroom-store":                  {"icon": "Store",           "short": "معرض أو متجر لعرض وبيع المنتجات للعملاء.",                    "kw": ["معرض","متجر","بيع","عرض"]},
      "supplier-distributor":            {"icon": "Truck",           "short": "مورد أو موزع لمنتجات ومواد لقطاع الأعمال.",                   "kw": ["مورد","موزع","توريد","لوجستيات"]},
      "contractor":                      {"icon": "HardHat",         "short": "شركة مقاولات لتنفيذ المشاريع الإنشائية والتشطيبات.",          "kw": ["مقاول","مقاولات","تنفيذ","مشاريع"]},
      "engineering-consultant":          {"icon": "DraftingCompass", "short": "مكتب هندسي أو استشاري للتصميم والإشراف الفني.",               "kw": ["مكتب هندسي","استشاري","تصميم","إشراف"]},
      "operations-maintenance-provider": {"icon": "Settings",        "short": "مزود خدمات تشغيل وصيانة للمرافق والمعدات.",                  "kw": ["تشغيل","صيانة","مرافق"]},
      "equipment-rental-provider":       {"icon": "Truck",           "short": "مزود معدات أو خدمات تأجير معدات للمواقع والمشاريع.",         "kw": ["معدات","تأجير","رافعات","مواقع"]},
      "real-estate-developer-owner":     {"icon": "Landmark",        "short": "مطور عقاري أو مالك مشروع يطرح أعمالًا للتنفيذ.",              "kw": ["تطوير عقاري","مالك","مشروع"]},
      "government-semi-government":      {"icon": "ShieldCheck",     "short": "جهة حكومية أو شبه حكومية تتعامل مع الموردين والمقاولين.",     "kw": ["حكومي","شبه حكومي","قطاع عام"]},
      "nonprofit-incubator":             {"icon": "Handshake",       "short": "جمعية أو حاضنة أو جهة غير ربحية.",                            "kw": ["غير ربحي","حاضنة","جمعية"]},
      "support-services-provider":       {"icon": "Briefcase",       "short": "مزود خدمات مساندة للأعمال (محاسبة، تسويق، استشارات...).",     "kw": ["خدمات مساندة","استشارات","دعم أعمال"]},
      "other-entity":                    {"icon": "CircleEllipsis",  "short": "نوع جهة آخر غير مدرج في القائمة.",                            "kw": ["أخرى","غير مصنف"]}
    },
    "primary_activity": {
      "construction-building":         {"icon": "HardHat",         "short": "تشييد وبناء المباني والمنشآت بأنواعها.",                       "kw": ["تشييد","بناء","إنشاءات","مباني"]},
      "contracting-finishing":         {"icon": "Paintbrush",      "short": "مقاولات وتشطيبات داخلية وخارجية.",                            "kw": ["مقاولات","تشطيبات","ديكور","دهانات"]},
      "aluminum-glass-facades":        {"icon": "PanelsTopLeft",   "short": "أعمال ألمنيوم وزجاج وواجهات وكلادينج.",                      "kw": ["ألمنيوم","زجاج","واجهات","كلادينج"]},
      "steel-metal-works":             {"icon": "Hammer",          "short": "أعمال الحديد والمعادن والإنشاءات المعدنية.",                  "kw": ["حديد","معادن","تشكيل","لحام"]},
      "wood-carpentry":                {"icon": "Trees",           "short": "أعمال الخشب والنجارة والمطابخ الخشبية.",                      "kw": ["خشب","نجارة","مطابخ","ديكور"]},
      "stainless-steel-fabrication":   {"icon": "Utensils",        "short": "تجهيزات الستانلس ستيل للمطاعم والمصانع والمرافق.",            "kw": ["ستانلس ستيل","تجهيزات","مطاعم"]},
      "building-materials-supply":     {"icon": "Package",         "short": "توريد مواد البناء والإنشاءات للمقاولين والمشاريع.",          "kw": ["مواد بناء","توريد","إسمنت","حديد"]},
      "heavy-equipment-rental":        {"icon": "Truck",           "short": "تأجير وتشغيل معدات ثقيلة للمواقع.",                          "kw": ["معدات ثقيلة","تأجير","رافعات","حفارات"]},
      "operations-maintenance":        {"icon": "Wrench",          "short": "خدمات تشغيل وصيانة للمنشآت والمعدات.",                       "kw": ["تشغيل","صيانة","فاسليتي"]},
      "engineering-consulting":        {"icon": "DraftingCompass", "short": "مكاتب هندسية واستشارات تصميم وإشراف.",                       "kw": ["استشارات","هندسي","تصميم","إشراف"]},
      "real-estate-development":       {"icon": "Building2",       "short": "عقارات وتطوير عقاري وإدارة مشاريع.",                          "kw": ["عقارات","تطوير","مشاريع","إدارة"]},
      "technology-systems":            {"icon": "Cpu",             "short": "تقنية وتجهيزات أنظمة وأتمتة المباني.",                       "kw": ["تقنية","أنظمة","أتمتة","ذكاء"]},
      "transport-logistics":           {"icon": "Truck",           "short": "نقل ولوجستيات للمشاريع والمواد.",                             "kw": ["نقل","لوجستيات","شحن"]},
      "business-services":             {"icon": "Briefcase",       "short": "خدمات أعمال داعمة (إدارة، محاسبة، تسويق...).",                "kw": ["خدمات أعمال","استشارات","إدارة"]},
      "other-activities":              {"icon": "CircleEllipsis",  "short": "نشاط آخر غير مدرج ضمن الأنشطة الرئيسية.",                    "kw": ["أخرى","غير مصنف"]}
    },
    "service": {
      "kitchens-fitout":          {"icon": "Utensils", "short": "مطابخ وتجهيزات داخلية متكاملة (خشب، ألمنيوم، ستانلس).", "kw": ["مطابخ","تجهيزات","ديكور"]},
      "site-factory-preparation": {"icon": "Factory",  "short": "تجهيز المواقع والمصانع قبل التشغيل والإنتاج.",          "kw": ["تجهيز","موقع","مصنع","تأسيس"]}
    }
  }'::jsonb;
  type_block JSONB;
  cat_defaults JSONB;
  applied_count INT := 0;
BEGIN
  FOR rec IN
    SELECT c.id, c.slug, c.icon, c.short_description_ar, c.keywords_ar,
           tt.code AS type_code
    FROM public.taxonomy_categories c
    JOIN public.taxonomy_types tt ON tt.id = c.taxonomy_type_id
    WHERE tt.code IN ('entity_type','primary_activity','service')
      AND c.is_archived = false
  LOOP
    type_block := defaults -> rec.type_code;
    IF type_block IS NULL THEN CONTINUE; END IF;
    cat_defaults := type_block -> rec.slug;
    IF cat_defaults IS NULL THEN CONTINUE; END IF;

    UPDATE public.taxonomy_categories
    SET
      icon = CASE
        WHEN (icon IS NULL OR btrim(icon) = '') THEN cat_defaults ->> 'icon'
        ELSE icon
      END,
      short_description_ar = CASE
        WHEN (short_description_ar IS NULL OR btrim(short_description_ar) = '')
          THEN cat_defaults ->> 'short'
        ELSE short_description_ar
      END,
      keywords_ar = CASE
        WHEN (keywords_ar IS NULL OR array_length(keywords_ar, 1) IS NULL)
          THEN ARRAY(SELECT jsonb_array_elements_text(cat_defaults -> 'kw'))
        ELSE keywords_ar
      END,
      metadata = COALESCE(metadata, '{}'::jsonb)
                 || jsonb_build_object('seeded_v12', true,
                                        'seeded_v12_at', to_jsonb(now()))
    WHERE id = rec.id
      AND (
        (icon IS NULL OR btrim(icon) = '')
        OR (short_description_ar IS NULL OR btrim(short_description_ar) = '')
        OR (keywords_ar IS NULL OR array_length(keywords_ar, 1) IS NULL)
      );

    IF FOUND THEN applied_count := applied_count + 1; END IF;
  END LOOP;

  RAISE NOTICE 'Phase 12 seed touched % core categories', applied_count;
END
$seed$ LANGUAGE plpgsql;