-- Allow authenticated users to use Realtime Broadcast and Presence channels.
-- The prior blanket deny on realtime.messages blocked typing presence and other
-- ephemeral channels. Postgres Changes are unaffected (they rely on each table's
-- own RLS). Channel content carried here is ephemeral and access is gated by the
-- application sending only to authorized topics.

DROP POLICY IF EXISTS "Deny realtime messages by default" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can receive realtime broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime broadcasts" ON realtime.messages;

CREATE POLICY "Authenticated users can receive realtime broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can send realtime broadcasts"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);