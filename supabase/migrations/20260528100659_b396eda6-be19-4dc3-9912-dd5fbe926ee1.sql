-- BUSINESS-ADMIN-2: admin_operational_notes (internal support log)
CREATE TABLE IF NOT EXISTS public.admin_operational_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL,
  entity_type text NOT NULL,
  note text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  status text NOT NULL DEFAULT 'open',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid,
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT admin_op_notes_ref_pattern CHECK (ref_id ~ '^[A-Z]{2,6}-[A-Z0-9]+$'),
  CONSTRAINT admin_op_notes_severity_chk CHECK (severity IN ('info','warning','critical')),
  CONSTRAINT admin_op_notes_status_chk CHECK (status IN ('open','resolved')),
  CONSTRAINT admin_op_notes_entity_type_chk CHECK (entity_type IN ('work_order','contract','quote','lead','booking','task','other')),
  CONSTRAINT admin_op_notes_note_len_chk CHECK (char_length(note) BETWEEN 1 AND 2000),
  CONSTRAINT admin_op_notes_metadata_obj CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT admin_op_notes_metadata_size CHECK (octet_length(metadata::text) <= 2048),
  CONSTRAINT admin_op_notes_resolution_consistency CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL)
    OR (status = 'open' AND resolved_at IS NULL AND resolved_by IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_admin_op_notes_ref_id ON public.admin_operational_notes (ref_id);
CREATE INDEX IF NOT EXISTS idx_admin_op_notes_status_created ON public.admin_operational_notes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_op_notes_severity ON public.admin_operational_notes (severity);

-- Auth-only, admin-only table — no anon grant.
GRANT SELECT, INSERT, UPDATE ON public.admin_operational_notes TO authenticated;
GRANT ALL ON public.admin_operational_notes TO service_role;

ALTER TABLE public.admin_operational_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: admin/super_admin only
CREATE POLICY "Admins read operational notes"
ON public.admin_operational_notes
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- INSERT: admin/super_admin only; created_by must be the caller; status must start 'open'
CREATE POLICY "Admins create operational notes"
ON public.admin_operational_notes
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_admin_access(auth.uid())
  AND created_by = auth.uid()
  AND status = 'open'
  AND resolved_at IS NULL
  AND resolved_by IS NULL
);

-- UPDATE: admin/super_admin only. Resolve transition enforced by trigger below.
CREATE POLICY "Admins update operational notes"
ON public.admin_operational_notes
FOR UPDATE
TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

-- No DELETE policy — append-only.

-- Trigger: enforce append-only fields; only status/resolved_* may change.
CREATE OR REPLACE FUNCTION public.admin_operational_notes_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ref_id IS DISTINCT FROM OLD.ref_id
     OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.note IS DISTINCT FROM OLD.note
     OR NEW.severity IS DISTINCT FROM OLD.severity
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
    RAISE EXCEPTION 'admin_operational_notes: only status/resolved fields may be updated';
  END IF;

  IF OLD.status = 'resolved' THEN
    RAISE EXCEPTION 'admin_operational_notes: resolved notes are immutable';
  END IF;

  IF NEW.status = 'resolved' THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
    NEW.resolved_by := COALESCE(NEW.resolved_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_operational_notes_guard_trg ON public.admin_operational_notes;
CREATE TRIGGER admin_operational_notes_guard_trg
BEFORE UPDATE ON public.admin_operational_notes
FOR EACH ROW
EXECUTE FUNCTION public.admin_operational_notes_guard();