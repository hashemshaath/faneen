
-- =========================================================
-- CT2: Contract Template Engine Schema (additive only)
-- =========================================================

-- ---------- Part A: Extend contract_templates ----------
ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS service_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_locale text NOT NULL DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS current_version_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS contract_templates_slug_uidx
  ON public.contract_templates(slug) WHERE slug IS NOT NULL;

-- ---------- Part B: contract_template_versions ----------
CREATE TABLE IF NOT EXISTS public.contract_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','changes_requested','legal_approved','published','archived','superseded')),
  effective_from timestamptz,
  superseded_by uuid REFERENCES public.contract_template_versions(id),
  published_at timestamptz,
  published_by uuid,
  legal_reviewer_id uuid,
  legal_review_notes text,
  risk_level text CHECK (risk_level IN ('low','medium','high')),
  language_precedence text NOT NULL DEFAULT 'ar' CHECK (language_precedence IN ('ar','en')),
  body_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (template_id, version_number)
);
CREATE INDEX IF NOT EXISTS ctv_template_idx ON public.contract_template_versions(template_id);
CREATE INDEX IF NOT EXISTS ctv_status_idx ON public.contract_template_versions(status);

-- Now add the FK from contract_templates.current_version_id -> versions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contract_templates_current_version_fk'
  ) THEN
    ALTER TABLE public.contract_templates
      ADD CONSTRAINT contract_templates_current_version_fk
      FOREIGN KEY (current_version_id)
      REFERENCES public.contract_template_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------- Part C: sections + clauses ----------
CREATE TABLE IF NOT EXISTS public.contract_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.contract_template_versions(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  title_ar text NOT NULL,
  title_en text,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cts_version_idx ON public.contract_template_sections(version_id);

CREATE TABLE IF NOT EXISTS public.contract_template_clauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.contract_template_sections(id) ON DELETE CASCADE,
  body_ar text NOT NULL,
  body_en text,
  sort_order integer NOT NULL DEFAULT 0,
  is_mandatory boolean NOT NULL DEFAULT true,
  is_editable_by_provider boolean NOT NULL DEFAULT false,
  is_editable_by_client boolean NOT NULL DEFAULT false,
  tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  legal_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ctc_section_idx ON public.contract_template_clauses(section_id);

-- ---------- Part D: measurement methods + pricing rules ----------
CREATE TABLE IF NOT EXISTS public.contract_measurement_methods (
  id text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  symbol text,
  decimals integer NOT NULL DEFAULT 2,
  description_ar text,
  description_en text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.contract_measurement_methods (id, label_ar, label_en, symbol, decimals, description_ar, description_en) VALUES
  ('unit',           'قطعة',         'Unit',            'pcs', 0, 'تسعير لكل قطعة',                'Price per unit'),
  ('linear_meter',   'متر طولي',     'Linear meter',    'm',   3, 'تسعير حسب الطول',               'Price per linear meter'),
  ('square_meter',   'متر مربع',     'Square meter',    'm²',  3, 'تسعير حسب المساحة',             'Price per square meter'),
  ('cubic_meter',    'متر مكعب',     'Cubic meter',     'm³',  3, 'تسعير حسب الحجم',               'Price per cubic meter'),
  ('kilogram',       'كيلوغرام',     'Kilogram',        'kg',  2, 'تسعير حسب الوزن بالكيلو',       'Price per kilogram'),
  ('ton',            'طن',           'Ton',             't',   3, 'تسعير حسب الوزن بالطن',         'Price per ton'),
  ('lump_sum',       'مبلغ مقطوع',   'Lump sum',         NULL, 2, 'مبلغ مقطوع لكامل النطاق',       'Single fixed amount'),
  ('milestone',      'دفعات مرحلية', 'Milestone',        NULL, 2, 'تسعير على دفعات مرتبطة بالإنجاز','Stage-based payments'),
  ('itemized_boq',   'جدول كميات',   'Itemized BOQ',     NULL, 2, 'تسعير بنود تفصيلية',            'Bill of quantities'),
  ('custom_formula', 'صيغة مخصصة',   'Custom formula',   NULL, 2, 'صيغة حسابية مخصصة',             'Custom calculation formula'),
  ('mixed',          'حساب مختلط',   'Mixed calculation',NULL, 2, 'مزيج من طرق التسعير',           'Mix of pricing methods')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.contract_template_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.contract_template_versions(id) ON DELETE CASCADE,
  method text NOT NULL REFERENCES public.contract_measurement_methods(id),
  is_default boolean NOT NULL DEFAULT false,
  required_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  formula text,
  rounding jsonb NOT NULL DEFAULT '{}'::jsonb,
  vat_handling text NOT NULL DEFAULT 'inherit'
    CHECK (vat_handling IN ('inherit','inclusive','exclusive','exempt')),
  display_in_pdf jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ctpr_version_idx ON public.contract_template_pricing_rules(version_id);

-- ---------- Part E: required fields + attachments ----------
CREATE TABLE IF NOT EXISTS public.contract_template_required_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.contract_template_versions(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text','number','enum','date','boolean','attachment','json')),
  label_ar text NOT NULL,
  label_en text,
  help_ar text,
  help_en text,
  enum_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT true,
  applies_to text NOT NULL DEFAULT 'provider' CHECK (applies_to IN ('provider','client','both')),
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_id, field_key)
);

CREATE TABLE IF NOT EXISTS public.contract_template_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.contract_template_versions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title_ar text NOT NULL,
  title_en text,
  file_url text,
  is_mandatory boolean NOT NULL DEFAULT false,
  precedence_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Part F: snapshots ----------
CREATE TABLE IF NOT EXISTS public.contract_template_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.contract_template_versions(id),
  frozen_payload jsonb NOT NULL,
  frozen_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (contract_id)
);
CREATE INDEX IF NOT EXISTS cts_snap_version_idx ON public.contract_template_snapshots(version_id);

