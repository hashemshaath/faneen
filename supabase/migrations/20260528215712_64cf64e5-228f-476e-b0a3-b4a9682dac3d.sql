-- BUSINESS-WORKFLOW-5B: Measurement templates for Work Orders.
-- Reusable, sector-scoped presets that speed up common measurement entry
-- without touching the existing work_order_measurements table.

CREATE SEQUENCE IF NOT EXISTS public.work_order_measurement_templates_ref_seq START WITH 1000;

CREATE TABLE public.work_order_measurement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  sector_key text NOT NULL,
  template_key text NOT NULL UNIQUE,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description_ar text NULL,
  description_en text NULL,
  default_measurement_type text NOT NULL DEFAULT 'custom',
  default_unit text NOT NULL DEFAULT 'cm'
    CHECK (default_unit IN ('mm','cm','m','inch')),
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(sector_key) BETWEEN 1 AND 50),
  CHECK (char_length(template_key) BETWEEN 1 AND 80),
  CHECK (char_length(title_ar) BETWEEN 1 AND 200),
  CHECK (char_length(title_en) BETWEEN 1 AND 200),
  CHECK (jsonb_typeof(fields) = 'array')
);

CREATE INDEX idx_womt_sector ON public.work_order_measurement_templates (sector_key) WHERE is_active;
CREATE INDEX idx_womt_active_sort ON public.work_order_measurement_templates (is_active, sort_order);

-- Templates are non-sensitive reference data.
-- Authenticated users may read; only service_role mutates.
GRANT SELECT ON public.work_order_measurement_templates TO authenticated;
GRANT ALL ON public.work_order_measurement_templates TO service_role;

ALTER TABLE public.work_order_measurement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "womt_select_authenticated" ON public.work_order_measurement_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

-- No INSERT / UPDATE / DELETE policies for authenticated → service_role only.

CREATE OR REPLACE FUNCTION public.trg_work_order_measurement_templates_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN
    NEW.ref_id := 'WMT-' || nextval('public.work_order_measurement_templates_ref_seq')::text;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_order_measurement_templates_defaults
BEFORE INSERT OR UPDATE ON public.work_order_measurement_templates
FOR EACH ROW EXECUTE FUNCTION public.trg_work_order_measurement_templates_defaults();

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed default templates (idempotent via ON CONFLICT on template_key).
-- Field schema items:
--   { key, label_ar, label_en, type: number|text|select|boolean,
--     unit?, required?, options?: [{value,label_ar,label_en}], maps_to?: column }
-- maps_to ∈ width|height|depth|length|quantity → row column; otherwise metadata.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.work_order_measurement_templates
  (sector_key, template_key, title_ar, title_en, description_ar, description_en,
   default_measurement_type, default_unit, fields, sort_order)
