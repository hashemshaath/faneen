
-- ============================================================
-- 1) GRANULAR PERMISSIONS PER BUSINESS STAFF MEMBER
-- ============================================================

-- Module enum: distinct functional areas a representative can access
DO $$ BEGIN
  CREATE TYPE public.business_module AS ENUM (
    'business_profile', 'branches', 'staff', 'contracts', 'projects',
    'services', 'offers', 'leads', 'messages', 'reviews',
    'warranties', 'billing', 'analytics', 'settings'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.business_staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_staff_id uuid NOT NULL REFERENCES public.business_staff(id) ON DELETE CASCADE,
  module public.business_module NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_staff_id, module)
);

CREATE INDEX IF NOT EXISTS idx_bsp_staff ON public.business_staff_permissions(business_staff_id);

ALTER TABLE public.business_staff_permissions ENABLE ROW LEVEL SECURITY;

-- Admins manage all
CREATE POLICY "Admins manage all staff perms"
  ON public.business_staff_permissions
  FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- Owners/managers can manage permissions of their business staff
CREATE POLICY "Owners manage their staff perms"
  ON public.business_staff_permissions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_staff bs
    WHERE bs.id = business_staff_permissions.business_staff_id
      AND public.is_business_owner_or_manager(auth.uid(), bs.business_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.business_staff bs
    WHERE bs.id = business_staff_permissions.business_staff_id
      AND public.is_business_owner_or_manager(auth.uid(), bs.business_id)
  ));

-- Staff can view their own permissions
CREATE POLICY "Staff view own perms"
  ON public.business_staff_permissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.business_staff bs
    WHERE bs.id = business_staff_permissions.business_staff_id
      AND bs.user_id = auth.uid()
  ));

CREATE TRIGGER trg_bsp_updated_at
  BEFORE UPDATE ON public.business_staff_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: check if a user has a specific permission on a business module
CREATE OR REPLACE FUNCTION public.has_business_permission(
  _user_id uuid,
  _business_id uuid,
  _module public.business_module,
  _action text  -- 'view' | 'create' | 'edit' | 'delete'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _staff_role business_staff_role;
  _staff_id uuid;
  _perm record;
BEGIN
  -- Admins always allowed
  IF public.has_admin_access(_user_id) THEN
    RETURN true;
  END IF;

  -- Business owner (in businesses.user_id) always allowed
  IF EXISTS (SELECT 1 FROM public.businesses WHERE id = _business_id AND user_id = _user_id) THEN
    RETURN true;
  END IF;

  SELECT id, role INTO _staff_id, _staff_role
  FROM public.business_staff
  WHERE business_id = _business_id AND user_id = _user_id AND is_active = true
  LIMIT 1;

  IF _staff_id IS NULL THEN RETURN false; END IF;

  -- Owner/manager roles bypass per-module restrictions
  IF _staff_role IN ('owner', 'manager') THEN RETURN true; END IF;

  SELECT * INTO _perm
  FROM public.business_staff_permissions
  WHERE business_staff_id = _staff_id AND module = _module;

  IF NOT FOUND THEN
    -- Defaults by role when no explicit row exists
    IF _staff_role = 'editor' THEN
      RETURN _action IN ('view','create','edit');
    ELSIF _staff_role = 'viewer' THEN
      RETURN _action = 'view';
    END IF;
    RETURN false;
  END IF;

  RETURN CASE _action
    WHEN 'view' THEN _perm.can_view
    WHEN 'create' THEN _perm.can_create
    WHEN 'edit' THEN _perm.can_edit
    WHEN 'delete' THEN _perm.can_delete
    ELSE false
  END;
END $$;

-- ============================================================
-- 2) AUDIT LOG: businesses + business_staff + permissions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_id uuid,                  -- auth.uid() at time of change
  entity_type text NOT NULL,      -- 'business' | 'business_staff' | 'business_staff_permissions'
  entity_id uuid,
  action text NOT NULL,           -- 'insert' | 'update' | 'delete'
  changes jsonb,                  -- diff: { field: {old, new} }
  metadata jsonb,                 -- ip, user_agent (optional)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_business ON public.business_audit_log(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.business_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.business_audit_log(entity_type, entity_id);

ALTER TABLE public.business_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins read all
CREATE POLICY "Admins read audit"
  ON public.business_audit_log FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- Owners/managers read their own business audit
CREATE POLICY "Owners read business audit"
  ON public.business_audit_log FOR SELECT TO authenticated
  USING (business_id IS NOT NULL AND public.is_business_owner_or_manager(auth.uid(), business_id));

-- Audit rows are inserted by triggers using SECURITY DEFINER. Disallow direct inserts/updates/deletes from clients.

-- Generic diff helper
CREATE OR REPLACE FUNCTION public.jsonb_diff(_old jsonb, _new jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(jsonb_object_agg(key, jsonb_build_object('old', _old->key, 'new', _new->key)), '{}'::jsonb)
  FROM (
    SELECT key FROM jsonb_each(_new) WHERE _new->key IS DISTINCT FROM _old->key
    UNION
    SELECT key FROM jsonb_each(_old) WHERE _new->key IS DISTINCT FROM _old->key
  ) k
$$;

-- Trigger: businesses
CREATE OR REPLACE FUNCTION public.audit_businesses_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _changes jsonb; _action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'insert';
    _changes := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _changes := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW));
    IF _changes = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSE
    _action := 'delete';
    _changes := to_jsonb(OLD);
  END IF;

  INSERT INTO public.business_audit_log (business_id, actor_id, entity_type, entity_id, action, changes)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    'business',
    COALESCE(NEW.id, OLD.id),
    _action,
    _changes
  );
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_businesses ON public.businesses;
CREATE TRIGGER trg_audit_businesses
  AFTER INSERT OR UPDATE OR DELETE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.audit_businesses_changes();

