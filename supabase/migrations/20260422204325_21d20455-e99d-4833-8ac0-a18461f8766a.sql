INSERT INTO public.categories (id, name_ar, name_en, slug, description_ar, description_en, icon, sort_order, is_active)
VALUES
  ('b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e', 'الطاقة والاستدامة', 'Energy & Sustainability', 'energy-sustainability', 'حلول الطاقة الذكية والاستدامة والكفاءة البيئية', 'Smart energy solutions, sustainability, and environmental efficiency', 'Zap', 7, true),
  ('c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f', 'الديكورات الجبسية', 'Gypsum Decorations', 'gypsum-decorations', 'تصميم وتنفيذ الديكورات الجبسية والأسقف المعلقة', 'Gypsum decoration design, installation, and suspended ceilings', 'Paintbrush', 8, true),
  ('d3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f80', 'الواجهات وتلبيس الواجهات', 'Facades & Cladding', 'facades-cladding', 'تصميم وتنفيذ الواجهات الخارجية وتلبيس المباني', 'Exterior facade design, cladding, and building envelope solutions', 'Building', 9, true)
ON CONFLICT (slug) DO NOTHING;