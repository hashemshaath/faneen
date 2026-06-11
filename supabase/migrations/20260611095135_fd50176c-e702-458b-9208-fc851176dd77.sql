
CREATE TABLE IF NOT EXISTS public.business_branch_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL,
  business_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  changed_by uuid,
  old_is_main boolean,
  new_is_main boolean,
  old_branch_type public.branch_type,
  new_branch_type public.branch_type,
  old_name_ar text,
  new_name_ar text,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.business_branch_audit_log TO authenticated;
GRANT ALL ON public.business_branch_audit_log TO service_role;

ALTER TABLE public.business_branch_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins can read branch audit"
  ON public.business_branch_audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.has_admin_access(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_branch_audit_log.business_id
        AND b.user_id = auth.uid()
    )
    OR public.is_business_owner_or_manager(auth.uid(), business_id)
  );

CREATE INDEX IF NOT EXISTS ix_branch_audit_branch
  ON public.business_branch_audit_log (branch_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_branch_audit_business
  ON public.business_branch_audit_log (business_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.business_branches_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.business_branch_audit_log (
      branch_id, business_id, action, changed_by,
      old_is_main, new_is_main, old_branch_type, new_branch_type,
      old_name_ar, new_name_ar
    ) VALUES (
      NEW.id, NEW.business_id, 'insert', auth.uid(),
      NULL, NEW.is_main, NULL, NEW.branch_type,
      NULL, NEW.name_ar
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_main IS DISTINCT FROM OLD.is_main
       OR NEW.branch_type IS DISTINCT FROM OLD.branch_type
       OR NEW.name_ar IS DISTINCT FROM OLD.name_ar THEN
      INSERT INTO public.business_branch_audit_log (
        branch_id, business_id, action, changed_by,
        old_is_main, new_is_main, old_branch_type, new_branch_type,
        old_name_ar, new_name_ar
      ) VALUES (
        NEW.id, NEW.business_id, 'update', auth.uid(),
        OLD.is_main, NEW.is_main, OLD.branch_type, NEW.branch_type,
        OLD.name_ar, NEW.name_ar
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.business_branch_audit_log (
      branch_id, business_id, action, changed_by,
      old_is_main, new_is_main, old_branch_type, new_branch_type,
      old_name_ar, new_name_ar
    ) VALUES (
      OLD.id, OLD.business_id, 'delete', auth.uid(),
      OLD.is_main, NULL, OLD.branch_type, NULL,
      OLD.name_ar, NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_branches_audit ON public.business_branches;
CREATE TRIGGER trg_business_branches_audit
AFTER INSERT OR UPDATE OR DELETE ON public.business_branches
FOR EACH ROW EXECUTE FUNCTION public.business_branches_audit_trigger();

CREATE OR REPLACE FUNCTION public.business_branches_sync_main_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  IF NEW.is_main = true AND (NEW.branch_type IS NULL OR NEW.branch_type <> 'main') THEN
    NEW.branch_type := 'main';
  ELSIF NEW.is_main = false AND NEW.branch_type = 'main' THEN
    NEW.branch_type := 'branch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_branches_sync_main_type ON public.business_branches;
CREATE TRIGGER trg_business_branches_sync_main_type
BEFORE INSERT OR UPDATE OF is_main, branch_type ON public.business_branches
FOR EACH ROW EXECUTE FUNCTION public.business_branches_sync_main_type();

CREATE OR REPLACE FUNCTION public.set_main_branch(p_branch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_business_id uuid;
BEGIN
  SELECT business_id INTO v_business_id
  FROM public.business_branches WHERE id = p_branch_id;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses WHERE id = v_business_id AND user_id = auth.uid())
    OR public.is_business_owner_or_manager(auth.uid(), v_business_id)
    OR public.has_admin_access(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to set main branch';
  END IF;

  UPDATE public.business_branches
    SET is_main = false, updated_at = now()
    WHERE business_id = v_business_id AND is_main = true AND id <> p_branch_id;

  UPDATE public.business_branches
    SET is_main = true, updated_at = now()
    WHERE id = p_branch_id;
END;
$function$;

CREATE INDEX IF NOT EXISTS ix_business_branches_active_sort
  ON public.business_branches (business_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS ix_business_branches_city
  ON public.business_branches (city_id) WHERE city_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_business_branches_region
  ON public.business_branches (region) WHERE region IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_business_branches_district
  ON public.business_branches (district) WHERE district IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_addresses_city
  ON public.addresses (city_id) WHERE city_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_addresses_district
  ON public.addresses (district) WHERE district IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_addresses_building_number
  ON public.addresses (building_number) WHERE building_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_addresses_complex_name
  ON public.addresses (complex_name) WHERE complex_name IS NOT NULL;
