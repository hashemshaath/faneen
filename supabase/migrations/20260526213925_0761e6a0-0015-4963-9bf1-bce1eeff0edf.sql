ALTER TABLE public.businesses ALTER COLUMN ref_id SET NOT NULL;
ALTER TABLE public.business_staff ALTER COLUMN ref_id SET NOT NULL;
ALTER TABLE public.provider_subscriptions ALTER COLUMN ref_id SET NOT NULL;