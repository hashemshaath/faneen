
-- RENTAL-ASSET-INTEGRATION-1
-- Order-level asset assignments + availability/sync/ops RPCs + observability.

-- 1) Ref sequence for assignment refs
CREATE SEQUENCE IF NOT EXISTS public.seq_arasn START 1000000;

-- 2) Status enum for assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_rental_assignment_status') THEN
    CREATE TYPE public.asset_rental_assignment_status AS ENUM ('reserved','active','returned','cancelled');
  END IF;
END $$;

-- 3) Order-level link table
CREATE TABLE IF NOT EXISTS public.asset_rental_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text NOT NULL UNIQUE DEFAULT generate_ref_id('ARASN','seq_arasn'),
  rental_order_id uuid NOT NULL REFERENCES public.rental_orders(id) ON DELETE CASCADE,
  rental_item_id uuid NOT NULL REFERENCES public.rental_items(id) ON DELETE RESTRICT,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.asset_rental_assignment_status NOT NULL DEFAULT 'reserved',
  post_rental_inspection_required boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arasn_order ON public.asset_rental_assignments(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_arasn_asset ON public.asset_rental_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_arasn_status ON public.asset_rental_assignments(status);
CREATE INDEX IF NOT EXISTS idx_arasn_dates ON public.asset_rental_assignments(start_date, end_date);

-- Validation trigger: end >= start, quantity > 0
CREATE OR REPLACE FUNCTION public.arasn_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be >= start_date';
  END IF;
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'quantity must be > 0';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_arasn_validate ON public.asset_rental_assignments;
CREATE TRIGGER trg_arasn_validate
BEFORE INSERT OR UPDATE ON public.asset_rental_assignments
FOR EACH ROW EXECUTE FUNCTION public.arasn_validate();

-- 4) GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_rental_assignments TO authenticated;
GRANT ALL ON public.asset_rental_assignments TO service_role;
GRANT USAGE ON SEQUENCE public.seq_arasn TO authenticated, service_role;

-- 5) RLS — provider must own asset AND the rental order; admin all
ALTER TABLE public.asset_rental_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arasn admin all"
ON public.asset_rental_assignments FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "arasn provider read"
ON public.asset_rental_assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assets a
    JOIN public.businesses b ON b.id = a.owner_business_id
    WHERE a.id = asset_rental_assignments.asset_id AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.rental_orders ro
    JOIN public.businesses b ON b.id = ro.provider_business_id
    WHERE ro.id = asset_rental_assignments.rental_order_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "arasn provider write"
ON public.asset_rental_assignments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assets a
    JOIN public.businesses b ON b.id = a.owner_business_id
    WHERE a.id = asset_id AND b.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.rental_orders ro
    JOIN public.businesses b ON b.id = ro.provider_business_id
    WHERE ro.id = rental_order_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "arasn provider update"
ON public.asset_rental_assignments FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assets a
    JOIN public.businesses b ON b.id = a.owner_business_id
    WHERE a.id = asset_rental_assignments.asset_id AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assets a
    JOIN public.businesses b ON b.id = a.owner_business_id
    WHERE a.id = asset_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "arasn provider delete"
ON public.asset_rental_assignments FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assets a
    JOIN public.businesses b ON b.id = a.owner_business_id
    WHERE a.id = asset_rental_assignments.asset_id AND b.user_id = auth.uid()
  )
);

