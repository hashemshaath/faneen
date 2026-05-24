-- ─────────────────────────────────────────────────────────────────────────────
-- BARCODE-REGISTRY-LIFECYCLE-1
-- Admin-only RPCs to freeze / archive / restore a barcode_registry record.
-- All transitions are validated, audit-logged, and admin-gated.
-- No schema changes: the registry already has status + timestamp columns and
-- barcode_events already accepts 'frozen' / 'unfrozen' / 'archived' /
-- 'reactivated' event types.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: insert an audit event (admin actor) ────────────────────────────────
CREATE OR REPLACE FUNCTION public._admin_log_barcode_event(
  _barcode_id uuid,
  _event_type text,
  _previous_status text,
  _new_status text,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.barcode_events (
    barcode_id, event_type, actor_user_id, actor_role, metadata
  ) VALUES (
    _barcode_id,
    _event_type,
    auth.uid(),
    'admin',
    jsonb_build_object(
      'source', 'admin_barcode_registry',
      'previous_status', _previous_status,
      'new_status', _new_status,
      'reason', NULLIF(btrim(COALESCE(_reason, '')), '')
    )
  );
END
$$;

REVOKE ALL ON FUNCTION public._admin_log_barcode_event(uuid, text, text, text, text) FROM PUBLIC;

-- admin_freeze_barcode ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_freeze_barcode(
  _barcode_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_br public.barcode_registry;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_br FROM public.barcode_registry WHERE id = _barcode_id FOR UPDATE;
  IF v_br.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_br.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition',
      'from', v_br.status, 'to', 'frozen');
  END IF;

  UPDATE public.barcode_registry
     SET status = 'frozen', frozen_at = now()
   WHERE id = _barcode_id;

  PERFORM public._admin_log_barcode_event(_barcode_id, 'frozen', v_br.status, 'frozen', _reason);

  RETURN jsonb_build_object('ok', true, 'barcode_id', _barcode_id,
    'previous_status', v_br.status, 'new_status', 'frozen');
END
$$;

REVOKE ALL ON FUNCTION public.admin_freeze_barcode(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_freeze_barcode(uuid, text) TO authenticated;

-- admin_archive_barcode ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_archive_barcode(
  _barcode_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_br public.barcode_registry;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_br FROM public.barcode_registry WHERE id = _barcode_id FOR UPDATE;
  IF v_br.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_br.status NOT IN ('active', 'frozen', 'revoked') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition',
      'from', v_br.status, 'to', 'archived');
  END IF;

  UPDATE public.barcode_registry
     SET status = 'archived', archived_at = now()
   WHERE id = _barcode_id;

  PERFORM public._admin_log_barcode_event(_barcode_id, 'archived', v_br.status, 'archived', _reason);

  RETURN jsonb_build_object('ok', true, 'barcode_id', _barcode_id,
    'previous_status', v_br.status, 'new_status', 'archived');
END
$$;

REVOKE ALL ON FUNCTION public.admin_archive_barcode(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_archive_barcode(uuid, text) TO authenticated;

-- admin_restore_barcode ──────────────────────────────────────────────────────
-- Restores a frozen OR archived barcode back to active.
-- Blocks the transition if another non-archived barcode already exists for
-- the same (entity_type, entity_id) to respect the partial unique index
-- `barcode_registry_active_entity_uidx`.
CREATE OR REPLACE FUNCTION public.admin_restore_barcode(
  _barcode_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_br public.barcode_registry;
  v_conflict_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_br FROM public.barcode_registry WHERE id = _barcode_id FOR UPDATE;
  IF v_br.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_br.status NOT IN ('frozen', 'archived') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition',
      'from', v_br.status, 'to', 'active');
  END IF;

  -- For archived → active, ensure no other live barcode owns this entity slot.
  IF v_br.status = 'archived' THEN
    SELECT id INTO v_conflict_id
      FROM public.barcode_registry
     WHERE entity_type = v_br.entity_type
       AND entity_id = v_br.entity_id
       AND id <> v_br.id
       AND status <> 'archived'
     LIMIT 1;
    IF v_conflict_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'entity_already_has_active_barcode',
        'conflict_barcode_id', v_conflict_id);
    END IF;
  END IF;

  UPDATE public.barcode_registry
     SET status = 'active',
         frozen_at   = CASE WHEN v_br.status = 'frozen'   THEN NULL ELSE frozen_at   END,
         archived_at = CASE WHEN v_br.status = 'archived' THEN NULL ELSE archived_at END
   WHERE id = _barcode_id;

  PERFORM public._admin_log_barcode_event(
    _barcode_id,
    CASE WHEN v_br.status = 'frozen' THEN 'unfrozen' ELSE 'reactivated' END,
    v_br.status, 'active', _reason
  );

  RETURN jsonb_build_object('ok', true, 'barcode_id', _barcode_id,
    'previous_status', v_br.status, 'new_status', 'active');
END
$$;

REVOKE ALL ON FUNCTION public.admin_restore_barcode(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restore_barcode(uuid, text) TO authenticated;