-- Block deletion of versions that any snapshot references
CREATE OR REPLACE FUNCTION public.tg_block_version_delete_if_snapshotted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.contract_template_snapshots WHERE version_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete contract_template_version % — it is referenced by contract snapshots', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_block_version_delete ON public.contract_template_versions;
CREATE TRIGGER trg_block_version_delete
  BEFORE DELETE ON public.contract_template_versions
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_version_delete_if_snapshotted();

-- ---------- Part G: extend contracts + contract_line_items (nullable) ----------
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS template_version_id uuid REFERENCES public.contract_template_versions(id),
  ADD COLUMN IF NOT EXISTS service_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pricing_method text REFERENCES public.contract_measurement_methods(id),
  ADD COLUMN IF NOT EXISTS template_snapshot_id uuid REFERENCES public.contract_template_snapshots(id);

ALTER TABLE public.contract_line_items
  ADD COLUMN IF NOT EXISTS pricing_method text REFERENCES public.contract_measurement_methods(id),
  ADD COLUMN IF NOT EXISTS unit_of_measure text,
  ADD COLUMN IF NOT EXISTS formula_inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS boq_group_key text,
  ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;

-- ---------- updated_at triggers ----------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contract_template_versions',
    'contract_template_sections',
    'contract_template_clauses',
    'contract_template_pricing_rules',
    'contract_template_required_fields',
    'contract_template_attachments'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;
       CREATE TRIGGER trg_%1$s_updated_at
         BEFORE UPDATE ON public.%1$s
         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      t
    );
  END LOOP;
END $$;

-- =========================================================
-- Part I: RLS
-- =========================================================
ALTER TABLE public.contract_template_versions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_template_sections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_template_clauses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_measurement_methods        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_template_pricing_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_template_required_fields   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_template_attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_template_snapshots         ENABLE ROW LEVEL SECURITY;

-- Measurement methods: public read of active rows; admin write
DROP POLICY IF EXISTS measurement_methods_read ON public.contract_measurement_methods;
CREATE POLICY measurement_methods_read ON public.contract_measurement_methods
  FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS measurement_methods_write ON public.contract_measurement_methods;
CREATE POLICY measurement_methods_write ON public.contract_measurement_methods
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Versions: published readable, others admin-only
DROP POLICY IF EXISTS ctv_read_published ON public.contract_template_versions;
CREATE POLICY ctv_read_published ON public.contract_template_versions
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS ctv_admin_write ON public.contract_template_versions;
CREATE POLICY ctv_admin_write ON public.contract_template_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Helper expression: row visible if its parent version is published OR caller is admin
-- Sections
DROP POLICY IF EXISTS cts_read ON public.contract_template_sections;
CREATE POLICY cts_read ON public.contract_template_sections
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    OR EXISTS (SELECT 1 FROM public.contract_template_versions v WHERE v.id = version_id AND v.status = 'published')
  );
