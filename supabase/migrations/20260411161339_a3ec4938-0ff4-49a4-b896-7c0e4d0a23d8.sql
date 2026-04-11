-- Allow contract participants to view each other's profiles
CREATE POLICY "Contract participants can view counterpart profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE (c.client_id = auth.uid() AND c.provider_id = profiles.user_id)
       OR (c.provider_id = auth.uid() AND c.client_id = profiles.user_id)
  )
);
