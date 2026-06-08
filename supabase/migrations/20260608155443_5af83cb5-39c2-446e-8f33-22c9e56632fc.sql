-- ========= Unify rental categories under central taxonomy_categories (equipment_type) =========

-- 1) Mirror the 12 rental_categories into taxonomy_categories (equipment_type)
INSERT INTO public.taxonomy_categories (
  taxonomy_type_id, slug, name_ar, name_en, description_ar, description_en,
  icon, sort_order, is_active, is_public, is_searchable, show_in_products,
  show_in_search, show_in_seo, keywords_ar, metadata
)
SELECT
  '069e30de-e312-479f-8efa-84fc8251bfaf'::uuid,
  rc.slug,
  rc.name_ar,
  COALESCE(rc.name_en, rc.name_ar),
  rc.description_ar,
  rc.description_en,
  rc.icon,
  rc.sort_order,
  rc.is_active,
  TRUE, TRUE, TRUE, TRUE, TRUE,
  rc.seo_keywords,
  jsonb_build_object('source','rental_categories','legacy_id', rc.id, 'legacy_ref_id', rc.ref_id)
FROM public.rental_categories rc
WHERE NOT EXISTS (
  SELECT 1 FROM public.taxonomy_categories tc
  WHERE tc.taxonomy_type_id = '069e30de-e312-479f-8efa-84fc8251bfaf'
    AND tc.slug = rc.slug
);

-- 2) Add taxonomy_category_id link on the master catalog & on provider items
ALTER TABLE public.rental_equipment_catalog
  ADD COLUMN IF NOT EXISTS taxonomy_category_id uuid
  REFERENCES public.taxonomy_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rec_taxonomy_cat ON public.rental_equipment_catalog(taxonomy_category_id);

ALTER TABLE public.rental_items
  ADD COLUMN IF NOT EXISTS taxonomy_category_id uuid
  REFERENCES public.taxonomy_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rental_items_taxonomy_cat ON public.rental_items(taxonomy_category_id);

-- 3) Backfill via legacy slug match
UPDATE public.rental_equipment_catalog rec
SET taxonomy_category_id = tc.id
FROM public.rental_categories rc
JOIN public.taxonomy_categories tc
  ON tc.taxonomy_type_id = '069e30de-e312-479f-8efa-84fc8251bfaf'
 AND tc.slug = rc.slug
WHERE rec.category_id = rc.id
  AND rec.taxonomy_category_id IS NULL;

UPDATE public.rental_items ri
SET taxonomy_category_id = tc.id
FROM public.rental_categories rc
JOIN public.taxonomy_categories tc
  ON tc.taxonomy_type_id = '069e30de-e312-479f-8efa-84fc8251bfaf'
 AND tc.slug = rc.slug
WHERE ri.category_id = rc.id
  AND ri.taxonomy_category_id IS NULL;

-- 4) Auto-sync trigger: when admin sets taxonomy_category_id, mirror category_id from legacy slug
CREATE OR REPLACE FUNCTION public.sync_rental_taxonomy_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_legacy_id uuid;
BEGIN
  IF NEW.taxonomy_category_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.taxonomy_category_id IS DISTINCT FROM OLD.taxonomy_category_id) THEN
    SELECT slug INTO v_slug FROM public.taxonomy_categories WHERE id = NEW.taxonomy_category_id;
    IF v_slug IS NOT NULL THEN
      SELECT id INTO v_legacy_id FROM public.rental_categories WHERE slug = v_slug;
      IF v_legacy_id IS NOT NULL THEN
        NEW.category_id := v_legacy_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rec_sync_taxonomy ON public.rental_equipment_catalog;
CREATE TRIGGER trg_rec_sync_taxonomy
BEFORE INSERT OR UPDATE ON public.rental_equipment_catalog
FOR EACH ROW EXECUTE FUNCTION public.sync_rental_taxonomy_category();

DROP TRIGGER IF EXISTS trg_rental_items_sync_taxonomy ON public.rental_items;
CREATE TRIGGER trg_rental_items_sync_taxonomy
BEFORE INSERT OR UPDATE ON public.rental_items
FOR EACH ROW EXECUTE FUNCTION public.sync_rental_taxonomy_category();