DROP POLICY IF EXISTS cts_admin_write ON public.contract_template_sections;
CREATE POLICY cts_admin_write ON public.contract_template_sections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Clauses
DROP POLICY IF EXISTS ctc_read ON public.contract_template_clauses;
CREATE POLICY ctc_read ON public.contract_template_clauses
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.contract_template_sections s
      JOIN public.contract_template_versions v ON v.id = s.version_id
      WHERE s.id = section_id AND v.status = 'published'
    )
  );
DROP POLICY IF EXISTS ctc_admin_write ON public.contract_template_clauses;
CREATE POLICY ctc_admin_write ON public.contract_template_clauses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Pricing rules
DROP POLICY IF EXISTS ctpr_read ON public.contract_template_pricing_rules;
CREATE POLICY ctpr_read ON public.contract_template_pricing_rules
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    OR EXISTS (SELECT 1 FROM public.contract_template_versions v WHERE v.id = version_id AND v.status = 'published')
  );
DROP POLICY IF EXISTS ctpr_admin_write ON public.contract_template_pricing_rules;
CREATE POLICY ctpr_admin_write ON public.contract_template_pricing_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Required fields
DROP POLICY IF EXISTS ctrf_read ON public.contract_template_required_fields;
CREATE POLICY ctrf_read ON public.contract_template_required_fields
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    OR EXISTS (SELECT 1 FROM public.contract_template_versions v WHERE v.id = version_id AND v.status = 'published')
  );
DROP POLICY IF EXISTS ctrf_admin_write ON public.contract_template_required_fields;
CREATE POLICY ctrf_admin_write ON public.contract_template_required_fields
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Attachments
DROP POLICY IF EXISTS cta_read ON public.contract_template_attachments;
CREATE POLICY cta_read ON public.contract_template_attachments
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    OR EXISTS (SELECT 1 FROM public.contract_template_versions v WHERE v.id = version_id AND v.status = 'published')
  );
DROP POLICY IF EXISTS cta_admin_write ON public.contract_template_attachments;
CREATE POLICY cta_admin_write ON public.contract_template_attachments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Snapshots: contract parties + admin can read; no party writes
DROP POLICY IF EXISTS cts_snap_read ON public.contract_template_snapshots;
CREATE POLICY cts_snap_read ON public.contract_template_snapshots
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );
-- No INSERT/UPDATE/DELETE policies => denied for all non-admin roles.
DROP POLICY IF EXISTS cts_snap_admin_write ON public.contract_template_snapshots;
CREATE POLICY cts_snap_admin_write ON public.contract_template_snapshots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- =========================================================
-- Part H: Seed v1 from existing contract_templates + General fallback
-- =========================================================
DO $$
DECLARE
  tmpl record;
  new_version_id uuid;
  sect_id uuid;
  general_id uuid;
  general_version_id uuid;
