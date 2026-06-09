
-- /admin/rentals — Phase A: introduce 4 parent groups for the 12 equipment categories,
-- and merge the only duplicate catalog entry ("حاوية تبريد 20 قدم").

DO $$
DECLARE
  v_tax_type uuid := '069e30de-e312-479f-8efa-84fc8251bfaf';
  v_heavy uuid; v_power uuid; v_finishing uuid; v_site uuid;
  v_keep uuid; v_drop uuid;
BEGIN
  -- 1) Create 4 parent groups (idempotent on slug+type)
  INSERT INTO public.taxonomy_categories
    (taxonomy_type_id, parent_id, slug, name_ar, name_en,
     short_description_ar, short_description_en,
     seo_title_ar, seo_title_en, seo_description_ar, seo_description_en,
     keywords_ar, keywords_en,
     icon, color, sort_order, is_active, is_public, is_searchable, is_featured, is_archived,
     show_in_registration, show_in_search, show_in_seo)
  VALUES
    (v_tax_type, NULL, 'group-heavy-equipment',
     'معدات بناء وإنشاءات ثقيلة', 'Heavy Construction Equipment',
     'سقالات، حاويات، معدات رفع ونقل', 'Scaffolding, containers, lifting & transport',
     'تأجير معدات البناء الثقيلة', 'Heavy Construction Equipment Rental',
     'سقالات وحاويات ومعدات رفع للمواقع الإنشائية', 'Scaffolding, containers and lifting gear for job sites',
     ARRAY['سقالات','حاويات','رفع','نقل','إنشاءات'], ARRAY['scaffolding','containers','lifting','transport','construction'],
     'lucide:Construction', '#0d9488', 100, true, true, true, true, false, false, true, true),

    (v_tax_type, NULL, 'group-machinery-power',
     'آلات وطاقة', 'Machinery & Power',
     'مولدات، معدات كهربائية، قص وحفر', 'Generators, electrical, cutting & drilling',
     'تأجير المولدات والآلات الكهربائية', 'Generators & Power Machinery Rental',
     'مولدات وأدوات قص وحفر ومعدات كهربائية للمشاريع', 'Generators, cutting, drilling and electrical gear',
     ARRAY['مولدات','كهرباء','قص','حفر','طاقة'], ARRAY['generators','electrical','cutting','drilling','power'],
     'lucide:Zap', '#eab308', 200, true, true, true, true, false, false, true, true),

    (v_tax_type, NULL, 'group-finishing-fabrication',
     'أدوات تشطيب وتصنيع', 'Finishing & Fabrication Tools',
     'نجارة، حدادة، أدوات تشطيب', 'Woodworking, metalworking, finishing',
     'تأجير أدوات النجارة والحدادة والتشطيب', 'Woodworking, Metalworking & Finishing Tools Rental',
     'أدوات نجارة وحدادة ومعدات تشطيب احترافية', 'Professional woodworking, metalworking and finishing tools',
     ARRAY['نجارة','حدادة','تشطيب','أدوات'], ARRAY['woodworking','metalworking','finishing','tools'],
     'lucide:Hammer', '#a16207', 300, true, true, true, true, false, false, true, true),

    (v_tax_type, NULL, 'group-site-safety',
     'خدمات موقع وسلامة', 'Site Services & Safety',
     'معدات سلامة وخدمات موقع مساندة', 'Safety equipment and site support services',
     'تأجير معدات السلامة وخدمات الموقع', 'Site Safety & Support Services Rental',
     'معدات سلامة احترافية وخدمات مساندة للمواقع', 'Professional safety equipment and on-site support services',
     ARRAY['سلامة','حماية','خدمات موقع'], ARRAY['safety','protection','site services'],
     'lucide:ShieldCheck', '#1e40af', 400, true, true, true, true, false, false, true, true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_heavy     FROM public.taxonomy_categories WHERE taxonomy_type_id=v_tax_type AND slug='group-heavy-equipment';
  SELECT id INTO v_power     FROM public.taxonomy_categories WHERE taxonomy_type_id=v_tax_type AND slug='group-machinery-power';
  SELECT id INTO v_finishing FROM public.taxonomy_categories WHERE taxonomy_type_id=v_tax_type AND slug='group-finishing-fabrication';
  SELECT id INTO v_site      FROM public.taxonomy_categories WHERE taxonomy_type_id=v_tax_type AND slug='group-site-safety';

  -- 2) Link existing 12 categories under their new parents
  UPDATE public.taxonomy_categories SET parent_id = v_heavy
    WHERE taxonomy_type_id=v_tax_type AND slug IN ('scaffolding','containers','lifting');

  UPDATE public.taxonomy_categories SET parent_id = v_power
    WHERE taxonomy_type_id=v_tax_type AND slug IN ('generators','electrical','cutting','drilling');

  UPDATE public.taxonomy_categories SET parent_id = v_finishing
    WHERE taxonomy_type_id=v_tax_type AND slug IN ('woodworking','metalworking','finishing');

  UPDATE public.taxonomy_categories SET parent_id = v_site
    WHERE taxonomy_type_id=v_tax_type AND slug IN ('safety','site-support');

  -- 3) Merge duplicate catalog entry: keep the canonical "refrigerated-container-20ft",
  --    archive the other and re-point any dependent rental_items.
  SELECT id INTO v_keep FROM public.rental_equipment_catalog WHERE slug='refrigerated-container-20ft' LIMIT 1;
  SELECT id INTO v_drop FROM public.rental_equipment_catalog WHERE slug='cold-storage-container-20ft' LIMIT 1;

  IF v_keep IS NOT NULL AND v_drop IS NOT NULL THEN
    -- Re-point any rental_items that reference the dropped catalog row (if such FK exists)
    -- rental_items.catalog_id is optional; guard with information_schema check via dynamic SQL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='rental_items' AND column_name='catalog_id'
    ) THEN
      EXECUTE format('UPDATE public.rental_items SET catalog_id = %L WHERE catalog_id = %L', v_keep, v_drop);
    END IF;

    -- Soft-archive the duplicate (deactivate); we keep the row for audit trail.
    UPDATE public.rental_equipment_catalog
      SET is_active = false,
          slug = slug || '-archived-' || extract(epoch from now())::bigint::text
      WHERE id = v_drop;
  END IF;
END $$;
