-- BUSINESS-WORKFLOW-5E: Client signature capture + contract draft conversion.
-- Adds signature fields to work_order_quotations, extends approve-by-token RPC
-- to require typed signature + checkbox, and adds a SECURITY DEFINER RPC to
-- create a contract draft from an approved quotation. Idempotent.
--
-- Constraints:
--   - tokens remain SHA-256 hashed (no raw token stored or logged).
--   - no payments, invoices, notifications, signed URLs, realtime, or e-sign
--     provider integrations.
--   - approved/rejected quotations remain locked.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Signature fields + contract link on quotations
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.work_order_quotations
  ADD COLUMN IF NOT EXISTS approved_by_name text NULL,
  ADD COLUMN IF NOT EXISTS approved_by_title text NULL,
  ADD COLUMN IF NOT EXISTS signature_text text NULL,
  ADD COLUMN IF NOT EXISTS approval_ip_hash text NULL,
  ADD COLUMN IF NOT EXISTS approval_user_agent_hash text NULL,
  ADD COLUMN IF NOT EXISTS contract_id uuid NULL
    REFERENCES public.contracts(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'work_order_quotations_signature_lengths_chk'
  ) THEN
    ALTER TABLE public.work_order_quotations
      ADD CONSTRAINT work_order_quotations_signature_lengths_chk
      CHECK (
        (approved_by_name IS NULL OR char_length(approved_by_name) BETWEEN 1 AND 200)
        AND (approved_by_title IS NULL OR char_length(approved_by_title) BETWEEN 1 AND 200)
        AND (signature_text IS NULL OR char_length(signature_text) BETWEEN 1 AND 200)
        AND (approval_ip_hash IS NULL OR char_length(approval_ip_hash) BETWEEN 16 AND 128)
        AND (approval_user_agent_hash IS NULL OR char_length(approval_user_agent_hash) BETWEEN 16 AND 128)
      );
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_wo_quotations_contract
  ON public.work_order_quotations (contract_id)
  WHERE contract_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Tighten snapshot trigger so signature fields are immutable once set.
--    Also keep contract_id append-only (NULL -> contract uuid, then frozen).
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_work_order_quotations_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ref_id IS NULL THEN
      NEW.ref_id := 'WOQ-' || nextval('public.work_order_quotations_ref_seq')::text;
    END IF;
    IF NEW.quotation_number IS NULL OR length(trim(NEW.quotation_number)) = 0 THEN
      NEW.quotation_number := coalesce(NEW.ref_id, 'WOQ-DRAFT');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('approved','rejected','expired')
       AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'quotation_locked';
    END IF;
    IF OLD.status <> 'draft' THEN
      IF NEW.title IS DISTINCT FROM OLD.title
        OR NEW.notes IS DISTINCT FROM OLD.notes
        OR NEW.quotation_number IS DISTINCT FROM OLD.quotation_number
        OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
        OR NEW.tax IS DISTINCT FROM OLD.tax
        OR NEW.total IS DISTINCT FROM OLD.total
        OR NEW.currency IS DISTINCT FROM OLD.currency
        OR NEW.boq_id IS DISTINCT FROM OLD.boq_id
        OR NEW.work_order_id IS DISTINCT FROM OLD.work_order_id
        OR NEW.business_id IS DISTINCT FROM OLD.business_id THEN
        RAISE EXCEPTION 'quotation_snapshot_locked';
      END IF;
    END IF;

    -- Signature fields: once set, immutable.
    IF OLD.approved_by_name IS NOT NULL AND NEW.approved_by_name IS DISTINCT FROM OLD.approved_by_name THEN
      RAISE EXCEPTION 'quotation_signature_locked';
    END IF;
    IF OLD.approved_by_title IS NOT NULL AND NEW.approved_by_title IS DISTINCT FROM OLD.approved_by_title THEN
      RAISE EXCEPTION 'quotation_signature_locked';
    END IF;
    IF OLD.signature_text IS NOT NULL AND NEW.signature_text IS DISTINCT FROM OLD.signature_text THEN
      RAISE EXCEPTION 'quotation_signature_locked';
    END IF;
    IF OLD.approval_ip_hash IS NOT NULL AND NEW.approval_ip_hash IS DISTINCT FROM OLD.approval_ip_hash THEN
      RAISE EXCEPTION 'quotation_signature_locked';
    END IF;
    IF OLD.approval_user_agent_hash IS NOT NULL AND NEW.approval_user_agent_hash IS DISTINCT FROM OLD.approval_user_agent_hash THEN
      RAISE EXCEPTION 'quotation_signature_locked';
    END IF;
    -- Contract link is append-only.
    IF OLD.contract_id IS NOT NULL AND NEW.contract_id IS DISTINCT FROM OLD.contract_id THEN
      RAISE EXCEPTION 'quotation_contract_link_locked';
    END IF;

    IF NEW.status = 'sent' AND OLD.status = 'draft' AND NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    END IF;
    IF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
    END IF;
    IF NEW.status = 'rejected' AND NEW.rejected_at IS NULL THEN
      NEW.rejected_at := now();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Replace public approve RPC with signature-required variant.
