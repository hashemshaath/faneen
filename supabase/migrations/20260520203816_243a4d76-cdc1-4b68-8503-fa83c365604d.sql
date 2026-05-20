
-- 1) Expand link validator (additive)
CREATE OR REPLACE FUNCTION public.barcode_entity_links_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.relationship_type NOT IN (
    'owns','references','contract_for','work_done_at',
    'maintenance_for','provider_access','customer_owner',
    'lead_for','submitted_from_site','converted_to_contract','assigned_to_provider'
  ) THEN
    RAISE EXCEPTION 'invalid relationship_type: %', NEW.relationship_type;
  END IF;
  RETURN NEW;
END $$;

-- 2) Backfill barcodes for existing leads
DO $do$
DECLARE
  r RECORD;
  v_res jsonb;
BEGIN
  FOR r IN
    SELECT lr.id, lr.business_id, lr.status, lr.initiated_by,
           lr.source_site_id, lr.converted_contract_id
    FROM public.lead_requests lr
    WHERE NOT EXISTS (
      SELECT 1 FROM public.barcode_registry br
      WHERE br.entity_type='lead' AND br.entity_id = lr.id AND br.status <> 'archived'
    )
  LOOP
    v_res := public.create_barcode_for_entity(
      'lead', r.id, NULL, NULL, r.business_id, 'private', 'phase10_lead_backfill',
      jsonb_build_object(
        'source','phase10_lead_backfill',
        'lead_status', r.status,
        'initiated_by', r.initiated_by,
        'source_site_id_present', r.source_site_id IS NOT NULL,
        'converted_contract_id_present', r.converted_contract_id IS NOT NULL
      )
    );
  END LOOP;
END $do$;

-- 3) Backfill links from leads to site/business/contract
INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
SELECT lb.id, 'client_site', lr.source_site_id, 'submitted_from_site'
FROM public.lead_requests lr
JOIN public.barcode_registry lb ON lb.entity_type='lead' AND lb.entity_id=lr.id AND lb.status='active'
JOIN public.barcode_registry sb ON sb.entity_type='client_site' AND sb.entity_id=lr.source_site_id AND sb.status='active'
WHERE lr.source_site_id IS NOT NULL
ON CONFLICT ON CONSTRAINT barcode_entity_links_uniq DO NOTHING;

INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
SELECT lb.id, 'business', lr.business_id, 'assigned_to_provider'
FROM public.lead_requests lr
JOIN public.barcode_registry lb ON lb.entity_type='lead' AND lb.entity_id=lr.id AND lb.status='active'
JOIN public.barcode_registry bb ON bb.entity_type='business' AND bb.entity_id=lr.business_id AND bb.status='active'
WHERE lr.business_id IS NOT NULL
ON CONFLICT ON CONSTRAINT barcode_entity_links_uniq DO NOTHING;

INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
SELECT lb.id, 'contract', lr.converted_contract_id, 'converted_to_contract'
FROM public.lead_requests lr
JOIN public.barcode_registry lb ON lb.entity_type='lead' AND lb.entity_id=lr.id AND lb.status='active'
JOIN public.barcode_registry cb ON cb.entity_type='contract' AND cb.entity_id=lr.converted_contract_id AND cb.status='active'
WHERE lr.converted_contract_id IS NOT NULL
ON CONFLICT ON CONSTRAINT barcode_entity_links_uniq DO NOTHING;

-- 4) Auto-create barcode + safe links on lead insert
CREATE OR REPLACE FUNCTION public.tg_lead_requests_create_barcode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res jsonb;
  v_bid uuid;
BEGIN
  BEGIN
    v_res := public.create_barcode_for_entity(
      'lead', NEW.id, NULL, NULL, NEW.business_id, 'private', 'lead_insert',
      jsonb_build_object(
        'source','lead_insert',
        'lead_status', NEW.status,
        'initiated_by', NEW.initiated_by,
        'source_site_id_present', NEW.source_site_id IS NOT NULL,
        'converted_contract_id_present', NEW.converted_contract_id IS NOT NULL
      )
    );
    v_bid := (v_res->>'barcode_id')::uuid;

    IF NEW.source_site_id IS NOT NULL THEN
      INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
      SELECT v_bid, 'client_site', NEW.source_site_id, 'submitted_from_site'
      WHERE EXISTS (SELECT 1 FROM public.barcode_registry WHERE entity_type='client_site' AND entity_id=NEW.source_site_id AND status='active')
      ON CONFLICT ON CONSTRAINT barcode_entity_links_uniq DO NOTHING;
    END IF;

    IF NEW.business_id IS NOT NULL THEN
      INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
      SELECT v_bid, 'business', NEW.business_id, 'assigned_to_provider'
      WHERE EXISTS (SELECT 1 FROM public.barcode_registry WHERE entity_type='business' AND entity_id=NEW.business_id AND status='active')
      ON CONFLICT ON CONSTRAINT barcode_entity_links_uniq DO NOTHING;
    END IF;

    IF NEW.converted_contract_id IS NOT NULL THEN
      INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
      SELECT v_bid, 'contract', NEW.converted_contract_id, 'converted_to_contract'
      WHERE EXISTS (SELECT 1 FROM public.barcode_registry WHERE entity_type='contract' AND entity_id=NEW.converted_contract_id AND status='active')
      ON CONFLICT ON CONSTRAINT barcode_entity_links_uniq DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'tg_lead_requests_create_barcode failed for lead %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_lead_requests_create_barcode ON public.lead_requests;
CREATE TRIGGER tg_lead_requests_create_barcode
AFTER INSERT ON public.lead_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_requests_create_barcode();

-- 5) Auto-link lead → contract on conversion update
CREATE OR REPLACE FUNCTION public.tg_lead_requests_link_converted_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_bid uuid;
  v_contract_bid uuid;
BEGIN
  IF NEW.converted_contract_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP='UPDATE' AND NEW.converted_contract_id IS NOT DISTINCT FROM OLD.converted_contract_id THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT id INTO v_lead_bid FROM public.barcode_registry
    WHERE entity_type='lead' AND entity_id=NEW.id AND status='active' LIMIT 1;
    SELECT id INTO v_contract_bid FROM public.barcode_registry
    WHERE entity_type='contract' AND entity_id=NEW.converted_contract_id AND status='active' LIMIT 1;

    IF v_lead_bid IS NOT NULL AND v_contract_bid IS NOT NULL THEN
      INSERT INTO public.barcode_entity_links (barcode_id, linked_entity_type, linked_entity_id, relationship_type)
      VALUES (v_lead_bid, 'contract', NEW.converted_contract_id, 'converted_to_contract')
      ON CONFLICT ON CONSTRAINT barcode_entity_links_uniq DO NOTHING;

      INSERT INTO public.barcode_events (barcode_id, event_type, actor_role, metadata)
      VALUES (v_lead_bid, 'linked_to_contract', 'system',
              jsonb_build_object('source','lead_conversion_update'));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'tg_lead_requests_link_converted_contract failed for lead %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_lead_requests_link_converted_contract ON public.lead_requests;
CREATE TRIGGER tg_lead_requests_link_converted_contract
AFTER UPDATE OF converted_contract_id ON public.lead_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_lead_requests_link_converted_contract();
