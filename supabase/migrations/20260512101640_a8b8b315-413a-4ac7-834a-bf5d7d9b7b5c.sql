
DO $$
DECLARE
  mapping jsonb := '[
    {"slug":"general","methods":["unit","lump_sum"],"default":"lump_sum"},
    {"slug":"kitchens","methods":["linear_meter","square_meter","unit","lump_sum"],"default":"linear_meter"},
    {"slug":"aluminum_doors_windows","methods":["unit","square_meter","linear_meter"],"default":"unit"},
    {"slug":"wood_doors","methods":["unit","square_meter","linear_meter"],"default":"unit"},
    {"slug":"fire_doors","methods":["unit","square_meter","linear_meter"],"default":"unit"},
    {"slug":"upvc","methods":["unit","square_meter","linear_meter"],"default":"unit"},
    {"slug":"iron_doors_windows","methods":["unit","square_meter","linear_meter"],"default":"unit"},
    {"slug":"facades","methods":["square_meter","linear_meter","lump_sum"],"default":"square_meter"},
    {"slug":"glass_securit","methods":["square_meter","unit"],"default":"square_meter"},
    {"slug":"gates_structures","methods":["kilogram","ton","linear_meter","unit","lump_sum"],"default":"kilogram"}
  ]'::jsonb;
  m jsonb;
  v_id uuid;
  meth text;
  def text;
BEGIN
  FOR m IN SELECT * FROM jsonb_array_elements(mapping) LOOP
    SELECT v.id INTO v_id
    FROM contract_templates t
    JOIN contract_template_versions v ON v.template_id = t.id
    WHERE t.slug = (m->>'slug') AND v.status = 'published'
    ORDER BY v.version_number DESC LIMIT 1;

    IF v_id IS NULL THEN
      RAISE NOTICE 'CT5E seed: skipped slug=% (no published version)', (m->>'slug');
      CONTINUE;
    END IF;

    def := m->>'default';

    FOR meth IN SELECT jsonb_array_elements_text(m->'methods') LOOP
      INSERT INTO contract_template_pricing_rules
        (version_id, method, is_default, required_fields, formula, rounding, vat_handling, display_in_pdf)
      SELECT v_id, meth, (meth = def), '[]'::jsonb, NULL, '{}'::jsonb, 'inherit', '{}'::jsonb
      WHERE NOT EXISTS (
        SELECT 1 FROM contract_template_pricing_rules
        WHERE version_id = v_id AND method = meth
      );
    END LOOP;
  END LOOP;
END $$;