--    Keeps the same name to centralize the public approval endpoint.
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.approve_quotation_by_token(text, text);

CREATE OR REPLACE FUNCTION public.approve_quotation_by_token(
  _ref_id text,
  _token text,
  _approved_by_name text,
  _signature_text text,
  _approved_by_title text DEFAULT NULL,
  _ip_hash text DEFAULT NULL,
  _user_agent_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_q public.work_order_quotations%ROWTYPE;
  v_name text;
  v_title text;
  v_sig text;
  v_ip text;
  v_ua text;
BEGIN
  IF _ref_id IS NULL OR _token IS NULL OR length(_token) < 32 THEN
    RAISE EXCEPTION 'invalid_token' USING ERRCODE = '22023';
  END IF;
  v_name := nullif(trim(coalesce(_approved_by_name, '')), '');
  v_sig  := nullif(trim(coalesce(_signature_text, '')), '');
  IF v_name IS NULL OR v_sig IS NULL THEN
    RAISE EXCEPTION 'signature_required' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_name) > 200 OR char_length(v_sig) > 200 THEN
    RAISE EXCEPTION 'signature_too_long' USING ERRCODE = '22023';
  END IF;
  v_title := nullif(trim(coalesce(_approved_by_title, '')), '');
  IF v_title IS NOT NULL AND char_length(v_title) > 200 THEN
    v_title := substring(v_title, 1, 200);
  END IF;
  v_ip := nullif(trim(coalesce(_ip_hash, '')), '');
  v_ua := nullif(trim(coalesce(_user_agent_hash, '')), '');
  IF v_ip IS NOT NULL AND (char_length(v_ip) < 16 OR char_length(v_ip) > 128) THEN
    v_ip := NULL;
  END IF;
  IF v_ua IS NOT NULL AND (char_length(v_ua) < 16 OR char_length(v_ua) > 128) THEN
    v_ua := NULL;
  END IF;

  v_hash := encode(extensions.digest(_token, 'sha256'), 'hex');

  SELECT * INTO v_q
    FROM public.work_order_quotations
   WHERE ref_id = _ref_id
     AND approval_token_hash = v_hash
     AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_q.status NOT IN ('sent','viewed') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;
  IF v_q.valid_until IS NOT NULL AND v_q.valid_until < now() THEN
    UPDATE public.work_order_quotations SET status='expired' WHERE id = v_q.id;
    RAISE EXCEPTION 'expired' USING ERRCODE = '22023';
  END IF;

  UPDATE public.work_order_quotations
     SET status = 'approved',
         approved_at = now(),
         approved_by_name = v_name,
         approved_by_title = v_title,
         signature_text = v_sig,
         approval_ip_hash = v_ip,
         approval_user_agent_hash = v_ua
   WHERE id = v_q.id;

  -- Audit event: no raw token, no PII beyond first-name presence flags.
  INSERT INTO public.business_audit_log (business_id, actor_id, entity_type, entity_id, action, metadata)
  VALUES (v_q.business_id, NULL, 'work_order', v_q.work_order_id,
          'work_order.quotation_approved_with_signature',
          jsonb_build_object(
            'quotation_id', v_q.id,
            'ref_id', v_q.ref_id,
            'has_title', v_title IS NOT NULL,
            'has_ip_hash', v_ip IS NOT NULL,
            'has_ua_hash', v_ua IS NOT NULL
          ));

  RETURN jsonb_build_object('status','approved','ref_id', v_q.ref_id);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_quotation_by_token(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_quotation_by_token(text, text, text, text, text, text, text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Contract draft conversion RPC (manager/admin only).
--    Idempotent: returns the linked contract if one already exists.
--    Does NOT create payments, invoices, signatures, or send notifications.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_contract_draft_from_quotation(
  _quotation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_q public.work_order_quotations%ROWTYPE;
  v_contract_id uuid;
  v_terms text;
  v_items_summary text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF _quotation_id IS NULL THEN
    RAISE EXCEPTION 'missing_quotation' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_q
    FROM public.work_order_quotations
   WHERE id = _quotation_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_business_owner_or_manager(v_uid, v_q.business_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_q.status <> 'approved' THEN
    RAISE EXCEPTION 'quotation_not_approved' USING ERRCODE = '22023';
  END IF;

  -- Idempotent: existing contract draft? return it.
  IF v_q.contract_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'contract_id', v_q.contract_id,
      'quotation_id', v_q.id,
      'already_existed', true
    );
  END IF;

  -- Build a BOQ-derived scope summary from frozen quotation items.
  SELECT string_agg(
    format('• %s — %s %s × %s', i.title_ar, i.quantity::text, i.unit, i.unit_price::text),
    E'\n' ORDER BY i.sort_order, i.created_at
  ) INTO v_items_summary
    FROM public.work_order_quotation_items i
   WHERE i.quotation_id = v_q.id AND i.deleted_at IS NULL;

  v_terms := format(
    E'مرجع عرض السعر: %s\nالعنوان: %s\nالإجمالي: %s %s\n\nنطاق الأعمال (مستخرج من جدول الكميات):\n%s',
    coalesce(v_q.ref_id, v_q.quotation_number),
    v_q.title,
    v_q.total::text,
    v_q.currency,
    coalesce(v_items_summary, '—')
  );

  INSERT INTO public.contracts (
    provider_id, business_id, title_ar, title_en,
    total_amount, currency_code, status,
    vat_inclusive, vat_rate, terms_ar, is_demo
  ) VALUES (
    v_uid, v_q.business_id, v_q.title, v_q.title,
    v_q.total, v_q.currency, 'draft',
    false, 15, v_terms, false
  )
  RETURNING id INTO v_contract_id;

  -- Append-only link back to the quotation (frozen by trigger).
  UPDATE public.work_order_quotations
     SET contract_id = v_contract_id
   WHERE id = v_q.id;

  -- Audit event: no raw token, no PII-heavy metadata.
  INSERT INTO public.business_audit_log (business_id, actor_id, entity_type, entity_id, action, metadata)
  VALUES (v_q.business_id, v_uid, 'work_order', v_q.work_order_id,
          'work_order.quotation_converted_to_contract_draft',
          jsonb_build_object(
            'quotation_id', v_q.id,
            'quotation_ref_id', v_q.ref_id,
            'contract_id', v_contract_id
          ));

  RETURN jsonb_build_object(
    'contract_id', v_contract_id,
    'quotation_id', v_q.id,
    'already_existed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_contract_draft_from_quotation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_contract_draft_from_quotation(uuid) TO authenticated;
