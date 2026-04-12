
-- Add missing UPDATE policy for blog_drafts
CREATE POLICY "Users can update own drafts"
ON public.blog_drafts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
