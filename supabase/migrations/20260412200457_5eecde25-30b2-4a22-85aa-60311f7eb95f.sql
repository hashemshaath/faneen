
-- Add views_count, saves_count, shares_count to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS saves_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS shares_count integer NOT NULL DEFAULT 0;

-- Redistribute projects across different businesses with varied data
UPDATE public.projects SET business_id = 'a0000000-0000-0000-0000-000000000001', views_count = 1250, saves_count = 89, shares_count = 34, is_featured = true WHERE id = '5c36f9ba-dd0c-4899-b293-82f1ba2f6903';

UPDATE public.projects SET business_id = 'a0000000-0000-0000-0000-000000000004', views_count = 3200, saves_count = 210, shares_count = 78, is_featured = true WHERE id = '12a357ba-3f00-43b5-8fce-cb3e5f71dd0a';

UPDATE public.projects SET business_id = 'a0000000-0000-0000-0000-000000000003', views_count = 890, saves_count = 45, shares_count = 12 WHERE id = '2bf10a78-529c-4ead-8167-6b3a51a08a9a';

UPDATE public.projects SET business_id = 'a0000000-0000-0000-0000-000000000007', views_count = 2100, saves_count = 156, shares_count = 55, is_featured = true WHERE id = '45ab59c6-717a-4e82-9cdc-ed0197ff8bb9';

UPDATE public.projects SET business_id = 'a0000000-0000-0000-0000-000000000002', views_count = 670, saves_count = 32, shares_count = 8 WHERE id = '2adcf6de-d6a8-424c-b726-219719da12c7';

UPDATE public.projects SET business_id = 'a0000000-0000-0000-0000-000000000008', views_count = 1800, saves_count = 120, shares_count = 41 WHERE id = 'd2a580bd-8af2-49cb-9a55-49cf8a63e61f';

UPDATE public.projects SET business_id = 'a0000000-0000-0000-0000-000000000005', views_count = 540, saves_count = 28, shares_count = 9 WHERE id = 'bb167621-ab57-413a-a8d1-85a178ecbce8';

UPDATE public.projects SET business_id = 'a0000000-0000-0000-0000-000000000009', views_count = 1450, saves_count = 95, shares_count = 30 WHERE id = '76c8763f-b648-49cc-b70b-d33c2ef4b44a';

UPDATE public.projects SET business_id = 'a0000000-0000-0000-0000-000000000006', views_count = 320, saves_count = 15, shares_count = 5 WHERE id = 'ba73ebb3-0e0b-49d6-a3f8-f0de2bb5e740';

UPDATE public.projects SET views_count = 980, saves_count = 67, shares_count = 22 WHERE id = '5b89e8ec-1d58-4b8b-b218-3d11cd668ff2';
