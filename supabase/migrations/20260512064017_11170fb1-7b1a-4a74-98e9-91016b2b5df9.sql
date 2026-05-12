-- =========================================================================
-- C6.0 — Contract Versioning Schema Additions + v1 Backfill (additive only)
-- =========================================================================

-- Part A: contracts additions (nullable / defaulted, no behavior change)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS contract_version          integer     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS official_version_number   integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS document_hash             text,
  ADD COLUMN IF NOT EXISTS last_pdf_generated_at     timestamptz,
  ADD COLUMN IF NOT EXISTS last_pdf_snapshot_id      uuid,
  ADD COLUMN IF NOT EXISTS locked_at                 timestamptz;

-- Part B: contract_versions table
CREATE TABLE IF NOT EXISTS public.contract_versions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         uuid        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version_number      integer     NOT NULL,
  kind                text        NOT NULL,
  amendment_id        uuid        REFERENCES public.contract_amendments(id) ON DELETE SET NULL,
  snapshot            jsonb       NOT NULL,
  document_hash       text        NOT NULL,
  prev_version_id     uuid        REFERENCES public.contract_versions(id),
  prev_document_hash  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid,
  pdf_storage_path    text,
  CONSTRAINT contract_versions_unique_per_contract UNIQUE (contract_id, version_number),
  CONSTRAINT contract_versions_version_positive CHECK (version_number > 0),
  CONSTRAINT contract_versions_kind_check CHECK (
    kind IN ('original','amendment_apply','completion','cancellation')
  )
);

CREATE INDEX IF NOT EXISTS idx_contract_versions_contract       ON public.contract_versions(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_versions_amendment      ON public.contract_versions(amendment_id);
CREATE INDEX IF NOT EXISTS idx_contract_versions_contract_ver   ON public.contract_versions(contract_id, version_number DESC);

-- Add FK from contracts.last_pdf_snapshot_id now that the table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_last_pdf_snapshot_id_fkey'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_last_pdf_snapshot_id_fkey
      FOREIGN KEY (last_pdf_snapshot_id)
      REFERENCES public.contract_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Part C: RLS for contract_versions
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties or admin can view contract versions" ON public.contract_versions;
CREATE POLICY "Parties or admin can view contract versions"
ON public.contract_versions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_versions.contract_id
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
  )
);

-- No INSERT/UPDATE/DELETE policies => only service_role / SECURITY DEFINER may write.

-- Part D: Deterministic snapshot + hash helpers (SECURITY DEFINER, search_path locked)
CREATE OR REPLACE FUNCTION public.contract_canonical_snapshot(_contract_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Build a key-sorted JSON snapshot of legally significant fields.
  -- jsonb_object_agg over an ORDER BY produces stable key order; values are scalars
  -- so stringification is deterministic for the same input.
  SELECT jsonb_object_agg(k, v ORDER BY k)
  FROM (
    SELECT 'contract_number'      AS k, to_jsonb(c.contract_number)              AS v FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'title_ar',            to_jsonb(c.title_ar)                  FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'title_en',            to_jsonb(c.title_en)                  FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'description_ar',      to_jsonb(c.description_ar)            FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'description_en',      to_jsonb(c.description_en)            FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'terms_ar',            to_jsonb(c.terms_ar)                  FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'terms_en',            to_jsonb(c.terms_en)                  FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'total_amount',        to_jsonb(c.total_amount::text)        FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'currency_code',       to_jsonb(c.currency_code)             FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'vat_inclusive',       to_jsonb(c.vat_inclusive)             FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'vat_rate',            to_jsonb(c.vat_rate::text)            FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'start_date',          to_jsonb(c.start_date)                FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'end_date',            to_jsonb(c.end_date)                  FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'status',              to_jsonb(c.status::text)              FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'client_id',           to_jsonb(c.client_id::text)           FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'provider_id',         to_jsonb(c.provider_id::text)         FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'business_id',         to_jsonb(c.business_id::text)         FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'created_at',          to_jsonb(c.created_at)                FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'client_accepted_at',  to_jsonb(c.client_accepted_at)        FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'provider_accepted_at',to_jsonb(c.provider_accepted_at)      FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'supervisor_name',     to_jsonb(c.supervisor_name)           FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'supervisor_phone',    to_jsonb(c.supervisor_phone)          FROM contracts c WHERE c.id = _contract_id
    UNION ALL SELECT 'supervisor_email',    to_jsonb(c.supervisor_email)          FROM contracts c WHERE c.id = _contract_id
  ) s;
$$;

-- sha256 over canonical text representation. Limitation: jsonb::text has stable
-- key ordering only because the snapshot is built with jsonb_object_agg(k ORDER BY k);
-- nested objects (none today) would need recursive sorting if introduced.
CREATE OR REPLACE FUNCTION public.contract_snapshot_hash(_snapshot jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT encode(extensions.digest(_snapshot::text, 'sha256'), 'hex');
$$;

-- Part E: v1 backfill
DO $$
DECLARE
  r          record;
  v_snap     jsonb;
  v_hash     text;
  v_id       uuid;
  v_locked   timestamptz;
  v_official boolean;
BEGIN
  FOR r IN
    SELECT c.id, c.status, c.client_accepted_at, c.provider_accepted_at
    FROM public.contracts c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.contract_versions v
      WHERE v.contract_id = c.id AND v.version_number = 1
    )
  LOOP
    v_snap := public.contract_canonical_snapshot(r.id);
    v_hash := public.contract_snapshot_hash(v_snap);

    INSERT INTO public.contract_versions
      (contract_id, version_number, kind, snapshot, document_hash, prev_version_id, prev_document_hash)
    VALUES
      (r.id, 1, 'original', v_snap, v_hash, NULL, NULL)
    RETURNING id INTO v_id;

    v_official := r.status IN ('active','completed','cancelled','disputed');
    v_locked   := COALESCE(r.client_accepted_at, r.provider_accepted_at);

    UPDATE public.contracts
       SET contract_version        = 1,
           official_version_number = CASE WHEN v_official THEN 1 ELSE 0 END,
           document_hash           = v_hash,
           last_pdf_snapshot_id    = v_id,
           locked_at               = CASE
             WHEN r.status IN ('active','completed') THEN v_locked
             ELSE NULL
           END
     WHERE id = r.id;
  END LOOP;
END $$;