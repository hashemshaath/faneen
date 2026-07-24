
-- Fix 1: customer_tracking_links — revoke table/column SELECT so token_hash is unreachable from client.
-- Grant SELECT on all columns except token_hash to authenticated. anon has no legitimate need.
REVOKE SELECT ON public.customer_tracking_links FROM anon, authenticated, PUBLIC;

DO $$
DECLARE
  col_list text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO col_list
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name='customer_tracking_links'
    AND column_name <> 'token_hash';
  EXECUTE format('GRANT SELECT (%s) ON public.customer_tracking_links TO authenticated', col_list);
END $$;

-- Fix 2: business_qa — prevent authenticated users from spoofing asker_user_id.
DROP POLICY IF EXISTS "Anyone asks question" ON public.business_qa;
CREATE POLICY "Anyone asks question"
  ON public.business_qa
  FOR INSERT
  WITH CHECK (
    answer IS NULL
    AND is_published = false
    AND (asker_user_id IS NULL OR asker_user_id = auth.uid())
  );
