-- BARCODE-REGISTRY-NEW-CODE-1
-- Successor barcode issuance for transferred barcodes.

-- 1. Relax the per-entity uniqueness index so that 'transferred' rows do not
--    block a new active barcode for the same entity. The public resolver
--    already hides non-active rows, so transferred rows are inert; allowing a
--    successor active row is the explicit point of this phase.
DROP INDEX IF EXISTS public.barcode_registry_active_entity_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS barcode_registry_active_entity_uidx
  ON public.barcode_registry (entity_type, entity_id)
  WHERE status NOT IN ('archived', 'transferred');

-- 2. Admin-only successor issuance RPC.
CREATE OR REPLACE FUNCTION public.admin_issue_successor_barcode(
  _transferred_barcode_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old public.barcode_registry;
  v_conflict_id uuid;
  v_new_code text;
  v_new_id uuid;
  v_visibility text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Lock old row
  SELECT * INTO v_old
    FROM public.barcode_registry
   WHERE id = _transferred_barcode_id
   FOR UPDATE;
  IF v_old.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_old.status <> 'transferred' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition',
      'from', v_old.status, 'to', 'successor');
  END IF;

  IF v_old.transfer_to_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_target_user');
  END IF;

  IF v_old.entity_type IS NULL OR v_old.entity_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_entity');
  END IF;

  -- Conflict check: any non-archived / non-transferred barcode for this entity
  SELECT id INTO v_conflict_id
    FROM public.barcode_registry
   WHERE entity_type = v_old.entity_type
     AND entity_id = v_old.entity_id
     AND status NOT IN ('archived', 'transferred')
   LIMIT 1;
  IF v_conflict_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'entity_already_has_active_barcode',
      'conflict_barcode_id', v_conflict_id
    );
  END IF;

  -- Carry over a safe visibility (default private for non-public_limited rows)
  v_visibility := CASE WHEN v_old.visibility = 'public_limited' THEN 'public_limited' ELSE 'private' END;

  v_new_code := public.generate_barcode_code(v_old.entity_type);

  INSERT INTO public.barcode_registry (
    barcode_code, entity_type, entity_id,
    owner_user_id, owner_business_id,
    status, visibility, source, metadata, created_by
  ) VALUES (
    v_new_code, v_old.entity_type, v_old.entity_id,
    v_old.transfer_to_user_id, v_old.owner_business_id,
    'active', v_visibility, 'admin_successor',
    jsonb_build_object(
      'successor_of', v_old.id,
      'previous_code', v_old.barcode_code,
      'reason', NULLIF(btrim(COALESCE(_reason, '')), '')
    ),
    v_uid
  )
  RETURNING id INTO v_new_id;

  -- Audit on the new barcode (allowed event_type)
  INSERT INTO public.barcode_events (
    barcode_id, event_type, actor_user_id, actor_role, metadata
  ) VALUES (
    v_new_id, 'created', v_uid, 'admin',
    jsonb_build_object(
      'source', 'admin_issue_successor_barcode',
      'successor_of', v_old.id,
      'previous_code', v_old.barcode_code,
      'reason', NULLIF(btrim(COALESCE(_reason, '')), '')
    )
  );

  -- Audit on the old barcode (admin_repair is an allowed event_type)
  INSERT INTO public.barcode_events (
    barcode_id, event_type, actor_user_id, actor_role, metadata
  ) VALUES (
    v_old.id, 'admin_repair', v_uid, 'admin',
    jsonb_build_object(
      'source', 'admin_issue_successor_barcode',
      'action', 'successor_issued',
      'new_barcode_id', v_new_id,
      'new_code', v_new_code,
      'reason', NULLIF(btrim(COALESCE(_reason, '')), '')
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'old_barcode_id', v_old.id,
    'new_barcode_id', v_new_id,
    'new_code', v_new_code,
    'public_url', '/q/' || v_new_code
  );
END
$$;

REVOKE ALL ON FUNCTION public.admin_issue_successor_barcode(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_issue_successor_barcode(uuid, text) TO authenticated;