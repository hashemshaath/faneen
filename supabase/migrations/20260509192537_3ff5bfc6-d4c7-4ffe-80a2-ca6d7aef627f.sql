-- Phase 2: Messaging enrichment
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT now();

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_pinned_by_p1 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned_by_p2 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived_by_p1 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived_by_p2 boolean NOT NULL DEFAULT false;

-- Backfill read_at where is_read is true
UPDATE public.messages SET read_at = created_at WHERE is_read = true AND read_at IS NULL;

-- Trigger to auto-set read_at when is_read flips to true
CREATE OR REPLACE FUNCTION public.fn_message_set_read_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_read = true AND (OLD.is_read IS DISTINCT FROM true) AND NEW.read_at IS NULL THEN
    NEW.read_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_set_read_at ON public.messages;
CREATE TRIGGER trg_message_set_read_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.fn_message_set_read_at();

-- Index for unread queries
CREATE INDEX IF NOT EXISTS idx_messages_conv_unread
  ON public.messages (conversation_id) WHERE is_read = false;

REVOKE EXECUTE ON FUNCTION public.fn_message_set_read_at() FROM PUBLIC, anon, authenticated;