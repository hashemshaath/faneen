
-- ===========================================
-- Barcode Phase 2: triggers + entity-link backfill
-- ===========================================

-- ---------- Trigger functions ----------

CREATE OR REPLACE FUNCTION public.tg_client_sites_create_barcode()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_vis text;
BEGIN
  v_vis := CASE
    WHEN NEW.visibility IN ('shared_by_qr','public_limited') THEN 'public_limited'
    WHEN NEW.visibility = 'shared' THEN 'shared'
    ELSE 'private'
  END;

  PERFORM public.create_barcode_for_entity(
    'client_site',
    NEW.id,
    NEW.site_ref,
    COALESCE(NEW.owner_user_id, NEW.client_user_id),
    NEW.business_id,
    v_vis,
    'client_site_insert',
    jsonb_build_object('legacy_site_ref', NEW.site_ref, 'entity_table','client_sites')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- never break the parent insert because of barcode bookkeeping
  RAISE WARNING 'tg_client_sites_create_barcode failed: %', SQLERRM;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_contracts_create_barcode()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_barcode_for_entity(
    'contract',
    NEW.id,
    NEW.contract_number,
    NEW.provider_id,
    NEW.business_id,
    'private',
    'contract_insert',
    jsonb_build_object('legacy_contract_number', NEW.contract_number, 'contract_status', NEW.status, 'entity_table','contracts')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tg_contracts_create_barcode failed: %', SQLERRM;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_businesses_create_barcode()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_vis text;
BEGIN
  v_vis := CASE WHEN NEW.approval_status = 'approved' AND NEW.is_active = true THEN 'public_limited' ELSE 'private' END;
  PERFORM public.create_barcode_for_entity(
    'business',
    NEW.id,
    NEW.ref_id,
    NEW.user_id,
    NEW.id,
    v_vis,
    'business_insert',
    jsonb_build_object('legacy_ref_id', NEW.ref_id, 'username', NEW.username, 'is_demo', NEW.is_demo, 'entity_table','businesses')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tg_businesses_create_barcode failed: %', SQLERRM;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.tg_profiles_create_barcode()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM public.create_barcode_for_entity(
    'customer',
    NEW.id,
    NEW.ref_id,
    NEW.id,
    NULL,
    'private',
    'profile_insert',
    jsonb_build_object('legacy_ref_id', NEW.ref_id, 'entity_table','profiles')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tg_profiles_create_barcode failed: %', SQLERRM;
  RETURN NEW;
END $$;

-- ---------- Attach triggers ----------
DROP TRIGGER IF EXISTS tg_client_sites_create_barcode ON public.client_sites;
CREATE TRIGGER tg_client_sites_create_barcode
AFTER INSERT ON public.client_sites
FOR EACH ROW EXECUTE FUNCTION public.tg_client_sites_create_barcode();

DROP TRIGGER IF EXISTS tg_contracts_create_barcode ON public.contracts;
CREATE TRIGGER tg_contracts_create_barcode
AFTER INSERT ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.tg_contracts_create_barcode();

DROP TRIGGER IF EXISTS tg_businesses_create_barcode ON public.businesses;
CREATE TRIGGER tg_businesses_create_barcode
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.tg_businesses_create_barcode();

DROP TRIGGER IF EXISTS tg_profiles_create_barcode ON public.profiles;
CREATE TRIGGER tg_profiles_create_barcode
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_profiles_create_barcode();

-- ---------- Entity-links backfill (idempotent via UNIQUE) ----------

-- 1. Contract -> Client Site (contract_for)
INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
SELECT cb.id, 'client_site', c.execution_site_id, 'contract_for'
FROM public.contracts c
JOIN public.barcode_registry cb ON cb.entity_type='contract'    AND cb.entity_id=c.id AND cb.status<>'archived'
JOIN public.barcode_registry sb ON sb.entity_type='client_site' AND sb.entity_id=c.execution_site_id AND sb.status<>'archived'
WHERE c.execution_site_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. Contract -> Business (provider_access)
INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
SELECT cb.id, 'business', c.business_id, 'provider_access'
FROM public.contracts c
JOIN public.barcode_registry cb ON cb.entity_type='contract' AND cb.entity_id=c.id AND cb.status<>'archived'
JOIN public.barcode_registry bb ON bb.entity_type='business' AND bb.entity_id=c.business_id AND bb.status<>'archived'
WHERE c.business_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Contract -> Customer (customer_owner) when client_id matches a customer barcode
INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
SELECT cb.id, 'customer', c.client_id, 'customer_owner'
FROM public.contracts c
JOIN public.barcode_registry cb ON cb.entity_type='contract' AND cb.entity_id=c.id AND cb.status<>'archived'
JOIN public.barcode_registry pb ON pb.entity_type='customer' AND pb.entity_id=c.client_id AND pb.status<>'archived'
WHERE c.client_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Client Site -> Business (provider_access)
INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
SELECT sb.id, 'business', cs.business_id, 'provider_access'
FROM public.client_sites cs
JOIN public.barcode_registry sb ON sb.entity_type='client_site' AND sb.entity_id=cs.id AND sb.status<>'archived'
JOIN public.barcode_registry bb ON bb.entity_type='business'    AND bb.entity_id=cs.business_id AND bb.status<>'archived'
WHERE cs.business_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Client Site -> Customer (customer_owner)
INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
SELECT sb.id, 'customer', COALESCE(cs.owner_user_id, cs.client_user_id), 'customer_owner'
FROM public.client_sites cs
JOIN public.barcode_registry sb ON sb.entity_type='client_site' AND sb.entity_id=cs.id AND sb.status<>'archived'
JOIN public.barcode_registry pb ON pb.entity_type='customer'    AND pb.entity_id=COALESCE(cs.owner_user_id, cs.client_user_id) AND pb.status<>'archived'
WHERE COALESCE(cs.owner_user_id, cs.client_user_id) IS NOT NULL
ON CONFLICT DO NOTHING;

-- ---------- One summary event per affected barcode (low volume) ----------
INSERT INTO public.barcode_events (barcode_id, event_type, actor_role, metadata)
SELECT DISTINCT l.barcode_id, 'migration_backfill', 'system',
       jsonb_build_object('source','phase2_links_backfill')
FROM public.barcode_entity_links l
WHERE NOT EXISTS (
  SELECT 1 FROM public.barcode_events e
  WHERE e.barcode_id = l.barcode_id
    AND e.event_type = 'migration_backfill'
    AND e.metadata->>'source' = 'phase2_links_backfill'
);
