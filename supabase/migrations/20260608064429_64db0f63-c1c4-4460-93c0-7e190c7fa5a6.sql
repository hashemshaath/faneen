-- 1) Remove business_ownership_transfer_requests from Realtime publication
--    Realtime broadcast for this table is effectively disabled by the default-deny
--    policy on realtime.messages, so the publication has no effect. Removing it
--    avoids the misleading exposure surface.
ALTER PUBLICATION supabase_realtime DROP TABLE public.business_ownership_transfer_requests;

-- 2) Revoke column-level SELECT on image_assets.owner_user_id from anon/authenticated.
--    The public-read policy intentionally exposes asset metadata, but the owner's
--    user id should never be visible to clients.
REVOKE SELECT (owner_user_id) ON public.image_assets FROM anon;
REVOKE SELECT (owner_user_id) ON public.image_assets FROM authenticated;

-- 3) Harden provider_landing_settings: indexnow_key must never be reachable by
--    anon/authenticated even if a future permissive SELECT policy is added.
REVOKE SELECT (indexnow_key) ON public.provider_landing_settings FROM anon;
REVOKE SELECT (indexnow_key) ON public.provider_landing_settings FROM authenticated;