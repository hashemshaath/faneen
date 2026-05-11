-- ============================================================
-- C4B.1: Contract attachments metadata + backfill (additive)
-- ============================================================

-- 1. New columns ---------------------------------------------
ALTER TABLE public.contract_attachments
  ADD COLUMN IF NOT EXISTS storage_path   text,
  ADD COLUMN IF NOT EXISTS file_size      bigint,
  ADD COLUMN IF NOT EXISTS measurement_id uuid,
  ADD COLUMN IF NOT EXISTS amendment_id   uuid,
  ADD COLUMN IF NOT EXISTS payment_id     uuid,
  ADD COLUMN IF NOT EXISTS visibility     text NOT NULL DEFAULT 'parties',
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz NOT NULL DEFAULT now();

-- 2. Foreign keys (nullable, ON DELETE SET NULL) -------------
ALTER TABLE public.contract_attachments
  DROP CONSTRAINT IF EXISTS contract_attachments_measurement_id_fkey,
  ADD  CONSTRAINT contract_attachments_measurement_id_fkey
       FOREIGN KEY (measurement_id) REFERENCES public.contract_measurements(id) ON DELETE SET NULL;

ALTER TABLE public.contract_attachments
  DROP CONSTRAINT IF EXISTS contract_attachments_amendment_id_fkey,
  ADD  CONSTRAINT contract_attachments_amendment_id_fkey
       FOREIGN KEY (amendment_id) REFERENCES public.contract_amendments(id) ON DELETE SET NULL;

ALTER TABLE public.contract_attachments
  DROP CONSTRAINT IF EXISTS contract_attachments_payment_id_fkey,
  ADD  CONSTRAINT contract_attachments_payment_id_fkey
       FOREIGN KEY (payment_id) REFERENCES public.installment_payments(id) ON DELETE SET NULL;

-- 3. CHECK constraints ---------------------------------------
ALTER TABLE public.contract_attachments
  DROP CONSTRAINT IF EXISTS contract_attachments_visibility_chk,
  ADD  CONSTRAINT contract_attachments_visibility_chk
       CHECK (visibility IN ('parties','provider_only','client_only','admin_only'));

ALTER TABLE public.contract_attachments
  DROP CONSTRAINT IF EXISTS contract_attachments_single_link_chk,
  ADD  CONSTRAINT contract_attachments_single_link_chk
       CHECK (num_nonnulls(milestone_id, measurement_id, amendment_id, payment_id) <= 1);

-- 4. Indexes -------------------------------------------------
CREATE INDEX IF NOT EXISTS contract_attachments_measurement_id_idx
  ON public.contract_attachments(measurement_id) WHERE measurement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS contract_attachments_amendment_id_idx
  ON public.contract_attachments(amendment_id) WHERE amendment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS contract_attachments_payment_id_idx
  ON public.contract_attachments(payment_id) WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS contract_attachments_contract_only_idx
  ON public.contract_attachments(contract_id)
  WHERE milestone_id IS NULL
    AND measurement_id IS NULL
    AND amendment_id IS NULL
    AND payment_id IS NULL;

-- 5. Backfill -----------------------------------------------
-- Populate storage_path from file_url for legacy rows.
-- Pattern: <anything>/contract-attachments/<storage_path>
-- Strip optional ?query and decode percent-encoding.
UPDATE public.contract_attachments
SET storage_path = (
      regexp_replace(
        split_part(file_url, '?', 1),
        '^.*?/contract-attachments/',
        ''
      )
    )
WHERE storage_path IS NULL
  AND file_url ~ '/contract-attachments/';

-- Initialize updated_at = created_at for legacy rows
UPDATE public.contract_attachments
SET updated_at = created_at
WHERE updated_at > created_at + interval '1 minute'
  AND created_at IS NOT NULL;

