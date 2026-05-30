
-- 1) Backfill localized names from legacy full_name
UPDATE public.profiles
SET full_name_ar = btrim(full_name)
WHERE (full_name_ar IS NULL OR btrim(full_name_ar) = '')
  AND full_name IS NOT NULL
  AND btrim(full_name) <> ''
  AND full_name ~ '[\u0600-\u06FF]';

UPDATE public.profiles
SET full_name_en = btrim(full_name)
WHERE (full_name_en IS NULL OR btrim(full_name_en) = '')
  AND full_name IS NOT NULL
  AND btrim(full_name) <> ''
  AND full_name !~ '[\u0600-\u06FF]'
  AND full_name ~ '[A-Za-z]';

-- 2) Improved sync trigger: keep full_name in sync when localized names change
CREATE OR REPLACE FUNCTION public.sync_profile_full_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  preferred text;
BEGIN
  preferred := COALESCE(
    NULLIF(btrim(NEW.full_name_ar), ''),
    NULLIF(btrim(NEW.full_name_en), '')
  );

  IF preferred IS NOT NULL THEN
    NEW.full_name := preferred;
  ELSIF NEW.full_name IS NULL OR btrim(NEW.full_name) = '' THEN
    NEW.full_name := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Force trigger to re-run on existing rows to normalize full_name from localized
UPDATE public.profiles SET updated_at = updated_at;
