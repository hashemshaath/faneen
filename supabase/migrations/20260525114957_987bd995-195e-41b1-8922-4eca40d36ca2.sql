
CREATE OR REPLACE FUNCTION public.lookup_by_reference(_ref text)
RETURNS TABLE(entity_type text, table_name text, id uuid, ref_id text, legacy_ref_id text, canonical_route text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref     text := upper(btrim(coalesce(_ref,'')));
  v_prefix  text;
  v_uuid    uuid;
  v_is_admin boolean := public.has_role(auth.uid(),'admin')
                     OR public.has_role(auth.uid(),'super_admin');
BEGIN
  IF v_ref = '' THEN RETURN; END IF;

  v_prefix := split_part(v_ref, '-', 1);

  -- businesses (ENT / BIZ) — public canonical profile route
  IF v_prefix IN ('ENT','BIZ') THEN
    RETURN QUERY
      SELECT 'business'::text, 'businesses'::text, b.id, b.ref_id, b.legacy_ref_id,
             ('/' || COALESCE(b.username, b.id::text))::text
      FROM public.businesses b
      WHERE upper(b.ref_id) = v_ref OR upper(coalesce(b.legacy_ref_id,'')) = v_ref;
    RETURN;
  END IF;

  -- contracts (CNT) — protected detail route enforces auth at destination
  IF v_prefix = 'CNT' THEN
    RETURN QUERY
      SELECT 'contract'::text, 'contracts'::text, c.id, c.ref_id, NULL::text,
             ('/contracts/' || c.id::text)::text
      FROM public.contracts c WHERE upper(c.ref_id) = v_ref;
    RETURN;
  END IF;

  -- leads (LED / LR) — provider lead detail route
  IF v_prefix IN ('LED','LR') THEN
    RETURN QUERY
      SELECT 'lead'::text, 'lead_requests'::text, l.id, l.ref_id, l.legacy_ref_id,
             ('/dashboard/provider/leads/' || l.id::text)::text
      FROM public.lead_requests l
      WHERE upper(l.ref_id) = v_ref OR upper(coalesce(l.legacy_ref_id,'')) = v_ref;
    RETURN;
  END IF;

  -- quote requests (QTE) — my-requests detail route
  IF v_prefix = 'QTE' THEN
    RETURN QUERY
      SELECT 'quote_request'::text, 'quote_requests'::text, q.id, q.ref_id, NULL::text,
             ('/dashboard/my-requests/' || q.id::text)::text
      FROM public.quote_requests q WHERE upper(q.ref_id) = v_ref;
    RETURN;
  END IF;

  -- bookings (BKG / BK) — no detail route in app; land on list
  IF v_prefix IN ('BKG','BK') THEN
    RETURN QUERY
      SELECT 'booking'::text, 'bookings'::text, bk.id, bk.ref_id, bk.legacy_ref_id,
             '/dashboard/bookings'::text
      FROM public.bookings bk
      WHERE upper(bk.ref_id) = v_ref OR upper(coalesce(bk.legacy_ref_id,'')) = v_ref;
    RETURN;
  END IF;

  -- membership payment intents (PAY) — invoice page for finalized payments
  IF v_prefix = 'PAY' THEN
    RETURN QUERY
      SELECT 'payment_intent'::text, 'membership_payment_intents'::text,
             p.id, p.ref_id, NULL::text,
             CASE
               WHEN lower(coalesce(p.status,'')) IN ('succeeded','refunded')
                 THEN '/membership/payments/' || p.id::text || '/invoice'
               ELSE '/membership'
             END::text
      FROM public.membership_payment_intents p WHERE upper(p.ref_id) = v_ref;
    RETURN;
  END IF;

  -- staff invitations (STI) — admin-only; destination is business edit page
  IF v_prefix = 'STI' THEN
    IF v_is_admin THEN
      RETURN QUERY
        SELECT 'staff_invitation'::text, 'business_staff_invitations'::text,
               si.id, si.ref_id, NULL::text,
               '/dashboard/business-edit'::text
        FROM public.business_staff_invitations si WHERE upper(si.ref_id) = v_ref;
    END IF;
    RETURN;
  END IF;

  -- provider subscriptions (PVS) — admin-only; no public destination
  IF v_prefix = 'PVS' THEN
    IF v_is_admin THEN
      RETURN QUERY
        SELECT 'provider_subscription'::text, 'provider_subscriptions'::text,
               ps.id, ps.ref_id, NULL::text,
               NULL::text
        FROM public.provider_subscriptions ps WHERE upper(ps.ref_id) = v_ref;
    END IF;
    RETURN;
  END IF;

  -- UUID admin fallback — admin-only; resolves to business profile
  IF v_is_admin AND v_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN v_uuid := v_ref::uuid; EXCEPTION WHEN others THEN RETURN; END;
    RETURN QUERY
      SELECT 'business'::text, 'businesses'::text, b.id, b.ref_id, b.legacy_ref_id,
             ('/' || COALESCE(b.username, b.id::text))::text
      FROM public.businesses b WHERE b.id = v_uuid;
    RETURN;
  END IF;
END;
$function$;
