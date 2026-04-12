
-- ============================================================
-- 1. FIX BUSINESS PII EXPOSURE
--    Replace public SELECT on businesses with owner/staff/admin only
--    Public access goes through businesses_public view
-- ============================================================
DROP POLICY IF EXISTS "Active businesses are viewable by everyone" ON public.businesses;

CREATE POLICY "Owner or staff can view their business"
  ON public.businesses FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_business_staff(auth.uid(), id)
    OR has_admin_access(auth.uid())
  );

-- Allow anon/public read via the secure view (already exists: businesses_public)
-- The view uses SECURITY INVOKER so it respects caller permissions
-- We need a policy that allows the view to work for anon users on non-sensitive fields
CREATE POLICY "Public can view active businesses via view"
  ON public.businesses FOR SELECT
  USING (is_active = true AND current_setting('role', true) = 'anon');

-- ============================================================
-- 2. FIX BUSINESS BRANCHES PII EXPOSURE
-- ============================================================
DROP POLICY IF EXISTS "Public can view active branch basic info" ON public.business_branches;

CREATE POLICY "Public can view active branches via view"
  ON public.business_branches FOR SELECT
  USING (is_active = true AND current_setting('role', true) = 'anon');

-- ============================================================
-- 3. FIX MEMBERSHIP SELF-UPGRADE
--    Remove user INSERT policies — subscriptions only via RPC
-- ============================================================
DROP POLICY IF EXISTS "Users can create own subscriptions" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.membership_subscriptions;

-- Keep user UPDATE restricted to cancellation only
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.membership_subscriptions;
CREATE POLICY "Users can cancel own subscriptions"
  ON public.membership_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- ============================================================
-- 4. FIX FUNCTION SEARCH_PATH (4 email queue functions)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- ============================================================
-- 5. CLEANUP DUPLICATE RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.membership_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.membership_subscriptions;
