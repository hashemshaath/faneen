
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public contact form)
CREATE POLICY "Anyone can submit contact message"
ON public.contact_messages FOR INSERT
WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all contact messages"
ON public.contact_messages FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Admins can update status
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages FOR UPDATE
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Logged-in users can view their own
CREATE POLICY "Users can view own contact messages"
ON public.contact_messages FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_contact_messages_updated_at
BEFORE UPDATE ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
