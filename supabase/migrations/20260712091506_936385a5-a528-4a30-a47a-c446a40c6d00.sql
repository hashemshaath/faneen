
-- business_staff: prevent managers from escalating role to 'owner'
DROP POLICY IF EXISTS "Business owner can add staff" ON public.business_staff;
CREATE POLICY "Business owner can add staff"
ON public.business_staff
FOR INSERT
WITH CHECK (
  public.is_business_owner_or_manager(auth.uid(), business_id)
  AND (
    role <> 'owner'
    OR public.is_business_owner(auth.uid(), business_id)
  )
);

DROP POLICY IF EXISTS "Business owner can update staff" ON public.business_staff;
CREATE POLICY "Business owner can update staff"
ON public.business_staff
FOR UPDATE
USING (public.is_business_owner_or_manager(auth.uid(), business_id))
WITH CHECK (
  public.is_business_owner_or_manager(auth.uid(), business_id)
  AND (
    role <> 'owner'
    OR public.is_business_owner(auth.uid(), business_id)
  )
);

-- membership_invite_keys: only true owner can mint owner-role invite keys
DROP POLICY IF EXISTS "Owners create invite keys" ON public.membership_invite_keys;
CREATE POLICY "Owners create invite keys"
ON public.membership_invite_keys
FOR INSERT
WITH CHECK (
  public.is_business_owner_or_manager(auth.uid(), business_id)
  AND created_by = auth.uid()
  AND (
    role <> 'owner'
    OR public.is_business_owner(auth.uid(), business_id)
  )
);

DROP POLICY IF EXISTS "Owners update their business invite keys" ON public.membership_invite_keys;
CREATE POLICY "Owners update their business invite keys"
ON public.membership_invite_keys
FOR UPDATE
USING (public.is_business_owner_or_manager(auth.uid(), business_id))
WITH CHECK (
  public.is_business_owner_or_manager(auth.uid(), business_id)
  AND (
    role <> 'owner'
    OR public.is_business_owner(auth.uid(), business_id)
  )
);
