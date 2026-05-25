-- BM-REF-REBUILD-1A — Schema additive only.
-- Adds new sequences, nullable ref_id/legacy_ref_id and global-ready columns,
-- new tables (entity legal identifiers, location staff assignments, roles/permissions
-- catalog, invoices, credit_notes), and SECURITY DEFINER access helpers.
-- No backfill, no behavior change, no UI change. Idempotent (IF NOT EXISTS).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New ref_id sequences (start at 1,000,000 to match existing convention)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.seq_ent START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_led START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_bkg START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_stf START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_loc START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_qte START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_pay START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_crn START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_pvs START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_lsa START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_lid START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_sti START 1000000;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Additive columns on existing tables (all nullable; defaults are metadata only)
-- ─────────────────────────────────────────────────────────────────────────────
-- businesses → global-ready + legacy_ref_id (ENT- backfill happens in Step B)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS legacy_ref_id    text,
  ADD COLUMN IF NOT EXISTS country_code     text DEFAULT 'SA',
  ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS default_locale   text DEFAULT 'ar-SA',
  ADD COLUMN IF NOT EXISTS timezone         text DEFAULT 'Asia/Riyadh',
  ADD COLUMN IF NOT EXISTS entity_type      text,
  ADD COLUMN IF NOT EXISTS capabilities     jsonb NOT NULL DEFAULT '{}'::jsonb;

-- business_staff → STF- + richer metadata
ALTER TABLE public.business_staff
  ADD COLUMN IF NOT EXISTS ref_id               text,
  ADD COLUMN IF NOT EXISTS is_primary_manager   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS permissions_override jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS department           text;

-- business_branches → LOC-
ALTER TABLE public.business_branches
  ADD COLUMN IF NOT EXISTS ref_id        text,
  ADD COLUMN IF NOT EXISTS legacy_ref_id text;

-- client_sites → LOC- (preserve site_ref as legacy)
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS ref_id        text,
  ADD COLUMN IF NOT EXISTS legacy_ref_id text;

-- quote_requests → QTE- + entity relationships
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS ref_id              text,
  ADD COLUMN IF NOT EXISTS requester_entity_id uuid,
  ADD COLUMN IF NOT EXISTS target_entity_id    uuid,
  ADD COLUMN IF NOT EXISTS location_id         uuid;

-- lead_requests → keep ref_id (LR-) for now; add legacy_ref_id placeholder + relationships
ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS legacy_ref_id      text,
  ADD COLUMN IF NOT EXISTS source_entity_id   uuid,
  ADD COLUMN IF NOT EXISTS target_entity_id   uuid,
  ADD COLUMN IF NOT EXISTS location_id        uuid;

-- bookings → keep ref_id (BK-) for now; add legacy_ref_id placeholder
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS legacy_ref_id text;

-- membership_payment_intents → PAY-
ALTER TABLE public.membership_payment_intents
  ADD COLUMN IF NOT EXISTS ref_id text;

-- provider_subscriptions → PVS-
ALTER TABLE public.provider_subscriptions
  ADD COLUMN IF NOT EXISTS ref_id text;

-- business_staff_invitations → STI-
ALTER TABLE public.business_staff_invitations
  ADD COLUMN IF NOT EXISTS ref_id text;

-- contracts → entity/location relationships (nullable, compat with existing cols)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS requester_entity_id uuid,
  ADD COLUMN IF NOT EXISTS provider_entity_id  uuid,
  ADD COLUMN IF NOT EXISTS location_id         uuid;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. New tables (additive). All RLS enabled, default-deny posture; admin-only
--    write access; deeper policies follow in Step C once helpers are wired.
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1 entity_legal_identifiers
CREATE TABLE IF NOT EXISTS public.entity_legal_identifiers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id             text UNIQUE,
  entity_id          uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  country_code       text NOT NULL DEFAULT 'SA',
  identifier_type    text NOT NULL,
  identifier_value   text NOT NULL,
  issuing_authority  text,
  verified_at        timestamptz,
  expires_at         timestamptz,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid,
  UNIQUE (entity_id, identifier_type, identifier_value)
);
CREATE INDEX IF NOT EXISTS idx_entity_legal_identifiers_entity
  ON public.entity_legal_identifiers(entity_id);
ALTER TABLE public.entity_legal_identifiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage entity legal identifiers"
  ON public.entity_legal_identifiers;
CREATE POLICY "admins manage entity legal identifiers"
  ON public.entity_legal_identifiers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3.2 location_staff_assignments
