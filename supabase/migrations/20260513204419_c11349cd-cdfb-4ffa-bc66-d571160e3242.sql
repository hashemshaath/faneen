-- 1) New columns on private_sectors
ALTER TABLE public.private_sectors
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id),
  ADD COLUMN IF NOT EXISTS seo_title_ar TEXT,
  ADD COLUMN IF NOT EXISTS seo_title_en TEXT,
  ADD COLUMN IF NOT EXISTS seo_description_ar TEXT,
  ADD COLUMN IF NOT EXISTS seo_description_en TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_private_sectors_city ON public.private_sectors(city_id);
CREATE INDEX IF NOT EXISTS idx_private_sectors_category ON public.private_sectors(category_id);
CREATE INDEX IF NOT EXISTS idx_private_sectors_slug ON public.private_sectors(slug);

-- 2) Reason GUC helper (transaction-scoped)
CREATE OR REPLACE FUNCTION public.set_private_sector_reason(_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.private_sector_reason', coalesce(_reason, ''), true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_private_sector_reason(TEXT) TO authenticated;

-- 3) Re-review trigger: critical-field changes after approval revert to pending (non-admin only)
CREATE OR REPLACE FUNCTION public.private_sectors_post_approval_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN := public.has_role(auth.uid(), 'admin');
  _critical_changed BOOLEAN := (
    OLD.name_ar IS DISTINCT FROM NEW.name_ar
    OR OLD.name_en IS DISTINCT FROM NEW.name_en
    OR OLD.description_ar IS DISTINCT FROM NEW.description_ar
    OR OLD.description_en IS DISTINCT FROM NEW.description_en
    OR OLD.brand_type IS DISTINCT FROM NEW.brand_type
    OR OLD.parent_sector IS DISTINCT FROM NEW.parent_sector
    OR OLD.logo_url IS DISTINCT FROM NEW.logo_url
    OR OLD.cover_url IS DISTINCT FROM NEW.cover_url
  );
BEGIN
  -- Admins bypass guard
  IF _is_admin THEN
    RETURN NEW;
  END IF;

  -- If status was approved and a critical field changed, force re-review
  IF OLD.status = 'approved' AND _critical_changed AND NEW.status = OLD.status THEN
    NEW.status := 'pending';
    NEW.submitted_at := now();
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_sectors_post_approval_guard ON public.private_sectors;
CREATE TRIGGER trg_private_sectors_post_approval_guard
BEFORE UPDATE ON public.private_sectors
FOR EACH ROW EXECUTE FUNCTION public.private_sectors_post_approval_guard();

-- 4) Patch audit logger to attach reason from GUC
CREATE OR REPLACE FUNCTION public.private_sectors_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action TEXT;
  _reason TEXT := nullif(current_setting('app.private_sector_reason', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.private_sector_audit_log (sector_id, entity_type, entity_id, action, actor_user_id, after_data, notes)
    VALUES (NEW.id, 'sector', NEW.id, 'created', auth.uid(), to_jsonb(NEW), _reason);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _action := NEW.status::text;
    ELSE
      _action := 'updated';
    END IF;
    INSERT INTO public.private_sector_audit_log (sector_id, entity_type, entity_id, action, actor_user_id, before_data, after_data, notes)
    VALUES (NEW.id, 'sector', NEW.id, _action, auth.uid(), to_jsonb(OLD), to_jsonb(NEW), _reason);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.private_sector_audit_log (sector_id, entity_type, entity_id, action, actor_user_id, before_data, notes)
    VALUES (OLD.id, 'sector', OLD.id, 'deleted', auth.uid(), to_jsonb(OLD), _reason);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 5) Public view for catalog/search (approved only)
CREATE OR REPLACE VIEW public.private_sectors_public AS
SELECT
  p.id, p.ref_id, p.business_id, p.parent_sector, p.brand_type,
  p.name_ar, p.name_en, p.slug,
  p.short_description_ar, p.short_description_en,
  p.description_ar, p.description_en,
  p.logo_url, p.cover_url, p.website,
  p.country_id, p.city_id, p.category_id,
  p.contact_email, p.contact_phone, p.established_year,
  p.is_featured, p.sort_order,
  p.seo_title_ar, p.seo_title_en, p.seo_description_ar, p.seo_description_en, p.seo_keywords,
  p.created_at, p.updated_at,
  c.name_ar AS city_name_ar, c.name_en AS city_name_en,
  cat.name_ar AS category_name_ar, cat.name_en AS category_name_en, cat.slug AS category_slug,
  b.name_ar AS business_name_ar, b.name_en AS business_name_en, b.username AS business_username
FROM public.private_sectors p
LEFT JOIN public.cities c ON c.id = p.city_id
LEFT JOIN public.categories cat ON cat.id = p.category_id
LEFT JOIN public.businesses b ON b.id = p.business_id
WHERE p.status = 'approved';

GRANT SELECT ON public.private_sectors_public TO anon, authenticated;