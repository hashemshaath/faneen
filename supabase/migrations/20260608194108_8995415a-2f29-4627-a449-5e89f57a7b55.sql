
-- Extend rental_items with brand, country of manufacture, condition, cover image, and electrical/specs metadata
ALTER TABLE public.rental_items
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS country_of_manufacture text,
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Constrain condition values when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_items_condition_chk'
  ) THEN
    ALTER TABLE public.rental_items
      ADD CONSTRAINT rental_items_condition_chk
      CHECK (condition IS NULL OR condition IN ('new','like_new','good','medium','used'));
  END IF;
END$$;