CREATE TABLE IF NOT EXISTS public.location_staff_assignments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id               text UNIQUE,
  staff_membership_id  uuid NOT NULL REFERENCES public.business_staff(id) ON DELETE CASCADE,
  location_id          uuid NOT NULL,
  location_table       text NOT NULL DEFAULT 'business_branches'
                              CHECK (location_table IN ('business_branches','client_sites')),
  role                 text,
  permissions_override jsonb NOT NULL DEFAULT '{}'::jsonb,
  status               text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid,
  UNIQUE (staff_membership_id, location_id)
);
CREATE INDEX IF NOT EXISTS idx_loc_staff_assignments_staff
  ON public.location_staff_assignments(staff_membership_id);
CREATE INDEX IF NOT EXISTS idx_loc_staff_assignments_loc
  ON public.location_staff_assignments(location_id);
ALTER TABLE public.location_staff_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage location staff assignments"
  ON public.location_staff_assignments;
CREATE POLICY "admins manage location staff assignments"
  ON public.location_staff_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3.3 roles_catalog
CREATE TABLE IF NOT EXISTS public.roles_catalog (
  key         text PRIMARY KEY,
  scope       text NOT NULL CHECK (scope IN ('global','entity','location')),
  label_ar    text NOT NULL,
  label_en    text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roles_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles catalog readable"   ON public.roles_catalog;
DROP POLICY IF EXISTS "roles catalog admin write" ON public.roles_catalog;
CREATE POLICY "roles catalog readable"
  ON public.roles_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles catalog admin write"
  ON public.roles_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 3.4 permissions_catalog
CREATE TABLE IF NOT EXISTS public.permissions_catalog (
  key         text PRIMARY KEY,
  group_key   text NOT NULL,
  label_ar    text NOT NULL,
  label_en    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perm catalog readable"   ON public.permissions_catalog;
DROP POLICY IF EXISTS "perm catalog admin write" ON public.permissions_catalog;
CREATE POLICY "perm catalog readable"
  ON public.permissions_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "perm catalog admin write"
  ON public.permissions_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 3.5 role_permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_key       text NOT NULL REFERENCES public.roles_catalog(key) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions_catalog(key) ON DELETE CASCADE,
  PRIMARY KEY (role_key, permission_key)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "role perms readable"   ON public.role_permissions;
DROP POLICY IF EXISTS "role perms admin write" ON public.role_permissions;
CREATE POLICY "role perms readable"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role perms admin write"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 3.6 invoices (schema-only; not wired into payments yet)
CREATE TABLE IF NOT EXISTS public.invoices (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id                   text UNIQUE,
  entity_id                uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  subscription_id          uuid,
  payment_intent_id        uuid,
  issued_to_entity_id      uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  amount                   numeric(14,2) NOT NULL DEFAULT 0,
  currency                 text NOT NULL DEFAULT 'SAR',
  country_code             text NOT NULL DEFAULT 'SA',
  tax_scheme               text,
  tax_registration_number  text,
  tax_rate                 numeric(5,2),
  status                   text NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','issued','paid','void','refunded')),
  metadata                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_entity ON public.invoices(entity_id);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices admin manage" ON public.invoices;
CREATE POLICY "invoices admin manage"
  ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- 3.7 credit_notes (schema-only)
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id            text UNIQUE,
  invoice_id        uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_intent_id uuid,
  entity_id         uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  amount            numeric(14,2) NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'SAR',
  reason            text,
  status            text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','issued','void')),
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON public.credit_notes(invoice_id);
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit notes admin manage" ON public.credit_notes;
CREATE POLICY "credit notes admin manage"
  ON public.credit_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SECURITY DEFINER access helpers — additive; not yet referenced by any
--    RLS policy. Step C will wire them. Designed to be non-recursive.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_entity_membership(
  _user_id    uuid,
  _entity_id  uuid,
  _permission text DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = _entity_id AND b.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.business_staff s
    WHERE s.business_id = _entity_id
      AND s.user_id     = _user_id
      AND COALESCE(s.is_active, true) = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_location_access(
  _user_id     uuid,
  _location_id uuid,
  _permission  text DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.location_staff_assignments lsa
    JOIN public.business_staff s ON s.id = lsa.staff_membership_id
    WHERE lsa.location_id = _location_id
      AND s.user_id       = _user_id
      AND lsa.status      = 'active'
      AND COALESCE(s.is_active, true) = true
  )
  OR EXISTS (
    SELECT 1 FROM public.business_branches bb
    JOIN public.businesses b ON b.id = bb.business_id
    WHERE bb.id = _location_id AND b.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.client_sites cs
    JOIN public.businesses b ON b.id = cs.business_id
    WHERE cs.id = _location_id AND b.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_entity_contexts(_user_id uuid)
RETURNS TABLE (
  entity_id    uuid,
  ref_id       text,
  legacy_ref_id text,
  name_ar      text,
  role         text,
  is_owner     boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.ref_id, b.legacy_ref_id, b.name_ar, 'owner'::text AS role, true
  FROM public.businesses b
  WHERE b.user_id = _user_id
  UNION
  SELECT b.id, b.ref_id, b.legacy_ref_id, b.name_ar, s.role::text, false
  FROM public.business_staff s
  JOIN public.businesses b ON b.id = s.business_id
  WHERE s.user_id = _user_id
    AND COALESCE(s.is_active, true) = true;
$$;

-- lookup_by_reference — safe: only returns identity/route, not protected data.
-- UUID fallback restricted to admins.
CREATE OR REPLACE FUNCTION public.lookup_by_reference(_ref text)
RETURNS TABLE (
  entity_type    text,
  table_name     text,
  id             uuid,
  ref_id         text,
  legacy_ref_id  text,
  canonical_route text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ref     text := upper(btrim(coalesce(_ref,'')));
  v_prefix  text;
  v_uuid    uuid;
  v_is_admin boolean := public.has_role(auth.uid(),'admin')
                     OR public.has_role(auth.uid(),'super_admin');
BEGIN
  IF v_ref = '' THEN RETURN; END IF;

  v_prefix := split_part(v_ref, '-', 1);

  -- businesses (ENT / BIZ)
  IF v_prefix IN ('ENT','BIZ') THEN
    RETURN QUERY
      SELECT 'business'::text, 'businesses'::text, b.id, b.ref_id, b.legacy_ref_id,
             ('/business/' || COALESCE(b.username, b.id::text))::text
      FROM public.businesses b
      WHERE upper(b.ref_id) = v_ref OR upper(coalesce(b.legacy_ref_id,'')) = v_ref;
    RETURN;
  END IF;

  -- contracts
  IF v_prefix = 'CNT' THEN
    RETURN QUERY
      SELECT 'contract'::text, 'contracts'::text, c.id, c.ref_id, NULL::text,
             ('/dashboard/contracts/' || c.id::text)::text
      FROM public.contracts c WHERE upper(c.ref_id) = v_ref;
    RETURN;
  END IF;

  -- leads (LED / LR)
  IF v_prefix IN ('LED','LR') THEN
    RETURN QUERY
      SELECT 'lead'::text, 'lead_requests'::text, l.id, l.ref_id, l.legacy_ref_id,
             ('/dashboard/leads/' || l.id::text)::text
      FROM public.lead_requests l
      WHERE upper(l.ref_id) = v_ref OR upper(coalesce(l.legacy_ref_id,'')) = v_ref;
    RETURN;
  END IF;

  -- bookings (BKG / BK)
  IF v_prefix IN ('BKG','BK') THEN
    RETURN QUERY
      SELECT 'booking'::text, 'bookings'::text, bk.id, bk.ref_id, bk.legacy_ref_id,
             ('/dashboard/bookings/' || bk.id::text)::text
      FROM public.bookings bk
      WHERE upper(bk.ref_id) = v_ref OR upper(coalesce(bk.legacy_ref_id,'')) = v_ref;
    RETURN;
  END IF;

  -- payments
  IF v_prefix = 'PAY' THEN
    RETURN QUERY
      SELECT 'payment_intent'::text, 'membership_payment_intents'::text,
             p.id, p.ref_id, NULL::text,
             ('/membership/payment/' || p.id::text)::text
      FROM public.membership_payment_intents p WHERE upper(p.ref_id) = v_ref;
    RETURN;
  END IF;

  -- UUID admin fallback
  IF v_is_admin AND v_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN v_uuid := v_ref::uuid; EXCEPTION WHEN others THEN RETURN; END;
    RETURN QUERY
      SELECT 'business'::text, 'businesses'::text, b.id, b.ref_id, b.legacy_ref_id,
             ('/business/' || COALESCE(b.username, b.id::text))::text
      FROM public.businesses b WHERE b.id = v_uuid;
    RETURN;
  END IF;
END;
$$;

-- Grants for new helpers (RPC-callable by authenticated users)
REVOKE ALL ON FUNCTION public.has_entity_membership(uuid,uuid,text)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_location_access(uuid,uuid,text)     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_entity_contexts(uuid)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_by_reference(text)               FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_entity_membership(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_location_access(uuid,uuid,text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_entity_contexts(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_by_reference(text)             TO authenticated;