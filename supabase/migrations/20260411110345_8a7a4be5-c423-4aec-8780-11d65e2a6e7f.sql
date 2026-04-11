-- Allow providers to also create contracts
CREATE POLICY "Providers can create contracts"
ON public.contracts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = provider_id);
