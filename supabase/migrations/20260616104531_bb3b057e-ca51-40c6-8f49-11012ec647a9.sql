
-- Phase A: Taxonomy dedup + registration visibility cleanup
-- Strategy:
-- 1) For each (sector, primary_activity) duplicate by name_ar, move aliases
--    from the old `sector` row to the `primary_activity` counterpart, then
--    archive the sector row. (Sector duplicates have 0 biz_refs.)
-- 2) For "مطابخ ألمنيوم" merge the sector row into the secondary_activity row.
-- 3) For "سقالات" / "مولدات" — equipment_type vs secondary_activity — keep
--    equipment_type but hide from registration (it's an equipment listing,
--    not a provider classification).
-- 4) Hide every remaining active `sector` row from registration (superseded
--    by `primary_activity`) and migrate their aliases.
-- 5) Enforce show_in_registration=true for all active entity_type /
--    primary_activity / secondary_activity rows so the new wizard sees them.

-- 1. Move aliases from sector → primary_activity counterpart (by name_ar)
WITH pairs AS (
  SELECT s.id AS old_id, p.id AS new_id
  FROM taxonomy_categories s
  JOIN taxonomy_types ts ON ts.id=s.taxonomy_type_id AND ts.code='sector'
  JOIN taxonomy_categories p ON lower(trim(p.name_ar))=lower(trim(s.name_ar))
  JOIN taxonomy_types tp ON tp.id=p.taxonomy_type_id AND tp.code='primary_activity'
  WHERE s.is_active AND NOT s.is_archived
)
INSERT INTO taxonomy_aliases (category_id, alias_ar, alias_en, normalized_alias, source)
SELECT pairs.new_id, a.alias_ar, a.alias_en, a.normalized_alias, 'merge_sector'
FROM pairs
JOIN taxonomy_aliases a ON a.category_id = pairs.old_id
WHERE NOT EXISTS (
  SELECT 1 FROM taxonomy_aliases x
  WHERE x.category_id = pairs.new_id
    AND lower(trim(x.alias_ar)) = lower(trim(a.alias_ar))
);

-- 2. Move "مطابخ ألمنيوم" sector → secondary_activity alum-kitchens
INSERT INTO taxonomy_aliases (category_id, alias_ar, alias_en, normalized_alias, source)
SELECT '45eb3540-ad03-4cc7-b1b8-492c9bd659b5', a.alias_ar, a.alias_en, a.normalized_alias, 'merge_sector'
FROM taxonomy_aliases a
WHERE a.category_id = '6a62c672-5ead-4a59-8caa-0cb689829539'
  AND NOT EXISTS (
    SELECT 1 FROM taxonomy_aliases x
    WHERE x.category_id = '45eb3540-ad03-4cc7-b1b8-492c9bd659b5'
      AND lower(trim(x.alias_ar)) = lower(trim(a.alias_ar))
  );

-- 3. Archive all `sector` rows (superseded by primary_activity)
UPDATE taxonomy_categories
SET is_archived = true,
    is_active = false,
    show_in_registration = false,
    show_in_search = false,
    updated_at = now()
WHERE taxonomy_type_id = (SELECT id FROM taxonomy_types WHERE code='sector')
  AND is_active;

-- 4. Hide equipment_type rows from registration (they're for asset listings,
--    not provider classification). They stay active for the equipment module.
UPDATE taxonomy_categories
SET show_in_registration = false, updated_at = now()
WHERE taxonomy_type_id = (SELECT id FROM taxonomy_types WHERE code='equipment_type');

-- 5. Enable show_in_registration for all active entity/primary/secondary rows
UPDATE taxonomy_categories
SET show_in_registration = true, updated_at = now()
WHERE is_active = true
  AND is_archived = false
  AND is_public = true
  AND show_in_registration = false
  AND taxonomy_type_id IN (
    SELECT id FROM taxonomy_types
    WHERE code IN ('entity_type','primary_activity','secondary_activity')
  );
