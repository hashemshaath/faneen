
-- Fix the overly permissive DELETE policy on newsletter_subscribers
DROP POLICY IF EXISTS "Anyone can unsubscribe by email" ON public.newsletter_subscribers;

-- Instead of DELETE, allow public to UPDATE is_active to false (soft-delete)
CREATE POLICY "Anyone can unsubscribe"
ON public.newsletter_subscribers FOR UPDATE
TO public
USING (true)
WITH CHECK (is_active = false);
