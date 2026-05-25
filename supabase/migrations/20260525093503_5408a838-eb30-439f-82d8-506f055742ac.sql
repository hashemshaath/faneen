-- BM-REF-REBUILD-1B (retry) — guard audit trigger, clean orphans, backfill, index.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Harden audit trigger: skip when parent business no longer exists.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_business_staff_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Defensive guard: do not attempt to log against a deleted/missing business.
  IF _bid IS NULL OR NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _bid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.business_audit_log (business_id, actor_id, entity_type, entity_id, action, changes)
  VALUES (_bid, auth.uid(), 'business_staff', COALESCE(NEW.id, OLD.id), _action, _changes);
  RETURN COALESCE(NEW, OLD);
END $function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Orphan cleanup (approved): drop staff rows pointing to missing businesses.
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM public.business_staff s
 WHERE NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = s.business_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.businesses
   SET legacy_ref_id = ref_id
 WHERE legacy_ref_id IS NULL AND ref_id LIKE 'BIZ-%';

UPDATE public.businesses
   SET ref_id = public.generate_ref_id('ENT','seq_ent')
 WHERE ref_id IS NULL OR ref_id LIKE 'BIZ-%';

UPDATE public.lead_requests
   SET legacy_ref_id = ref_id
 WHERE legacy_ref_id IS NULL AND ref_id LIKE 'LR-%';
UPDATE public.lead_requests
   SET ref_id = public.generate_ref_id('LED','seq_led')
 WHERE ref_id IS NULL OR ref_id LIKE 'LR-%';

UPDATE public.bookings
   SET legacy_ref_id = ref_id
 WHERE legacy_ref_id IS NULL AND ref_id LIKE 'BK-%';
UPDATE public.bookings
   SET ref_id = public.generate_ref_id('BKG','seq_bkg')
 WHERE ref_id IS NULL OR ref_id LIKE 'BK-%';

UPDATE public.business_staff
   SET ref_id = public.generate_ref_id('STF','seq_stf')
 WHERE ref_id IS NULL;

UPDATE public.business_branches
   SET ref_id = public.generate_ref_id('LOC','seq_loc')
 WHERE ref_id IS NULL;

UPDATE public.client_sites
   SET legacy_ref_id = site_ref
 WHERE legacy_ref_id IS NULL AND site_ref IS NOT NULL;
UPDATE public.client_sites
   SET ref_id = public.generate_ref_id('LOC','seq_loc')
 WHERE ref_id IS NULL;

UPDATE public.quote_requests
   SET ref_id = public.generate_ref_id('QTE','seq_qte')
 WHERE ref_id IS NULL;

UPDATE public.membership_payment_intents
   SET ref_id = public.generate_ref_id('PAY','seq_pay')
 WHERE ref_id IS NULL;

UPDATE public.provider_subscriptions
   SET ref_id = public.generate_ref_id('PVS','seq_pvs')
 WHERE ref_id IS NULL;

UPDATE public.business_staff_invitations
   SET ref_id = public.generate_ref_id('STI','seq_sti')
 WHERE ref_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Unique indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS ux_businesses_ref_id              ON public.businesses(ref_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_businesses_legacy_ref_id       ON public.businesses(legacy_ref_id) WHERE legacy_ref_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_lead_requests_ref_id           ON public.lead_requests(ref_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_lead_requests_legacy_ref_id    ON public.lead_requests(legacy_ref_id) WHERE legacy_ref_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_ref_id                ON public.bookings(ref_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_legacy_ref_id         ON public.bookings(legacy_ref_id) WHERE legacy_ref_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_business_staff_ref_id          ON public.business_staff(ref_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_business_branches_ref_id       ON public.business_branches(ref_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_client_sites_ref_id            ON public.client_sites(ref_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_client_sites_legacy_ref_id     ON public.client_sites(legacy_ref_id) WHERE legacy_ref_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_quote_requests_ref_id          ON public.quote_requests(ref_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_membership_payment_intents_ref_id ON public.membership_payment_intents(ref_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_provider_subscriptions_ref_id  ON public.provider_subscriptions(ref_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_business_staff_invitations_ref_id ON public.business_staff_invitations(ref_id);