BEGIN
  -- 1) For every existing template, create v1 if no version exists yet
  FOR tmpl IN SELECT * FROM public.contract_templates LOOP
    IF NOT EXISTS (SELECT 1 FROM public.contract_template_versions WHERE template_id = tmpl.id) THEN
      INSERT INTO public.contract_template_versions
        (template_id, version_number, status, effective_from, published_at, language_precedence)
      VALUES
        (tmpl.id, 1, 'published', now(), now(), 'ar')
      RETURNING id INTO new_version_id;

      -- helper: insert section + clause for each non-empty legacy text block
      -- terms
      IF tmpl.terms_ar IS NOT NULL AND length(btrim(tmpl.terms_ar)) > 0 THEN
        INSERT INTO public.contract_template_sections (version_id, section_key, title_ar, title_en, sort_order)
          VALUES (new_version_id, 'terms', 'الشروط العامة', 'General Terms', 10) RETURNING id INTO sect_id;
        INSERT INTO public.contract_template_clauses (section_id, body_ar, body_en, sort_order, is_mandatory)
          VALUES (sect_id, tmpl.terms_ar, tmpl.terms_en, 0, true);
      END IF;
      -- scope
      IF tmpl.scope_of_work_ar IS NOT NULL AND length(btrim(tmpl.scope_of_work_ar)) > 0 THEN
        INSERT INTO public.contract_template_sections (version_id, section_key, title_ar, title_en, sort_order)
          VALUES (new_version_id, 'scope', 'نطاق العمل', 'Scope of Work', 20) RETURNING id INTO sect_id;
        INSERT INTO public.contract_template_clauses (section_id, body_ar, body_en, sort_order, is_mandatory)
          VALUES (sect_id, tmpl.scope_of_work_ar, tmpl.scope_of_work_en, 0, true);
      END IF;
      -- warranty
      IF tmpl.warranty_terms_ar IS NOT NULL AND length(btrim(tmpl.warranty_terms_ar)) > 0 THEN
        INSERT INTO public.contract_template_sections (version_id, section_key, title_ar, title_en, sort_order)
          VALUES (new_version_id, 'warranty', 'الضمان', 'Warranty', 30) RETURNING id INTO sect_id;
        INSERT INTO public.contract_template_clauses (section_id, body_ar, body_en, sort_order, is_mandatory)
          VALUES (sect_id, tmpl.warranty_terms_ar, tmpl.warranty_terms_en, 0, true);
      END IF;
      -- payment
      IF tmpl.payment_terms_ar IS NOT NULL AND length(btrim(tmpl.payment_terms_ar)) > 0 THEN
        INSERT INTO public.contract_template_sections (version_id, section_key, title_ar, title_en, sort_order)
          VALUES (new_version_id, 'payment', 'شروط الدفع', 'Payment Terms', 40) RETURNING id INTO sect_id;
        INSERT INTO public.contract_template_clauses (section_id, body_ar, body_en, sort_order, is_mandatory)
          VALUES (sect_id, tmpl.payment_terms_ar, tmpl.payment_terms_en, 0, true);
      END IF;
      -- penalties
      IF tmpl.penalties_ar IS NOT NULL AND length(btrim(tmpl.penalties_ar)) > 0 THEN
        INSERT INTO public.contract_template_sections (version_id, section_key, title_ar, title_en, sort_order)
          VALUES (new_version_id, 'penalties', 'الغرامات', 'Penalties', 50) RETURNING id INTO sect_id;
        INSERT INTO public.contract_template_clauses (section_id, body_ar, body_en, sort_order, is_mandatory)
          VALUES (sect_id, tmpl.penalties_ar, tmpl.penalties_en, 0, true);
      END IF;
      -- notes
      IF tmpl.notes_ar IS NOT NULL AND length(btrim(tmpl.notes_ar)) > 0 THEN
        INSERT INTO public.contract_template_sections (version_id, section_key, title_ar, title_en, sort_order)
          VALUES (new_version_id, 'notes', 'ملاحظات', 'Notes', 60) RETURNING id INTO sect_id;
        INSERT INTO public.contract_template_clauses (section_id, body_ar, body_en, sort_order, is_mandatory)
          VALUES (sect_id, tmpl.notes_ar, tmpl.notes_en, 0, false);
      END IF;

      -- Set current_version_id and slug if missing
      UPDATE public.contract_templates
        SET current_version_id = new_version_id,
            slug = COALESCE(slug, tmpl.category)
        WHERE id = tmpl.id;
    END IF;
  END LOOP;

  -- 2) Fallback "General Contract Template v1"
  SELECT id INTO general_id FROM public.contract_templates WHERE slug = 'general' LIMIT 1;
  IF general_id IS NULL THEN
    INSERT INTO public.contract_templates
      (category, slug, name_ar, name_en, description_ar, description_en, terms_ar, terms_en, default_locale, is_active, sort_order)
    VALUES
      ('general', 'general',
       'القالب العام للعقود', 'General Contract Template',
       'قالب احتياطي يُستخدم عند عدم توفّر قالب مخصص للفئة', 'Fallback template used when no category-specific template is available',
       'تخضع هذه الاتفاقية للشروط العامة المعتمدة من منصة قطاعات.',
       'This agreement is governed by the standard terms approved by the Qitaat platform.',
       'ar', true, 999)
    RETURNING id INTO general_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract_template_versions WHERE template_id = general_id) THEN
    INSERT INTO public.contract_template_versions
      (template_id, version_number, status, effective_from, published_at, language_precedence)
    VALUES (general_id, 1, 'published', now(), now(), 'ar')
    RETURNING id INTO general_version_id;

    INSERT INTO public.contract_template_sections (version_id, section_key, title_ar, title_en, sort_order)
      VALUES (general_version_id, 'terms', 'الشروط العامة', 'General Terms', 10) RETURNING id INTO sect_id;
    INSERT INTO public.contract_template_clauses (section_id, body_ar, body_en, sort_order, is_mandatory)
      VALUES (sect_id,
              'تخضع هذه الاتفاقية للشروط العامة المعتمدة من منصة قطاعات وللأنظمة المعمول بها.',
              'This agreement is governed by the standard terms approved by the Qitaat platform and applicable regulations.',
              0, true);

    UPDATE public.contract_templates SET current_version_id = general_version_id WHERE id = general_id;
  END IF;
END $$;