VALUES
  ('kitchen', 'kitchen_basic',
   'مطبخ — قياسات أساسية', 'Kitchen — basic measurements',
   'طول الجدار وعرض الخزانات وعمق سطح العمل وفتحات الأجهزة.',
   'Wall length, cabinet width, counter depth, sink and appliance openings.',
   'kitchen', 'cm',
   '[
      {"key":"wall_length","label_ar":"طول الجدار","label_en":"Wall length","type":"number","unit":"cm","required":true,"maps_to":"length"},
      {"key":"cabinet_width","label_ar":"عرض الخزانة","label_en":"Cabinet width","type":"number","unit":"cm","required":true,"maps_to":"width"},
      {"key":"countertop_depth","label_ar":"عمق سطح العمل","label_en":"Countertop depth","type":"number","unit":"cm","maps_to":"depth"},
      {"key":"height_to_ceiling","label_ar":"الارتفاع للسقف","label_en":"Height to ceiling","type":"number","unit":"cm","maps_to":"height"},
      {"key":"sink_opening","label_ar":"فتحة الحوض","label_en":"Sink opening","type":"number","unit":"cm"},
      {"key":"appliance_opening","label_ar":"فتحة الأجهزة","label_en":"Appliance opening","type":"number","unit":"cm"}
    ]'::jsonb,
   10),

  ('aluminum', 'window_basic',
   'نافذة ألمنيوم — قياسات', 'Aluminum window — measurements',
   'عرض وارتفاع الفتحة وعمق الإطار وسماكة الزجاج.',
   'Opening width/height, frame depth and glass thickness.',
   'window', 'cm',
   '[
      {"key":"width","label_ar":"عرض الفتحة","label_en":"Opening width","type":"number","unit":"cm","required":true,"maps_to":"width"},
      {"key":"height","label_ar":"ارتفاع الفتحة","label_en":"Opening height","type":"number","unit":"cm","required":true,"maps_to":"height"},
      {"key":"frame_depth","label_ar":"عمق الإطار","label_en":"Frame depth","type":"number","unit":"cm","maps_to":"depth"},
      {"key":"quantity","label_ar":"الكمية","label_en":"Quantity","type":"number","required":true,"maps_to":"quantity"},
      {"key":"glass_thickness","label_ar":"سماكة الزجاج","label_en":"Glass thickness","type":"number","unit":"mm"},
      {"key":"installation_side","label_ar":"جهة التركيب","label_en":"Installation side","type":"select","options":[
        {"value":"inside","label_ar":"داخلي","label_en":"Inside"},
        {"value":"outside","label_ar":"خارجي","label_en":"Outside"}
      ]}
    ]'::jsonb,
   20),

  ('doors', 'door_basic',
   'باب — قياسات', 'Door — measurements',
   'عرض الباب وارتفاعه وعرض الإطار واتجاه الفتح.',
   'Door width/height, frame width and swing direction.',
   'door', 'cm',
   '[
      {"key":"width","label_ar":"عرض الباب","label_en":"Door width","type":"number","unit":"cm","required":true,"maps_to":"width"},
      {"key":"height","label_ar":"ارتفاع الباب","label_en":"Door height","type":"number","unit":"cm","required":true,"maps_to":"height"},
      {"key":"frame_width","label_ar":"عرض الإطار","label_en":"Frame width","type":"number","unit":"cm","maps_to":"length"},
      {"key":"quantity","label_ar":"الكمية","label_en":"Quantity","type":"number","required":true,"maps_to":"quantity"},
      {"key":"swing_direction","label_ar":"اتجاه الفتح","label_en":"Swing direction","type":"select","options":[
        {"value":"left","label_ar":"يسار","label_en":"Left"},
        {"value":"right","label_ar":"يمين","label_en":"Right"},
        {"value":"in","label_ar":"للداخل","label_en":"Inward"},
        {"value":"out","label_ar":"للخارج","label_en":"Outward"}
      ]}
    ]'::jsonb,
   30),

  ('glass', 'glass_panel',
   'لوح زجاج — قياسات', 'Glass panel — measurements',
   'عرض اللوح وارتفاعه وسماكته ونوع الحواف.',
   'Panel width/height, thickness and edge type.',
   'glass', 'cm',
   '[
      {"key":"width","label_ar":"العرض","label_en":"Width","type":"number","unit":"cm","required":true,"maps_to":"width"},
      {"key":"height","label_ar":"الارتفاع","label_en":"Height","type":"number","unit":"cm","required":true,"maps_to":"height"},
      {"key":"thickness","label_ar":"السماكة","label_en":"Thickness","type":"number","unit":"mm","maps_to":"depth"},
      {"key":"quantity","label_ar":"الكمية","label_en":"Quantity","type":"number","required":true,"maps_to":"quantity"},
      {"key":"edge_type","label_ar":"نوع الحافة","label_en":"Edge type","type":"select","options":[
        {"value":"polished","label_ar":"مصقولة","label_en":"Polished"},
        {"value":"beveled","label_ar":"مشطوفة","label_en":"Beveled"},
        {"value":"raw","label_ar":"خام","label_en":"Raw"}
      ]}
    ]'::jsonb,
   40),

  ('steel', 'steel_frame',
   'هيكل حديد — قياسات', 'Steel frame — measurements',
   'الطول والارتفاع وسماكة المقطع والكمية.',
   'Length, height, profile thickness and quantity.',
   'steel', 'cm',
   '[
      {"key":"length","label_ar":"الطول","label_en":"Length","type":"number","unit":"cm","required":true,"maps_to":"length"},
      {"key":"height","label_ar":"الارتفاع","label_en":"Height","type":"number","unit":"cm","maps_to":"height"},
      {"key":"thickness","label_ar":"السماكة","label_en":"Thickness","type":"number","unit":"mm","maps_to":"depth"},
      {"key":"quantity","label_ar":"الكمية","label_en":"Quantity","type":"number","required":true,"maps_to":"quantity"},
      {"key":"profile","label_ar":"نوع المقطع","label_en":"Section / profile","type":"text"}
    ]'::jsonb,
   50),

  ('facades', 'facade_panel',
   'واجهة — قياسات لوح', 'Facade panel — measurements',
   'عرض وارتفاع الفتحة، تباعد القوائم، عدد الألواح ونوع الزجاج.',
   'Bay width/height, mullion spacing, panel count and glass type.',
   'facade', 'cm',
   '[
      {"key":"bay_width","label_ar":"عرض الفتحة","label_en":"Bay width","type":"number","unit":"cm","required":true,"maps_to":"width"},
      {"key":"bay_height","label_ar":"ارتفاع الفتحة","label_en":"Bay height","type":"number","unit":"cm","required":true,"maps_to":"height"},
      {"key":"panel_count","label_ar":"عدد الألواح","label_en":"Panel count","type":"number","required":true,"maps_to":"quantity"},
      {"key":"mullion_spacing","label_ar":"تباعد القوائم","label_en":"Mullion spacing","type":"number","unit":"cm"},
      {"key":"glass_type","label_ar":"نوع الزجاج","label_en":"Glass type","type":"text"}
    ]'::jsonb,
   60),

  ('general', 'custom_general',
   'قالب عام', 'Custom — general',
   'قالب مرن للقياسات العامة.',
   'Flexible template for generic measurements.',
   'custom', 'cm',
   '[
      {"key":"label","label_ar":"الوصف","label_en":"Label","type":"text","required":true},
      {"key":"width","label_ar":"العرض","label_en":"Width","type":"number","unit":"cm","maps_to":"width"},
      {"key":"height","label_ar":"الارتفاع","label_en":"Height","type":"number","unit":"cm","maps_to":"height"},
      {"key":"depth","label_ar":"العمق","label_en":"Depth","type":"number","unit":"cm","maps_to":"depth"},
      {"key":"length","label_ar":"الطول","label_en":"Length","type":"number","unit":"cm","maps_to":"length"},
      {"key":"quantity","label_ar":"الكمية","label_en":"Quantity","type":"number","maps_to":"quantity"}
    ]'::jsonb,
   90)
ON CONFLICT (template_key) DO NOTHING;
