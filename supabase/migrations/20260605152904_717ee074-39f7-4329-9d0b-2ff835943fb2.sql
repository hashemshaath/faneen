UPDATE public.business_branches AS bb
SET slug = lower(b.username) || '-' || lower(replace(coalesce(bb.ref_id, bb.id::text), '-', ''))
FROM public.businesses AS b
WHERE bb.business_id = b.id
  AND b.username IS NOT NULL
  AND b.username <> ''
  AND (
    bb.slug IS NULL
    OR bb.slug ~ '^loc[0-9]+$'
    OR bb.slug ~ '^[0-9a-f-]{36}$'
  );