-- 6) Availability checker RPC
CREATE OR REPLACE FUNCTION public.asset_rental_check_availability(
  _asset_id uuid,
  _start date,
  _end date,
  _ignore_assignment uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset assets%ROWTYPE;
  v_conflict_ref text;
  v_next_avail date;
BEGIN
  SELECT * INTO v_asset FROM public.assets WHERE id = _asset_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('available',false,'reason','asset_not_found');
  END IF;
  IF v_asset.status = 'retired' THEN
    RETURN jsonb_build_object('available',false,'reason','asset_retired','asset_ref',v_asset.ref_id);
  END IF;
  IF v_asset.status = 'maintenance' THEN
    RETURN jsonb_build_object('available',false,'reason','asset_in_maintenance','asset_ref',v_asset.ref_id);
  END IF;
  IF v_asset.status = 'inspection' THEN
    RETURN jsonb_build_object('available',false,'reason','asset_in_inspection','asset_ref',v_asset.ref_id);
  END IF;
  IF NOT COALESCE(v_asset.is_active, true) THEN
    RETURN jsonb_build_object('available',false,'reason','asset_inactive','asset_ref',v_asset.ref_id);
  END IF;

  -- Overlap detection on active/reserved assignments
  SELECT ro.ref_id INTO v_conflict_ref
  FROM public.asset_rental_assignments arasn
  JOIN public.rental_orders ro ON ro.id = arasn.rental_order_id
  WHERE arasn.asset_id = _asset_id
    AND arasn.status IN ('reserved','active')
    AND (_ignore_assignment IS NULL OR arasn.id <> _ignore_assignment)
    AND arasn.start_date <= _end
    AND arasn.end_date   >= _start
  ORDER BY arasn.end_date DESC
  LIMIT 1;

  IF v_conflict_ref IS NOT NULL THEN
    SELECT (MAX(end_date) + 1) INTO v_next_avail
    FROM public.asset_rental_assignments
    WHERE asset_id = _asset_id AND status IN ('reserved','active');
    RETURN jsonb_build_object(
      'available',false,
      'reason','overlap_conflict',
      'asset_ref',v_asset.ref_id,
      'conflicting_rental_ref',v_conflict_ref,
      'next_available_date', v_next_avail
    );
  END IF;

  RETURN jsonb_build_object('available',true,'asset_ref',v_asset.ref_id);
END $$;

GRANT EXECUTE ON FUNCTION public.asset_rental_check_availability(uuid,date,date,uuid) TO authenticated, service_role;

-- 7) Status sync — called by trigger on rental_orders status change
CREATE OR REPLACE FUNCTION public.asset_rental_sync_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_asset_status text;
  v_new_link_status text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'active' THEN
      v_new_asset_status := 'rented';
      v_new_link_status := 'active';
    WHEN 'expiring_soon' THEN
      v_new_asset_status := NULL; -- keep rented
      v_new_link_status := 'active';
    WHEN 'expired' THEN
      v_new_asset_status := NULL; -- overdue handling in ops
      v_new_link_status := 'active';
    WHEN 'extended' THEN
      v_new_asset_status := 'rented';
      v_new_link_status := 'active';
    WHEN 'renewed' THEN
      v_new_asset_status := 'available';
      v_new_link_status := 'returned';
    WHEN 'closed' THEN
      v_new_asset_status := NULL; -- decide per assignment
      v_new_link_status := 'returned';
    WHEN 'cancelled' THEN
      v_new_asset_status := 'available';
      v_new_link_status := 'cancelled';
    ELSE
      RETURN NEW;
  END CASE;

  -- Update link statuses
  IF v_new_link_status IS NOT NULL THEN
    UPDATE public.asset_rental_assignments
       SET status = v_new_link_status::asset_rental_assignment_status
     WHERE rental_order_id = NEW.id
       AND status NOT IN ('returned','cancelled');
  END IF;

  -- Update asset statuses per assignment
  IF NEW.status = 'closed' THEN
    UPDATE public.assets a
       SET status = CASE WHEN arasn.post_rental_inspection_required
                         THEN 'inspection'::asset_status
                         ELSE 'available'::asset_status END
      FROM public.asset_rental_assignments arasn
     WHERE arasn.rental_order_id = NEW.id
       AND a.id = arasn.asset_id
       AND a.status = 'rented';
  ELSIF v_new_asset_status IS NOT NULL THEN
    UPDATE public.assets a
       SET status = v_new_asset_status::asset_status
      FROM public.asset_rental_assignments arasn
     WHERE arasn.rental_order_id = NEW.id
       AND a.id = arasn.asset_id
       AND (
         (v_new_asset_status = 'rented' AND a.status IN ('available','reserved'))
         OR (v_new_asset_status = 'available' AND a.status IN ('rented','reserved'))
       );
  END IF;

  -- Audit
  INSERT INTO public.cron_run_log(job_name, payload)
  VALUES (
    'asset_status_synced_from_rental',
    jsonb_build_object(
      'rental_order_ref', NEW.ref_id,
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- never block rental order updates; record failure
  INSERT INTO public.cron_run_log(job_name, payload)
  VALUES ('asset_rental_sync_failed', jsonb_build_object('rental_order_ref', NEW.ref_id, 'error', SQLERRM));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_asset_rental_sync ON public.rental_orders;
CREATE TRIGGER trg_asset_rental_sync
AFTER UPDATE OF status ON public.rental_orders
FOR EACH ROW EXECUTE FUNCTION public.asset_rental_sync_from_order();

-- 8) Ops mismatch RPC
CREATE OR REPLACE FUNCTION public.rental_asset_ops_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'orders_without_assets',(
      SELECT COUNT(*) FROM rental_orders ro
      WHERE ro.status IN ('active','expiring_soon','expired')
        AND NOT EXISTS (SELECT 1 FROM asset_rental_assignments a WHERE a.rental_order_id = ro.id)
    ),
    'orders_active_asset_not_rented',(
      SELECT COUNT(DISTINCT arasn.rental_order_id) FROM asset_rental_assignments arasn
      JOIN rental_orders ro ON ro.id = arasn.rental_order_id
      JOIN assets a ON a.id = arasn.asset_id
      WHERE ro.status = 'active' AND arasn.status = 'active' AND a.status <> 'rented'
    ),
    'orders_closed_asset_still_rented',(
      SELECT COUNT(DISTINCT arasn.rental_order_id) FROM asset_rental_assignments arasn
      JOIN rental_orders ro ON ro.id = arasn.rental_order_id
      JOIN assets a ON a.id = arasn.asset_id
      WHERE ro.status IN ('closed','cancelled') AND a.status = 'rented'
    ),
    'overdue_with_assets',(
      SELECT COUNT(DISTINCT arasn.rental_order_id) FROM asset_rental_assignments arasn
      JOIN rental_orders ro ON ro.id = arasn.rental_order_id
      WHERE ro.status = 'expired' AND arasn.status = 'active'
    ),
    'post_rental_inspections_pending',(
      SELECT COUNT(*) FROM assets a
      WHERE a.status = 'inspection'
        AND EXISTS (SELECT 1 FROM asset_rental_assignments arasn
                    WHERE arasn.asset_id = a.id AND arasn.status = 'returned')
    ),
    'overlapping_assignments',(
      SELECT COUNT(*) FROM (
        SELECT a1.id FROM asset_rental_assignments a1
        JOIN asset_rental_assignments a2
          ON a1.asset_id = a2.asset_id AND a1.id < a2.id
        WHERE a1.status IN ('reserved','active')
          AND a2.status IN ('reserved','active')
          AND a1.start_date <= a2.end_date
          AND a1.end_date   >= a2.start_date
      ) s
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.rental_asset_ops_counts() TO authenticated, service_role;

-- 9) Asset current rental info RPC (safe metadata only)
CREATE OR REPLACE FUNCTION public.asset_current_rental_info(_asset_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'current_rental_ref', ro.ref_id,
    'start_date', arasn.start_date,
    'end_date', arasn.end_date,
    'days_remaining', GREATEST(0, (arasn.end_date - CURRENT_DATE)),
    'overdue', (arasn.end_date < CURRENT_DATE AND arasn.status = 'active'),
    'link_status', arasn.status::text
  )
  FROM public.asset_rental_assignments arasn
  JOIN public.rental_orders ro ON ro.id = arasn.rental_order_id
  WHERE arasn.asset_id = _asset_id
    AND arasn.status IN ('reserved','active')
  ORDER BY arasn.end_date DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.asset_current_rental_info(uuid) TO authenticated, service_role;
