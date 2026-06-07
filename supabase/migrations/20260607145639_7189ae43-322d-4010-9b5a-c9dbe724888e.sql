-- Phase 18h — Stop writing to legacy `businesses.sub_services` / `businesses.sectors`
-- from runtime RPCs, then drop the columns that have no remaining runtime
-- reads or view dependencies.
--
-- Scope (safe drops only):
--   - businesses.sectors        (no FK, no view dep, no runtime reads)
--   - businesses.sub_services   (no FK, no view dep, after RPC cleanup below)
--   - projects.category_id      (FK to categories dropped via CASCADE; no runtime reads)
--
-- NOT dropped (runtime/view blockers — kept intentionally):
--   - businesses.category_id        — used by view `businesses_public` and
--                                     `category_public_counts` (SearchFilters,
--                                     Categories page consume it at runtime).
--   - business_services.category_id — used by view `category_public_counts`.
--   - categories, tags, entity_tags — runtime + FK dependencies remain.
--   - showcase_submissions.sector_slug, quote_requests.sector — out of scope.

-- ──────────────────────────────────────────────────────────────────────────
-- 1) RPC: add_business_sub_service
--    Old behavior wrote to `businesses.sub_services` array.
--    New behavior manages `business_services` only (idempotent upsert).
--    Signature preserved so DashboardServices does not need to change.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_business_sub_service(
  p_business_id uuid,
  p_sub_service_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.businesses WHERE id = p_business_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_sub_service_id IS NULL OR length(trim(p_sub_service_id)) = 0 THEN
    RAISE EXCEPTION 'sub_service_id required';
  END IF;

  -- Phase 18h: legacy `businesses.sub_services` write removed.
  -- Manage `business_services` only. Idempotent: skip if a row already
  -- exists for this (business, source_sub_service_id). Names are stored
  -- as the catalog id placeholder; the UI resolves display names from the
  -- static onboarding catalog.
  INSERT INTO public.business_services (
    business_id, source_sub_service_id,
    name_ar, name_en, is_active, sort_order, currency_code
  )
  SELECT
    p_business_id, p_sub_service_id,
    p_sub_service_id, p_sub_service_id,
    true,
    (SELECT coalesce(max(sort_order), 0) + 1
       FROM public.business_services WHERE business_id = p_business_id),
    'SAR'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.business_services
     WHERE business_id = p_business_id
       AND source_sub_service_id = p_sub_service_id
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 2) RPC: remove_business_sub_service
--    Drops the UPDATE businesses line. Keeps the business_services delete.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.remove_business_sub_service(
  p_business_id uuid,
  p_sub_service_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.businesses WHERE id = p_business_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Phase 18h: legacy `businesses.sub_services` write removed.
  DELETE FROM public.business_services
   WHERE business_id = p_business_id
     AND source_sub_service_id = p_sub_service_id;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3) RPC: approve_service_addition_request
--    Stop writing to businesses.sub_services / businesses.sectors.
--    Keep the business_services insert and the request bookkeeping.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_service_addition_request(
  p_request_id uuid,
  p_admin_note text DEFAULT NULL::text
)
RETURNS service_addition_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.service_addition_requests;
  v_sub_id text;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_req FROM public.service_addition_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request already %', v_req.status; END IF;

  v_sub_id := 'custom:' || replace(gen_random_uuid()::text, '-', '');

  -- Phase 18h: legacy `businesses.sub_services` / `businesses.sectors`
  -- writes removed. Create only the matching business_services row.
  INSERT INTO public.business_services(business_id, name_ar, name_en, source_sub_service_id, is_active, sort_order)
  VALUES (
    v_req.business_id,
    v_req.name_ar,
    coalesce(v_req.name_en, v_req.name_ar),
    v_sub_id,
    true,
    (SELECT coalesce(max(sort_order), 0) + 1 FROM public.business_services WHERE business_id = v_req.business_id)
  );

  -- Close the help ticket if any
  IF v_req.ticket_ref_id IS NOT NULL THEN
    UPDATE public.help_feature_requests
       SET status = 'completed',
           updated_at = now()
     WHERE ref_id = v_req.ticket_ref_id
       AND status::text <> 'completed';
  END IF;

  UPDATE public.service_addition_requests
     SET status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         approved_sub_service_id = v_sub_id,
         reject_reason = NULLIF(p_admin_note, '')
   WHERE id = p_request_id
   RETURNING * INTO v_req;

  RETURN v_req;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 4) Partial safe drops — legacy columns with zero remaining runtime reads.
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.businesses DROP COLUMN IF EXISTS sectors;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS sub_services;
ALTER TABLE public.projects   DROP COLUMN IF EXISTS category_id;