
-- Conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  last_message_text text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_conversations_p1 ON public.conversations(participant_1);
CREATE INDEX idx_conversations_p2 ON public.conversations(participant_2);

CREATE POLICY "Participants can view their conversations"
ON public.conversations FOR SELECT TO authenticated
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Participants can update their conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type varchar NOT NULL DEFAULT 'text',
  attachment_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

CREATE POLICY "Participants can view messages in their conversations"
ON public.messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.id = messages.conversation_id
  AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
));

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

CREATE POLICY "Participants can update message read status"
ON public.messages FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations c
  WHERE c.id = messages.conversation_id
  AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Trigger: update conversation last_message and notify recipient
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _conv conversations%ROWTYPE;
  _recipient uuid;
  _sender_name text;
BEGIN
  SELECT * INTO _conv FROM conversations WHERE id = NEW.conversation_id;
  
  -- Update conversation
  UPDATE conversations SET
    last_message_text = LEFT(NEW.content, 100),
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  -- Determine recipient
  IF _conv.participant_1 = NEW.sender_id THEN
    _recipient := _conv.participant_2;
  ELSE
    _recipient := _conv.participant_1;
  END IF;
  
  -- Get sender name
  SELECT COALESCE(full_name, 'مستخدم') INTO _sender_name
  FROM profiles WHERE user_id = NEW.sender_id LIMIT 1;
  
  -- Create notification for recipient
  PERFORM create_notification(
    _recipient,
    'رسالة جديدة من ' || _sender_name,
    'New message from ' || _sender_name,
    LEFT(NEW.content, 150),
    LEFT(NEW.content, 150),
    'message',
    NEW.conversation_id,
    'conversation',
    '/dashboard/messages'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();
