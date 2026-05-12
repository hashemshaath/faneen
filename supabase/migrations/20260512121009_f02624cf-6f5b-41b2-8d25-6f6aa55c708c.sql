-- CT8 — Legacy Contract Normalization and Backfill
-- Idempotent: safe to re-run. Affects only contracts missing template_version_id / template_snapshot_id.

-- ---------- Part G: audit/log table ----------
CREATE TABLE IF NOT EXISTS public.legacy_contract_normalization_log (
  id BIGSERIAL PRIMARY KEY,
  contract_id UUID NOT NULL,
  old_template_version_id UUID,
  new_template_version_id UUID,
  old_template_snapshot_id UUID,
  new_template_snapshot_id UUID,
  old_pricing_method TEXT,
  new_pricing_method TEXT,
  inferred_category TEXT,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.legacy_contract_normalization_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read normalization log" ON public.legacy_contract_normalization_log;
CREATE POLICY "admins read normalization log"
  ON public.legacy_contract_normalization_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No insert/update/delete policies — only service role (migrations) writes.

-- ---------- helper: infer template category from text ----------
CREATE OR REPLACE FUNCTION public._ct8_infer_category(_title TEXT, _desc TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s TEXT := lower(coalesce(_title,'') || ' ' || coalesce(_desc,''));
BEGIN
  IF s ~ '(kitchen|مطبخ|مطابخ)' THEN RETURN 'kitchens'; END IF;
  IF s ~ '(fire.?door|باب.*حريق|مقاوم.*حريق)' THEN RETURN 'fire_doors'; END IF;
  IF s ~ '(upvc)' THEN RETURN 'upvc'; END IF;
  IF s ~ '(wood.?door|باب.*خشب|أبواب خشب)' THEN RETURN 'wood_doors'; END IF;
  IF s ~ '(facade|curtain.?wall|cladding|spider|واجه|كيرتن|كلادينج|سبايدر)' THEN RETURN 'facades'; END IF;
  IF s ~ '(aluminum|aluminium|ألمنيوم|الومنيوم)' THEN RETURN 'aluminum_doors_windows'; END IF;
  IF s ~ '(glass|securit|زجاج|سيكوريت)' THEN RETURN 'glass_securit'; END IF;
  IF s ~ '(gate|pergola|hangar|بواب|برجول|هنجر|مظل|درابز|railing|steel|stainless|استيل)' THEN RETURN 'gates_structures'; END IF;
  IF s ~ '(iron.?door|حديد.*باب|أبواب حديد)' THEN RETURN 'iron_doors_windows'; END IF;
  IF s ~ '(wardrobe|closet|دولاب|دواليب|خزان(ة|ات))' THEN RETURN 'wardrobes_closets'; END IF;
  RETURN 'general';
END;
$$;

-- ---------- helper: build frozen_payload from a published version ----------
CREATE OR REPLACE FUNCTION public._ct8_build_frozen_payload(
  _version_id UUID,
  _legacy_terms_ar TEXT,
  _legacy_terms_en TEXT
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  payload JSONB;
BEGIN
  SELECT jsonb_build_object(
    'template', jsonb_build_object(
      'template_id', t.id,
      'slug', t.slug,
      'category', t.category,
      'name_ar', t.name_ar,
      'name_en', t.name_en,
      'default_locale', t.default_locale
    ),
    'version', jsonb_build_object(
      'version_id', v.id,
      'version_number', v.version_number,
      'status', v.status,
      'language_precedence', v.language_precedence,
      'effective_from', v.effective_from,
      'published_at', v.published_at,
      'risk_level', v.risk_level,
      'body_hash', v.body_hash
    ),
    'sections', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'section_key', s.section_key,
          'title_ar', s.title_ar,
          'title_en', s.title_en,
          'is_required', s.is_required,
          'sort_order', s.sort_order,
          'clauses', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', c.id,
                'body_ar', c.body_ar,
                'body_en', c.body_en,
                'is_mandatory', c.is_mandatory,
                'is_editable_by_provider', c.is_editable_by_provider,
                'is_editable_by_client', c.is_editable_by_client,
                'legal_reference', c.legal_reference,
                'tags', c.tags,
                'sort_order', c.sort_order
              ) ORDER BY c.sort_order
            )
            FROM contract_template_clauses c WHERE c.section_id = s.id
          ), '[]'::jsonb)
        ) ORDER BY s.sort_order
      )
      FROM contract_template_sections s WHERE s.version_id = v.id
    ), '[]'::jsonb),
    'pricing_rules', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id, 'method', p.method, 'is_default', p.is_default,
          'required_fields', p.required_fields, 'formula', p.formula,
          'rounding', p.rounding, 'vat_handling', p.vat_handling,
          'display_in_pdf', p.display_in_pdf
        )
      )
      FROM contract_template_pricing_rules p WHERE p.version_id = v.id
    ), '[]'::jsonb),
    'required_fields', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id, 'field_key', r.field_key, 'field_type', r.field_type,
          'label_ar', r.label_ar, 'label_en', r.label_en,
          'help_ar', r.help_ar, 'help_en', r.help_en,
          'enum_values', r.enum_values, 'is_required', r.is_required,
          'applies_to', r.applies_to, 'validation', r.validation,
          'sort_order', r.sort_order
        ) ORDER BY r.sort_order
      )
      FROM contract_template_required_fields r WHERE r.version_id = v.id
    ), '[]'::jsonb),
    'attachments', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id, 'kind', a.kind, 'title_ar', a.title_ar, 'title_en', a.title_en,
          'file_url', a.file_url, 'is_mandatory', a.is_mandatory,
          'precedence_order', a.precedence_order
        ) ORDER BY a.precedence_order
      )
      FROM contract_template_attachments a WHERE a.version_id = v.id
    ), '[]'::jsonb),
    'legacy_overrides', jsonb_build_array(
      jsonb_build_object(
        'section_key', 'legacy_terms',
        'title_ar', 'الشروط الحالية للعقد',
        'title_en', 'Existing Contract Terms',
        'body_ar', COALESCE(_legacy_terms_ar, ''),
        'body_en', COALESCE(_legacy_terms_en, ''),
        'source', 'ct8_backfill'
      )
    ),
    'frozen_at', to_jsonb(now()),
    'snapshot_source', 'ct8_legacy_backfill'
  )
  INTO payload
  FROM contract_template_versions v
  JOIN contract_templates t ON t.id = v.template_id
  WHERE v.id = _version_id;

  RETURN payload;