-- Trigger: business_staff
CREATE OR REPLACE FUNCTION public.audit_business_staff_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _changes jsonb; _action text; _bid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'insert'; _changes := to_jsonb(NEW); _bid := NEW.business_id;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _changes := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW));
    _bid := NEW.business_id;
    IF _changes = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSE
    _action := 'delete'; _changes := to_jsonb(OLD); _bid := OLD.business_id;
  END IF;

  INSERT INTO public.business_audit_log (business_id, actor_id, entity_type, entity_id, action, changes)
  VALUES (_bid, auth.uid(), 'business_staff', COALESCE(NEW.id, OLD.id), _action, _changes);
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_business_staff ON public.business_staff;
CREATE TRIGGER trg_audit_business_staff
  AFTER INSERT OR UPDATE OR DELETE ON public.business_staff
  FOR EACH ROW EXECUTE FUNCTION public.audit_business_staff_changes();

-- Trigger: business_staff_permissions
CREATE OR REPLACE FUNCTION public.audit_business_staff_perm_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _changes jsonb; _action text; _bid uuid; _sid uuid;
BEGIN
  _sid := COALESCE(NEW.business_staff_id, OLD.business_staff_id);
  SELECT business_id INTO _bid FROM public.business_staff WHERE id = _sid;

  IF TG_OP = 'INSERT' THEN
    _action := 'insert'; _changes := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _changes := public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW));
    IF _changes = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSE
    _action := 'delete'; _changes := to_jsonb(OLD);
  END IF;

  INSERT INTO public.business_audit_log (business_id, actor_id, entity_type, entity_id, action, changes)
  VALUES (_bid, auth.uid(), 'business_staff_permissions', COALESCE(NEW.id, OLD.id), _action, _changes);
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_bsp ON public.business_staff_permissions;
CREATE TRIGGER trg_audit_bsp
  AFTER INSERT OR UPDATE OR DELETE ON public.business_staff_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_business_staff_perm_changes();
