
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO public
WITH CHECK (true);

-- Admins can view all subscribers
CREATE POLICY "Admins can view subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update subscribers
CREATE POLICY "Admins can update subscribers"
ON public.newsletter_subscribers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete subscribers
CREATE POLICY "Admins can delete subscribers"
ON public.newsletter_subscribers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