END;
$$;

-- ---------- Part B + C + D + E: do the backfill ----------
DO $$
DECLARE
  c RECORD;
  v_category TEXT;
  v_version_id UUID;
  v_default_method TEXT;
  v_payload JSONB;
  v_snapshot_id UUID;
  v_old_template UUID;
  v_old_snapshot UUID;
  v_old_method TEXT;
BEGIN
  FOR c IN
    SELECT id, title_ar, title_en, description_ar, description_en,
           terms_ar, terms_en, template_version_id, template_snapshot_id,
           pricing_method, status
    FROM contracts
  LOOP
    v_old_template := c.template_version_id;
    v_old_snapshot := c.template_snapshot_id;
    v_old_method   := c.pricing_method;

    -- Infer category and pick published version
    v_category := public._ct8_infer_category(
      coalesce(c.title_ar,'') || ' ' || coalesce(c.title_en,''),
      coalesce(c.description_ar,'') || ' ' || coalesce(c.description_en,'')
    );

    SELECT v.id INTO v_version_id
    FROM contract_template_versions v
    JOIN contract_templates t ON t.id = v.template_id
    WHERE v.status = 'published' AND t.category = v_category
    ORDER BY v.version_number DESC
    LIMIT 1;

    -- Fallback to general
    IF v_version_id IS NULL THEN
      SELECT v.id INTO v_version_id
      FROM contract_template_versions v
      JOIN contract_templates t ON t.id = v.template_id
      WHERE v.status = 'published' AND t.category = 'general'
      ORDER BY v.version_number DESC
      LIMIT 1;
      v_category := 'general';
    END IF;

    IF v_version_id IS NULL THEN
      INSERT INTO public.legacy_contract_normalization_log
        (contract_id, action, notes, inferred_category)
      VALUES (c.id, 'skipped', 'no published template available', v_category);
      CONTINUE;
    END IF;

    -- Default pricing method for this template
    SELECT method INTO v_default_method
    FROM contract_template_pricing_rules
    WHERE version_id = v_version_id AND is_default
    LIMIT 1;

    -- Part B: assign template_version_id + pricing_method (idempotent)
    IF c.template_version_id IS NULL THEN
      UPDATE contracts
        SET template_version_id = v_version_id,
            pricing_method = COALESCE(c.pricing_method, v_default_method)
        WHERE id = c.id;
    ELSIF c.pricing_method IS NULL AND v_default_method IS NOT NULL THEN
      UPDATE contracts SET pricing_method = v_default_method WHERE id = c.id;
    END IF;

    -- Part C: snapshot (idempotent via unique(contract_id))
    IF c.template_snapshot_id IS NULL THEN
      v_payload := public._ct8_build_frozen_payload(v_version_id, c.terms_ar, c.terms_en);

      INSERT INTO contract_template_snapshots (contract_id, version_id, frozen_payload)
      VALUES (c.id, v_version_id, v_payload)
      ON CONFLICT (contract_id) DO NOTHING
      RETURNING id INTO v_snapshot_id;

      IF v_snapshot_id IS NULL THEN
        SELECT id INTO v_snapshot_id FROM contract_template_snapshots WHERE contract_id = c.id;
      END IF;

      UPDATE contracts SET template_snapshot_id = v_snapshot_id WHERE id = c.id AND template_snapshot_id IS NULL;
    ELSE
      v_snapshot_id := c.template_snapshot_id;
    END IF;

    INSERT INTO public.legacy_contract_normalization_log
      (contract_id, old_template_version_id, new_template_version_id,
       old_template_snapshot_id, new_template_snapshot_id,
       old_pricing_method, new_pricing_method, inferred_category, action)
    VALUES (
      c.id, v_old_template, v_version_id,
      v_old_snapshot, v_snapshot_id,
      v_old_method, COALESCE(v_old_method, v_default_method),
      v_category,
      CASE WHEN v_old_template IS NULL OR v_old_snapshot IS NULL
           THEN 'normalized' ELSE 'verified' END
    );
  END LOOP;
END $$;

-- ---------- Part D: line item normalization (no rows currently — still safe) ----------
UPDATE contract_line_items SET pricing_method = 'unit' WHERE pricing_method IS NULL;
UPDATE contract_line_items SET unit_of_measure = CASE pricing_method
    WHEN 'unit' THEN 'pcs'
    WHEN 'linear_meter' THEN 'm'
    WHEN 'square_meter' THEN 'm²'
    WHEN 'cubic_meter' THEN 'm³'
    WHEN 'kilogram' THEN 'kg'
    WHEN 'ton' THEN 't'
    WHEN 'lump_sum' THEN '—'
    ELSE 'pcs'
  END
  WHERE unit_of_measure IS NULL;
UPDATE contract_line_items SET formula_inputs = '{}'::jsonb WHERE formula_inputs IS NULL;
UPDATE contract_line_items SET boq_group_key = 'other' WHERE boq_group_key IS NULL;
UPDATE contract_line_items SET is_optional = false WHERE is_optional IS NULL;

-- ---------- Drop helper functions (one-shot) ----------
DROP FUNCTION IF EXISTS public._ct8_infer_category(TEXT, TEXT);
DROP FUNCTION IF EXISTS public._ct8_build_frozen_payload(UUID, TEXT, TEXT);
