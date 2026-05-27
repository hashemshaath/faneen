-- Sequence for NOTE- ref ids (PREFIX-NNNNNNN, starts at 1000)
CREATE SEQUENCE IF NOT EXISTS public.business_internal_notes_seq START 1000;

CREATE TABLE IF NOT EXISTS public.business_internal_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_id text UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  body text NOT NULL,
  visibility text NOT NULL DEFAULT 'internal',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT business_internal_notes_body_len CHECK (char_length(body) BETWEEN 1 AND 4000),
  CONSTRAINT business_internal_notes_visibility_chk CHECK (visibility IN ('internal','admin'))
);

CREATE INDEX IF NOT EXISTS idx_bin_business ON public.business_internal_notes (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bin_author ON public.business_internal_notes (author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bin_pinned ON public.business_internal_notes (business_id, pinned, created_at DESC) WHERE deleted_at IS NULL;

-- Auto-populate ref_id + updated_at
CREATE OR REPLACE FUNCTION public.set_business_internal_note_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ref_id IS NULL THEN
      NEW.ref_id := public.generate_ref_id('NOTE', 'business_internal_notes_seq');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bin_defaults ON public.business_internal_notes;
CREATE TRIGGER trg_bin_defaults
BEFORE INSERT OR UPDATE ON public.business_internal_notes
FOR EACH ROW EXECUTE FUNCTION public.set_business_internal_note_defaults();

-- Grants: auth-only (no anon — never publicly readable)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_internal_notes TO authenticated;
GRANT ALL ON public.business_internal_notes TO service_role;
GRANT USAGE ON SEQUENCE public.business_internal_notes_seq TO authenticated, service_role;

ALTER TABLE public.business_internal_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: admins see all; owners/managers see all for their business;
-- staff see only 'internal' visibility for their business; soft-deleted rows hidden from non-admins.
CREATE POLICY "Admins read all internal notes"
ON public.business_internal_notes FOR SELECT TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Owners and managers read internal notes"
ON public.business_internal_notes FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND public.is_business_owner_or_manager(auth.uid(), business_id)
);

CREATE POLICY "Staff read internal-visibility notes"
ON public.business_internal_notes FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND visibility = 'internal'
  AND public.is_business_staff(auth.uid(), business_id)
);

-- INSERT: owners/managers can add 'internal' notes; admins can add any.
CREATE POLICY "Owners and managers insert internal notes"
ON public.business_internal_notes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_user_id
  AND visibility = 'internal'
  AND public.is_business_owner_or_manager(auth.uid(), business_id)
);

CREATE POLICY "Admins insert any internal note"
ON public.business_internal_notes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_user_id
  AND public.has_admin_access(auth.uid())
);

-- UPDATE: author (owner/manager) can edit own; admins can edit any.
CREATE POLICY "Authors update own internal notes"
ON public.business_internal_notes FOR UPDATE TO authenticated
USING (
  auth.uid() = author_user_id
  AND public.is_business_owner_or_manager(auth.uid(), business_id)
)
WITH CHECK (
  auth.uid() = author_user_id
  AND public.is_business_owner_or_manager(auth.uid(), business_id)
);

CREATE POLICY "Admins update any internal note"
ON public.business_internal_notes FOR UPDATE TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

-- DELETE: admins only (non-admins should soft-delete via UPDATE deleted_at).
CREATE POLICY "Admins delete internal notes"
ON public.business_internal_notes FOR DELETE TO authenticated
USING (public.has_admin_access(auth.uid()));