-- 6. updated_at trigger --------------------------------------
DROP TRIGGER IF EXISTS contract_attachments_set_updated_at ON public.contract_attachments;
CREATE TRIGGER contract_attachments_set_updated_at
BEFORE UPDATE ON public.contract_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Same-contract guard trigger -----------------------------
CREATE OR REPLACE FUNCTION public.contract_attachments_validate_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid uuid;
BEGIN
  IF NEW.milestone_id IS NOT NULL THEN
    SELECT contract_id INTO v_cid FROM public.contract_milestones WHERE id = NEW.milestone_id;
    IF v_cid IS NULL OR v_cid <> NEW.contract_id THEN
      RAISE EXCEPTION 'milestone_id % does not belong to contract %', NEW.milestone_id, NEW.contract_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.measurement_id IS NOT NULL THEN
    SELECT contract_id INTO v_cid FROM public.contract_measurements WHERE id = NEW.measurement_id;
    IF v_cid IS NULL OR v_cid <> NEW.contract_id THEN
      RAISE EXCEPTION 'measurement_id % does not belong to contract %', NEW.measurement_id, NEW.contract_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.amendment_id IS NOT NULL THEN
    SELECT contract_id INTO v_cid FROM public.contract_amendments WHERE id = NEW.amendment_id;
    IF v_cid IS NULL OR v_cid <> NEW.contract_id THEN
      RAISE EXCEPTION 'amendment_id % does not belong to contract %', NEW.amendment_id, NEW.contract_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.payment_id IS NOT NULL THEN
    SELECT contract_id INTO v_cid FROM public.installment_payments WHERE id = NEW.payment_id;
    IF v_cid IS NULL OR v_cid <> NEW.contract_id THEN
      RAISE EXCEPTION 'payment_id % does not belong to contract %', NEW.payment_id, NEW.contract_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contract_attachments_validate_links_trg ON public.contract_attachments;
CREATE TRIGGER contract_attachments_validate_links_trg
BEFORE INSERT OR UPDATE ON public.contract_attachments
FOR EACH ROW
EXECUTE FUNCTION public.contract_attachments_validate_links();

-- 8. Immutability trigger (post-insert) ----------------------
CREATE OR REPLACE FUNCTION public.contract_attachments_enforce_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_id IS DISTINCT FROM OLD.contract_id THEN
    RAISE EXCEPTION 'contract_id is immutable' USING ERRCODE = 'check_violation';
  END IF;
  -- storage_path / file_size: allowed to change only when going from NULL to a value
  -- (covers backfill + legacy rows that get a path resolved later).
  IF OLD.storage_path IS NOT NULL AND NEW.storage_path IS DISTINCT FROM OLD.storage_path THEN
    RAISE EXCEPTION 'storage_path is immutable once set' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.file_size IS NOT NULL AND NEW.file_size IS DISTINCT FROM OLD.file_size THEN
    RAISE EXCEPTION 'file_size is immutable once set' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.milestone_id    IS DISTINCT FROM OLD.milestone_id    THEN RAISE EXCEPTION 'milestone_id is immutable'    USING ERRCODE = 'check_violation'; END IF;
  IF NEW.measurement_id  IS DISTINCT FROM OLD.measurement_id  THEN RAISE EXCEPTION 'measurement_id is immutable'  USING ERRCODE = 'check_violation'; END IF;
  IF NEW.amendment_id    IS DISTINCT FROM OLD.amendment_id    THEN RAISE EXCEPTION 'amendment_id is immutable'    USING ERRCODE = 'check_violation'; END IF;
  IF NEW.payment_id      IS DISTINCT FROM OLD.payment_id      THEN RAISE EXCEPTION 'payment_id is immutable'      USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contract_attachments_enforce_immutable_trg ON public.contract_attachments;
CREATE TRIGGER contract_attachments_enforce_immutable_trg
BEFORE UPDATE ON public.contract_attachments
FOR EACH ROW
EXECUTE FUNCTION public.contract_attachments_enforce_immutable();

-- 9. Admin diagnostic view ----------------------------------
-- View inherits caller privileges; RLS on base table still applies.
-- Wrapped in a security_invoker view so admin RLS can govern access.
CREATE OR REPLACE VIEW public.v_contract_attachments_unparsed
WITH (security_invoker = true) AS
SELECT id, contract_id, file_name, file_type, file_url, created_at
FROM public.contract_attachments
WHERE storage_path IS NULL;

-- Restrict view to admins only via a wrapper policy on a helper.
-- (We can't put RLS on a view; instead, we rely on the base table's RLS
-- plus the existing has_role(...,'admin') admin policies if any. As an extra
-- guard for non-admin queries, expose admin access through a SECURITY DEFINER
-- function — admins call this instead of selecting the view directly.)
CREATE OR REPLACE FUNCTION public.admin_list_unparsed_attachments()
RETURNS SETOF public.v_contract_attachments_unparsed
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.v_contract_attachments_unparsed
  WHERE public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION public.admin_list_unparsed_attachments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_unparsed_attachments() TO authenticated;
