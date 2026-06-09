CREATE OR REPLACE FUNCTION public.set_business_taxonomy_categories_v2(
  p_business_id uuid,
  p_entity_type_category_id uuid,
  p_primary_activity_category_ids uuid[],
  p_secondary_activity_category_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := public.has_admin_access(v_uid);
  v_is_owner boolean := public.is_business_owner(v_uid, p_business_id);
  v_entity_type_id uuid;
  v_primary_id uuid;
  v_secondary_id uuid;
  v_cat_type text;
  v_pri_id uuid;
  v_sec_id uuid;
  v_has_children boolean;
  v_first boolean := true;
  v_allowed_primary_ids uuid[] := COALESCE(p_primary_activity_category_ids, ARRAY[]::uuid[]);
  v_primaries_with_children uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT (v_is_admin OR v_is_owner) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

  SELECT id INTO v_entity_type_id FROM public.taxonomy_types WHERE code = 'entity_type';
  SELECT id INTO v_primary_id     FROM public.taxonomy_types WHERE code = 'primary_activity';
  SELECT id INTO v_secondary_id   FROM public.taxonomy_types WHERE code = 'secondary_activity';

  -- Entity type is an explicit form choice, so keep registration visibility strict.
  IF p_entity_type_category_id IS NOT NULL THEN
    PERFORM 1 FROM public.taxonomy_categories
      WHERE id = p_entity_type_category_id
        AND taxonomy_type_id = v_entity_type_id
        AND is_active AND is_public AND NOT is_archived
        AND show_in_registration;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ENTITY_TYPE'; END IF;
  END IF;

  -- Primary activities may include an existing saved activity that is hidden
  -- from the registration list but still active/public. Allow it so admin edit
  -- screens can re-save without leaking UUIDs or blocking unchanged records.
  IF array_length(v_allowed_primary_ids, 1) IS NOT NULL THEN
    FOREACH v_pri_id IN ARRAY v_allowed_primary_ids LOOP
      SELECT tt.code INTO v_cat_type
        FROM public.taxonomy_categories tc
        JOIN public.taxonomy_types tt ON tt.id = tc.taxonomy_type_id
        WHERE tc.id = v_pri_id
          AND tc.is_active AND tc.is_public AND NOT tc.is_archived;
      IF NOT FOUND OR v_cat_type NOT IN ('primary_activity','sector') THEN
        RAISE EXCEPTION 'INVALID_PRIMARY_ACTIVITY';
      END IF;
      SELECT EXISTS(
        SELECT 1 FROM public.taxonomy_categories
         WHERE parent_id = v_pri_id
           AND is_active AND NOT is_archived
      ) INTO v_has_children;
      IF v_has_children THEN
        v_primaries_with_children := array_append(v_primaries_with_children, v_pri_id);
      END IF;
    END LOOP;
  END IF;

  -- Secondary activities can also be existing saved children. Require valid,
  -- active/public taxonomy rows, and preserve parent-child validation.
  IF p_secondary_activity_category_ids IS NOT NULL THEN
    FOREACH v_sec_id IN ARRAY p_secondary_activity_category_ids LOOP
      SELECT tt.code INTO v_cat_type
        FROM public.taxonomy_categories tc
        JOIN public.taxonomy_types tt ON tt.id = tc.taxonomy_type_id
        WHERE tc.id = v_sec_id
          AND tc.is_active AND tc.is_public AND NOT tc.is_archived;
      IF NOT FOUND OR v_cat_type NOT IN ('secondary_activity','primary_activity','sector','service') THEN
        RAISE EXCEPTION 'INVALID_SECONDARY_ACTIVITY';
      END IF;
      IF array_length(v_primaries_with_children, 1) IS NOT NULL THEN
        PERFORM 1 FROM public.taxonomy_categories
          WHERE id = v_sec_id AND parent_id = ANY(v_allowed_primary_ids);
        IF NOT FOUND THEN RAISE EXCEPTION 'SECONDARY_NOT_CHILD_OF_PRIMARY'; END IF;
      END IF;
    END LOOP;
  END IF;

  DELETE FROM public.business_taxonomy_categories
   WHERE business_id = p_business_id
     AND role IN ('entity_type','primary_activity','secondary_activity');

  IF p_entity_type_category_id IS NOT NULL THEN
    INSERT INTO public.business_taxonomy_categories(business_id, category_id, role, is_primary)
      VALUES (p_business_id, p_entity_type_category_id, 'entity_type', true);
  END IF;

  IF array_length(v_allowed_primary_ids, 1) IS NOT NULL THEN
    FOREACH v_pri_id IN ARRAY v_allowed_primary_ids LOOP
      INSERT INTO public.business_taxonomy_categories(business_id, category_id, role, is_primary)
        VALUES (p_business_id, v_pri_id, 'primary_activity', v_first)
        ON CONFLICT (business_id, category_id, role) DO NOTHING;
      v_first := false;
    END LOOP;
  END IF;

  IF p_secondary_activity_category_ids IS NOT NULL THEN
    FOREACH v_sec_id IN ARRAY p_secondary_activity_category_ids LOOP
      INSERT INTO public.business_taxonomy_categories(business_id, category_id, role, is_primary)
        VALUES (p_business_id, v_sec_id, 'secondary_activity', false)
        ON CONFLICT (business_id, category_id, role) DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'primary_count', COALESCE(array_length(v_allowed_primary_ids, 1), 0),
    'secondary_count', COALESCE(array_length(p_secondary_activity_category_ids, 1), 0)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_business_taxonomy_categories_v2(uuid, uuid, uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_business_taxonomy_categories_v2(uuid, uuid, uuid[], uuid[]) TO service_role;