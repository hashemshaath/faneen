
-- جدول لتخزين لقطات ميتا السيو لكل قطاع
CREATE TABLE public.sector_seo_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_slug text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  keywords text NOT NULL,
  tagline text,
  language text NOT NULL DEFAULT 'ar' CHECK (language IN ('ar','en')),
  title_length int NOT NULL,
  description_length int NOT NULL,
  keywords_count int NOT NULL,
  captured_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sector_seo_snapshots_sector_lang_date
  ON public.sector_seo_snapshots (sector_slug, language, created_at DESC);

ALTER TABLE public.sector_seo_snapshots ENABLE ROW LEVEL SECURITY;

-- المشرفون فقط: قراءة وإضافة وحذف
CREATE POLICY "admins_read_seo_snapshots"
  ON public.sector_seo_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admins_insert_seo_snapshots"
  ON public.sector_seo_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "admins_delete_seo_snapshots"
  ON public.sector_seo_snapshots FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
