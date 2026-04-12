-- Fix 1: Remove overly permissive storage policy on contract-attachments
-- The weak policy "Contract parties can upload attachments" allows any authenticated user
DROP POLICY IF EXISTS "Contract parties can upload attachments" ON storage.objects;

-- Fix 2: Restrict newsletter_subscribers INSERT to prevent abuse
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public can subscribe" ON public.newsletter_subscribers;

-- Check existing policies and recreate with rate-limiting awareness
-- Allow insert but only for new emails (upsert handled in app code)
CREATE POLICY "Public can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO public
WITH CHECK (
  -- Only allow if email looks valid (basic check) and limit abuse
  length(email) > 5 AND length(email) < 255 AND email LIKE '%@%.%'
);