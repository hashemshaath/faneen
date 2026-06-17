
-- Security definer function to authorize realtime topics
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _conv_id uuid;
  _suffix text;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  -- Private conversation channels: only participants may subscribe/broadcast
  IF _topic LIKE 'typing:%' OR _topic LIKE 'conversation:%' THEN
    _suffix := split_part(_topic, ':', 2);
    BEGIN
      _conv_id := _suffix::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = _conv_id
        AND (c.participant_1 = _uid OR c.participant_2 = _uid)
    );
  END IF;

  -- All other topics are allowed for authenticated users; row-level
  -- visibility of postgres_changes payloads is still enforced by the
  -- source tables' own RLS policies.
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_realtime_topic(text) TO authenticated;

-- Replace the permissive realtime.messages policies
DROP POLICY IF EXISTS "Authenticated users can receive realtime broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime broadcasts" ON realtime.messages;

CREATE POLICY "Authenticated can receive authorized realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.can_access_realtime_topic((realtime.topic())::text));

CREATE POLICY "Authenticated can broadcast on authorized realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_realtime_topic((realtime.topic())::text));
