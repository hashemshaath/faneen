-- ============================================================
-- private_sectors: route anon strictly through the safe view
-- ============================================================
-- Drop the public-read RLS that previously exposed PII columns.
DROP POLICY IF EXISTS ps_public_read_approved ON public.private_sectors;

-- Revoke ALL table-level privileges from anon (they had arwdDxtm by legacy
-- default). Anon must use the safe view going forward.
REVOKE ALL ON public.private_sectors FROM anon;

-- Switch the public view to SECURITY DEFINER so anon can read approved
-- non-PII columns through it even with the base table locked down.
ALTER VIEW public.private_sectors_public SET (security_invoker = false);
GRANT SELECT ON public.private_sectors_public TO anon, authenticated;

-- ============================================================
-- lead_requests: column-level lockdown of internal_notes
-- ============================================================
-- Postgres column-level REVOKE is only effective when no broader table-level
-- SELECT grant is present, so revoke table SELECT and re-grant explicit
-- columns (everything except internal_notes).
REVOKE SELECT ON public.lead_requests FROM anon, authenticated;
GRANT SELECT (
  id, business_id, user_id, name, email, phone, subject, message,
  budget_range, project_scope, contact_preference, status, priority, source,
  responded_at, responded_by, created_at, updated_at, ref_id, viewed_at,
  accepted_at, rejected_at, needs_info_at, closed_at, cancelled_at,
  conversation_id, quoted_at, quoted_by, quote_amount, quote_currency,
  quote_note, quote_valid_until, converted_contract_id, converted_at,
  converted_by, is_demo, source_site_id, initiated_by, site_access_grant_id,
  country_id, legacy_ref_id, source_entity_id, target_entity_id, location_id,
  phone_country_code, phone_national
) ON public.lead_requests TO authenticated;
-- service_role keeps full ALL privileges (untouched) for admin/edge tooling.