-- Fix 1: Restrict admin_identity_tokens SELECT to admins only
DROP POLICY IF EXISTS authenticated_read_identity_tokens ON public.admin_identity_tokens;

CREATE POLICY admin_read_identity_tokens
ON public.admin_identity_tokens
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Restrict directory_sync_events to authenticated, and remove from Realtime publication
DROP POLICY IF EXISTS "Public can read directory sync events" ON public.directory_sync_events;

CREATE POLICY "Authenticated can read directory sync events"
ON public.directory_sync_events
FOR SELECT
TO authenticated
USING (true);

ALTER PUBLICATION supabase_realtime DROP TABLE public.directory_sync_events;