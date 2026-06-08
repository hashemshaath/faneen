-- Add sort_order to rental_items
ALTER TABLE public.rental_items ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_rental_items_sort ON public.rental_items(category_id, sort_order);

-- Add sort_order to assets  
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_assets_sort ON public.assets(category_id, sort_order);

-- Seed initial sort_order from created_at
UPDATE public.rental_items SET sort_order = sub.rn * 10
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) AS rn
  FROM public.rental_items
) sub
WHERE public.rental_items.id = sub.id AND public.rental_items.sort_order = 0;

UPDATE public.assets SET sort_order = sub.rn * 10
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) AS rn
  FROM public.assets
) sub
WHERE public.assets.id = sub.id AND public.assets.sort_order = 0;
