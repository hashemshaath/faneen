-- Build a clean slug from the branch name, falling back to ref_id.
-- Allowed chars: letters (incl. Arabic via [^[:alnum:]] complement is unsafe, so use \W with unicode), digits, hyphen.
-- We use a permissive regex that replaces runs of whitespace + common separators with '-' and collapses dashes.
UPDATE public.business_branches AS bb
SET slug = COALESCE(
  NULLIF(
    trim(
      both '-' from
      regexp_replace(
        regexp_replace(
          coalesce(
            NULLIF(trim(bb.name_en), ''),
            NULLIF(trim(bb.name_ar), '')
          ),
          '[[:space:]/\\,،.()\[\]{}|<>:;"''!?@#$%^&*+=]+', '-', 'g'
        ),
        '-+', '-', 'g'
      )
    ),
    ''
  ),
  lower(replace(coalesce(bb.ref_id, bb.id::text), '-', ''))
)
WHERE bb.slug IS NULL
   OR bb.slug ~ '^loc[0-9]+$'
   OR bb.slug ~ '^[a-z0-9]+-loc[0-9]+$'   -- previous '{username}-loc1000002' form
   OR bb.slug ~ '^[0-9a-f-]{36}$';

-- Resolve collisions per business by appending a numeric suffix if needed.
WITH dupes AS (
  SELECT id, business_id, slug,
         row_number() OVER (PARTITION BY business_id, slug ORDER BY created_at) AS rn
  FROM public.business_branches
  WHERE slug IS NOT NULL
)
UPDATE public.business_branches bb
SET slug = d.slug || '-' || d.rn
FROM dupes d
WHERE d.id = bb.id AND d.rn > 1;