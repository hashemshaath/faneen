-- Add branch_type enum + column to business_branches
DO $$ BEGIN
  CREATE TYPE public.branch_type AS ENUM ('main', 'branch', 'warehouse', 'admin_office');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.business_branches
  ADD COLUMN IF NOT EXISTS branch_type public.branch_type NOT NULL DEFAULT 'branch';

-- Backfill: existing is_main rows become 'main'
UPDATE public.business_branches
  SET branch_type = 'main'
  WHERE is_main = true AND branch_type = 'branch';

-- Keep branch_type in sync with is_main: any 'main' row must have is_main=true,
-- and switching to non-main types must clear is_main.
CREATE OR REPLACE FUNCTION public.sync_branch_type_is_main()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.branch_type = 'main' THEN
    NEW.is_main := true;
  ELSIF TG_OP = 'UPDATE' AND OLD.branch_type = 'main' AND NEW.branch_type <> 'main' THEN
    NEW.is_main := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_branches_sync_branch_type ON public.business_branches;
CREATE TRIGGER trg_business_branches_sync_branch_type
  BEFORE INSERT OR UPDATE OF branch_type, is_main ON public.business_branches
  FOR EACH ROW EXECUTE FUNCTION public.sync_branch_type_is_main();

CREATE INDEX IF NOT EXISTS idx_business_branches_branch_type
  ON public.business_branches (business_id, branch_type);