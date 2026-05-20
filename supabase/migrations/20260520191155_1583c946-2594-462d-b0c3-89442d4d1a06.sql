
-- =========================================================
-- BARCODE REGISTRY — Phase 1
-- =========================================================

-- ---------- Tables ----------
CREATE TABLE IF NOT EXISTS public.barcode_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode_code text NOT NULL UNIQUE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  owner_user_id uuid NULL,
  owner_business_id uuid NULL,
  status text NOT NULL DEFAULT 'active',
  visibility text NOT NULL DEFAULT 'private',
  scan_url_path text NULL,
  current_scan_token_hash text NULL,
  permanent_public_code boolean NOT NULL DEFAULT true,
  scan_count integer NOT NULL DEFAULT 0,
  last_scanned_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  frozen_at timestamptz NULL,
  transferred_at timestamptz NULL,
  transfer_from_user_id uuid NULL,
  transfer_to_user_id uuid NULL,
  metadata jsonb NULL,
  source text NOT NULL DEFAULT 'app',
  CONSTRAINT barcode_registry_scan_count_nonneg CHECK (scan_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS barcode_registry_active_entity_uidx
  ON public.barcode_registry (entity_type, entity_id)
  WHERE status <> 'archived';

CREATE INDEX IF NOT EXISTS barcode_registry_entity_idx        ON public.barcode_registry (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS barcode_registry_owner_user_idx    ON public.barcode_registry (owner_user_id);
CREATE INDEX IF NOT EXISTS barcode_registry_owner_biz_idx     ON public.barcode_registry (owner_business_id);
CREATE INDEX IF NOT EXISTS barcode_registry_status_idx        ON public.barcode_registry (status);
CREATE INDEX IF NOT EXISTS barcode_registry_status_active_idx ON public.barcode_registry (id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.barcode_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode_id uuid NOT NULL REFERENCES public.barcode_registry(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid NULL,
  actor_business_id uuid NULL,
  actor_role text NULL,
  ip_hash text NULL,
  user_agent_hash text NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS barcode_events_barcode_idx   ON public.barcode_events (barcode_id, created_at DESC);
CREATE INDEX IF NOT EXISTS barcode_events_type_idx      ON public.barcode_events (event_type);
CREATE INDEX IF NOT EXISTS barcode_events_created_idx   ON public.barcode_events (created_at DESC);

CREATE TABLE IF NOT EXISTS public.barcode_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode_id uuid NOT NULL REFERENCES public.barcode_registry(id) ON DELETE CASCADE,
  linked_entity_type text NOT NULL,
  linked_entity_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT barcode_entity_links_uniq UNIQUE (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
);
CREATE INDEX IF NOT EXISTS barcode_entity_links_lookup_idx ON public.barcode_entity_links (linked_entity_type, linked_entity_id);

-- ---------- Validation triggers (enums) ----------
CREATE OR REPLACE FUNCTION public.barcode_registry_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.entity_type NOT IN ('client_site','contract','business','customer','lead','maintenance','asset') THEN
    RAISE EXCEPTION 'invalid entity_type: %', NEW.entity_type;
  END IF;
  IF NEW.status NOT IN ('active','frozen','archived','transferred','revoked') THEN
    RAISE EXCEPTION 'invalid status: %', NEW.status;
  END IF;
  IF NEW.visibility NOT IN ('private','limited','shared','public_limited') THEN
    RAISE EXCEPTION 'invalid visibility: %', NEW.visibility;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_barcode_registry_validate ON public.barcode_registry;
CREATE TRIGGER trg_barcode_registry_validate
BEFORE INSERT OR UPDATE ON public.barcode_registry
FOR EACH ROW EXECUTE FUNCTION public.barcode_registry_validate();

CREATE OR REPLACE FUNCTION public.barcode_events_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.event_type NOT IN (
    'created','scanned','frozen','unfrozen','transferred','archived','reactivated',
    'visibility_changed','linked_to_contract','linked_to_site','sensitive_reveal',
    'printed','rotated','admin_repair','scan_token_revoked','migration_backfill'
  ) THEN
    RAISE EXCEPTION 'invalid event_type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_barcode_events_validate ON public.barcode_events;
CREATE TRIGGER trg_barcode_events_validate
BEFORE INSERT ON public.barcode_events
FOR EACH ROW EXECUTE FUNCTION public.barcode_events_validate();

CREATE OR REPLACE FUNCTION public.barcode_entity_links_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.relationship_type NOT IN ('owns','references','contract_for','work_done_at','maintenance_for','provider_access','customer_owner') THEN
    RAISE EXCEPTION 'invalid relationship_type: %', NEW.relationship_type;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_barcode_entity_links_validate ON public.barcode_entity_links;
CREATE TRIGGER trg_barcode_entity_links_validate
BEFORE INSERT OR UPDATE ON public.barcode_entity_links
FOR EACH ROW EXECUTE FUNCTION public.barcode_entity_links_validate();

-- ---------- RLS ----------
ALTER TABLE public.barcode_registry      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcode_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcode_entity_links  ENABLE ROW LEVEL SECURITY;

-- SELECT: owner / business staff / admin
DROP POLICY IF EXISTS barcode_registry_select ON public.barcode_registry;
CREATE POLICY barcode_registry_select ON public.barcode_registry
FOR SELECT TO authenticated
USING (
  owner_user_id = auth.uid()
  OR (owner_business_id IS NOT NULL AND public.is_business_staff(owner_business_id, auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS barcode_events_select ON public.barcode_events;
CREATE POLICY barcode_events_select ON public.barcode_events
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.barcode_registry r
    WHERE r.id = barcode_events.barcode_id
      AND (r.owner_user_id = auth.uid()
           OR (r.owner_business_id IS NOT NULL AND public.is_business_staff(r.owner_business_id, auth.uid())))
  )
);

DROP POLICY IF EXISTS barcode_entity_links_select ON public.barcode_entity_links;
CREATE POLICY barcode_entity_links_select ON public.barcode_entity_links
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.barcode_registry r
    WHERE r.id = barcode_entity_links.barcode_id
      AND (r.owner_user_id = auth.uid()
           OR (r.owner_business_id IS NOT NULL AND public.is_business_staff(r.owner_business_id, auth.uid())))
  )
);
-- No INSERT/UPDATE/DELETE policies — mutations via SECURITY DEFINER RPC only.

-- ---------- Helper functions ----------

CREATE OR REPLACE FUNCTION public.normalize_barcode_code(_code text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _code IS NULL THEN NULL ELSE upper(regexp_replace(btrim(_code), '\s+', '', 'g')) END;
$$;

CREATE OR REPLACE FUNCTION public.barcode_entity_prefix(_entity_type text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _entity_type
    WHEN 'client_site'  THEN 'LOC'
    WHEN 'contract'     THEN 'CNT'
    WHEN 'business'     THEN 'BIZ'
    WHEN 'customer'     THEN 'CLI'
    WHEN 'lead'         THEN 'LED'
    WHEN 'maintenance'  THEN 'MNT'
    WHEN 'asset'        THEN 'AST'
    ELSE NULL
  END;
$$;

-- Per-prefix/year sequence generator. Sequences live in public with name barcode_seq_<PREFIX>_<YYYY>.
CREATE OR REPLACE FUNCTION public.generate_barcode_code(_entity_type text)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_prefix text := public.barcode_entity_prefix(_entity_type);
  v_year   int  := EXTRACT(YEAR FROM now())::int;
  v_seq_name text;
  v_next bigint;
  v_code text;
  v_tries int := 0;
BEGIN
  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'invalid entity_type: %', _entity_type;
  END IF;

  v_seq_name := format('barcode_seq_%s_%s', v_prefix, v_year);

  -- Create sequence on first use
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.%I MINVALUE 100000 START 100000 INCREMENT 1', v_seq_name);

  LOOP
    EXECUTE format('SELECT nextval(''public.%I'')', v_seq_name) INTO v_next;
    v_code := format('%s-%s-%s', v_prefix, v_year, lpad(v_next::text, 6, '0'));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.barcode_registry WHERE barcode_code = v_code);
    v_tries := v_tries + 1;
    IF v_tries > 50 THEN
      RAISE EXCEPTION 'barcode collision: could not allocate code for %', _entity_type;
    END IF;
  END LOOP;

  RETURN v_code;
END $$;

CREATE OR REPLACE FUNCTION public.create_barcode_for_entity(
  _entity_type text,
  _entity_id uuid,
  _barcode_code text DEFAULT NULL,
  _owner_user_id uuid DEFAULT NULL,
  _owner_business_id uuid DEFAULT NULL,
  _visibility text DEFAULT 'private',
  _source text DEFAULT 'system',
  _metadata jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing public.barcode_registry%ROWTYPE;
  v_code text;
  v_id uuid;
  v_event text;
BEGIN
  IF public.barcode_entity_prefix(_entity_type) IS NULL THEN
    RAISE EXCEPTION 'invalid entity_type: %', _entity_type;
  END IF;
  IF _entity_id IS NULL THEN
    RAISE EXCEPTION 'entity_id required';
  END IF;

  -- Return existing non-archived row if any
  SELECT * INTO v_existing
  FROM public.barcode_registry
  WHERE entity_type = _entity_type AND entity_id = _entity_id AND status <> 'archived'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'barcode_id',   v_existing.id,
      'barcode_code', v_existing.barcode_code,
      'entity_type',  v_existing.entity_type,
      'entity_id',    v_existing.entity_id,
      'status',       v_existing.status,
      'existing',     true
    );
  END IF;

  v_code := public.normalize_barcode_code(_barcode_code);
  IF v_code IS NULL OR v_code !~ ('^' || public.barcode_entity_prefix(_entity_type) || '-\d{4}-\d{6,}$') THEN
    v_code := public.generate_barcode_code(_entity_type);
  ELSIF EXISTS (SELECT 1 FROM public.barcode_registry WHERE barcode_code = v_code) THEN
    v_code := public.generate_barcode_code(_entity_type);
  END IF;

  INSERT INTO public.barcode_registry (
    barcode_code, entity_type, entity_id, owner_user_id, owner_business_id,
    visibility, source, metadata, created_by
  ) VALUES (
    v_code, _entity_type, _entity_id, _owner_user_id, _owner_business_id,
    COALESCE(_visibility,'private'), COALESCE(_source,'system'), _metadata, auth.uid()
  )
  RETURNING id INTO v_id;

  v_event := CASE WHEN _source = 'migration_backfill' THEN 'migration_backfill' ELSE 'created' END;
  INSERT INTO public.barcode_events (barcode_id, event_type, actor_user_id, actor_role, metadata)
  VALUES (v_id, v_event, auth.uid(), 'system', jsonb_build_object('source', _source));

  RETURN jsonb_build_object(
    'barcode_id',   v_id,
    'barcode_code', v_code,
    'entity_type',  _entity_type,
    'entity_id',    _entity_id,
    'status',       'active',
    'existing',     false
  );
END $$;

REVOKE ALL ON FUNCTION public.create_barcode_for_entity(text,uuid,text,uuid,uuid,text,text,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.create_barcode_for_entity(text,uuid,text,uuid,uuid,text,text,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_barcode_code(text)        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_barcode_code(text)       TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.barcode_entity_prefix(text)        TO authenticated, service_role, anon;

-- ---------- Backfill (idempotent) ----------
-- client_sites
INSERT INTO public.barcode_registry (
  barcode_code, entity_type, entity_id, owner_user_id, owner_business_id,
  status, visibility, source, metadata
)
SELECT
  public.generate_barcode_code('client_site'),
  'client_site',
  cs.id,
  COALESCE(cs.owner_user_id, cs.client_user_id),
  cs.business_id,
  CASE WHEN cs.archived_at IS NOT NULL THEN 'archived' ELSE 'active' END,
  CASE
    WHEN cs.visibility IN ('shared_by_qr','public_limited') THEN 'public_limited'
    WHEN cs.visibility = 'shared' THEN 'shared'
    ELSE 'private'
  END,
  'migration_backfill',
  jsonb_build_object('legacy_site_ref', cs.site_ref, 'entity_table','client_sites','legacy_visibility', cs.visibility)
FROM public.client_sites cs
WHERE NOT EXISTS (
  SELECT 1 FROM public.barcode_registry r
  WHERE r.entity_type='client_site' AND r.entity_id=cs.id AND r.status <> 'archived'
);

-- contracts
INSERT INTO public.barcode_registry (
  barcode_code, entity_type, entity_id, owner_user_id, owner_business_id,
  status, visibility, source, metadata
)
SELECT
  public.generate_barcode_code('contract'),
  'contract',
  c.id,
  c.provider_id,
  c.business_id,
  'active',
  'private',
  'migration_backfill',
  jsonb_build_object('legacy_contract_number', c.contract_number, 'contract_status', c.status, 'entity_table','contracts')
FROM public.contracts c
WHERE NOT EXISTS (
  SELECT 1 FROM public.barcode_registry r
  WHERE r.entity_type='contract' AND r.entity_id=c.id AND r.status <> 'archived'
);

-- businesses
INSERT INTO public.barcode_registry (
  barcode_code, entity_type, entity_id, owner_user_id, owner_business_id,
  status, visibility, source, metadata
)
SELECT
  public.generate_barcode_code('business'),
  'business',
  b.id,
  b.user_id,
  b.id,
  'active',
  CASE WHEN b.approval_status = 'approved' AND b.is_active = true THEN 'public_limited' ELSE 'private' END,
  'migration_backfill',
  jsonb_build_object('legacy_ref_id', b.ref_id, 'username', b.username, 'is_demo', b.is_demo, 'approval_status', b.approval_status, 'entity_table','businesses')
FROM public.businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM public.barcode_registry r
  WHERE r.entity_type='business' AND r.entity_id=b.id AND r.status <> 'archived'
);

-- profiles → customer
INSERT INTO public.barcode_registry (
  barcode_code, entity_type, entity_id, owner_user_id, owner_business_id,
  status, visibility, source, metadata
)
SELECT
  public.generate_barcode_code('customer'),
  'customer',
  p.id,
  p.id,
  NULL,
  'active',
  'private',
  'migration_backfill',
  jsonb_build_object('legacy_ref_id', p.ref_id, 'entity_table','profiles')
FROM public.profiles p
WHERE p.ref_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.barcode_registry r
    WHERE r.entity_type='customer' AND r.entity_id=p.id AND r.status <> 'archived'
  );

-- Backfill event rows for any newly created registry entries that don't have one yet
INSERT INTO public.barcode_events (barcode_id, event_type, actor_role, metadata)
SELECT r.id, 'migration_backfill', 'system',
       jsonb_build_object('source','migration_backfill','entity_type', r.entity_type)
FROM public.barcode_registry r
WHERE r.source = 'migration_backfill'
  AND NOT EXISTS (SELECT 1 FROM public.barcode_events e WHERE e.barcode_id = r.id);
