
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON membership_subscriptions;

-- Recreate
CREATE POLICY "Users can view their own subscriptions"
ON membership_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
ON membership_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
ON membership_subscriptions FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));
