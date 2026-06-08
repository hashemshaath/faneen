-- Cover image for asset categories (rental_categories already has default_image_url)
ALTER TABLE public.asset_categories
  ADD COLUMN IF NOT EXISTS default_image_url text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text;
