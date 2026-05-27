-- HARDENING: explicit column-level revokes on anon (defense-in-depth)
-- Even when no table-level SELECT exists on anon today, these revokes guarantee
-- that any future blanket GRANT cannot accidentally expose these PII columns.
DO $$
BEGIN
  -- businesses sensitive columns
  EXECUTE 'REVOKE SELECT (national_id, cr_owner_name, cr_scan_raw, cr_scan_data, cr_document_url, account_manager_name, account_manager_email, account_manager_phone, approval_notes, vat_number) ON public.businesses FROM anon';
EXCEPTION WHEN undefined_column THEN
  -- Soft-fail if a column was renamed in the future; other columns still get revoked above.
  RAISE NOTICE 'businesses: one or more sensitive columns missing; partial revoke applied';
END $$;

DO $$
BEGIN
  -- business_branches sensitive contact columns
  EXECUTE 'REVOKE SELECT (email, phone, mobile, customer_service_phone, contact_person) ON public.business_branches FROM anon';
EXCEPTION WHEN undefined_column THEN
  RAISE NOTICE 'business_branches: one or more sensitive columns missing; partial revoke applied';
END $$;

-- HARDENING: remove sensitive tables from the realtime publication so row-change
-- events are not broadcast to every authenticated subscriber. Standard query
-- access (subject to RLS) remains unchanged.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'contract_amendments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.contract_amendments';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'email_deliverability_alerts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.email_deliverability_alerts';
  END IF;
END $$;