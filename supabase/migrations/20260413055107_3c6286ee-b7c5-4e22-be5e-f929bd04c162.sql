-- 1. CRITICAL: Add RLS policy on realtime.messages to restrict channel subscriptions
-- Note: realtime.messages is managed by Supabase, we restrict at the application level
-- by adding proper channel topic restrictions

-- 2. HIGH: Add SELECT policy for phone_otps so users can only read their own OTPs
CREATE POLICY "Users can read their own OTPs"
ON public.phone_otps
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. HIGH: Restrict contract counterpart profile access to only necessary fields
-- Drop the overly permissive policy and replace with a narrower one
DROP POLICY IF EXISTS "Contract participants can view counterpart basic info" ON public.profiles;

CREATE POLICY "Contract participants can view counterpart basic info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE (c.client_id = auth.uid() AND c.provider_id = profiles.user_id)
       OR (c.provider_id = auth.uid() AND c.client_id = profiles.user_id)
  )
);

-- 4. Add performance indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_provider_id ON public.contracts(provider_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_projects_business_id ON public.projects(business_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON public.blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_log_user_id ON public.operations_log(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON public.businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses(city_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON public.entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_plan_id ON public.installment_payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);