
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS replied_by uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contact_messages_priority_check') THEN
    ALTER TABLE public.contact_messages
      ADD CONSTRAINT contact_messages_priority_check
      CHECK (priority IN ('low','normal','high','urgent'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created ON public.contact_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_priority ON public.contact_messages(priority);
CREATE INDEX IF NOT EXISTS idx_contact_messages_starred ON public.contact_messages(starred) WHERE starred = true;

CREATE OR REPLACE FUNCTION public.set_contact_message_replied()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'replied' AND (OLD.status IS DISTINCT FROM 'replied') THEN
    NEW.replied_at := now();
    NEW.replied_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_contact_messages_replied ON public.contact_messages;
CREATE TRIGGER trg_contact_messages_replied
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_contact_message_replied();

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.contact_messages REPLICA IDENTITY FULL;
