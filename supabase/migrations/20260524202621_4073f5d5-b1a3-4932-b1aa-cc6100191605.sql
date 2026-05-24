-- ─────────────────────────────────────────────────────────────────────────────
-- BARCODE-REGISTRY-TRANSFER-1
-- Admin-only RPC to transfer barcode ownership (safe Model A).
--
-- Model A semantics:
--   * Old barcode row: status='transferred', transferred_at=now(),
--     transfer_from_user_id=current owner, transfer_to_user_id=target.
--   * entity_type / entity_id are NEVER mutated (so old scanned QR codes
--     do not silently start pointing to a different entity).
--   * Public /q/:code resolver already collapses non-'active' rows to
--     "unavailable", so old code stops resolving without leaking state.
--   * No new barcode is auto-created — that must go through the normal
--     barcode creation flow for the new owner/entity.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_transfer_barcode(
  _barcode_id uuid,
  _transfer_to_user_id uuid,
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
  v_target_exists boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _transfer_to_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_target_user');
  END IF;

  -- Lock the source barcode row
  SELECT * INTO v_br FROM public.barcode_registry WHERE id = _barcode_id FOR UPDATE;
  IF v_br.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- Only active or frozen barcodes can be transferred; archived / revoked /
  -- already-transferred rows are rejected to keep the audit trail clean.
  IF v_br.status NOT IN ('active', 'frozen') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_transition',
      'from', v_br.status, 'to', 'transferred');
  END IF;

  -- Target user must exist as a profile (registered platform user).
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _transfer_to_user_id
  ) INTO v_target_exists;
  IF NOT v_target_exists THEN
    RETURN jsonb_build_object('ok', false, 'error', 'target_user_not_found');
  END IF;

  -- Block self-transfer (owner is already the target).
  IF v_br.owner_user_id IS NOT NULL AND v_br.owner_user_id = _transfer_to_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'same_owner');
  END IF;

  -- Apply transfer: status flips to 'transferred', timestamps + endpoints set.
  -- entity_type / entity_id are intentionally NOT mutated (Model A).
  UPDATE public.barcode_registry
     SET status                = 'transferred',
         transferred_at        = now(),
         transfer_from_user_id = v_br.owner_user_id,
         transfer_to_user_id   = _transfer_to_user_id
   WHERE id = _barcode_id;

  -- Audit event with rich metadata (no PII beyond ids the admin already sees).
  INSERT INTO public.barcode_events (
    barcode_id, event_type, actor_user_id, actor_role, metadata
  ) VALUES (
    _barcode_id,
    'transferred',
    v_uid,
    'admin',
    jsonb_build_object(
      'source', 'admin_barcode_registry',
      'previous_status', v_br.status,
      'new_status', 'transferred',
      'reason', NULLIF(btrim(COALESCE(_reason, '')), ''),
      'from_user_id', v_br.owner_user_id,
      'to_user_id', _transfer_to_user_id,
      'old_entity_type', v_br.entity_type,
      'old_entity_id', v_br.entity_id
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'barcode_id', _barcode_id,
    'previous_status', v_br.status,
    'new_status', 'transferred'
  );
END
$$;

REVOKE ALL ON FUNCTION public.admin_transfer_barcode(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_transfer_barcode(uuid, uuid, text) TO authenticated;