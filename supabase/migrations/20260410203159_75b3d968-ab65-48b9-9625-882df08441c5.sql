
CREATE SEQUENCE IF NOT EXISTS public.seq_business_number START WITH 1000;

SELECT setval('public.seq_business_number', COALESCE((SELECT MAX(business_number) FROM public.businesses), 999));

ALTER TABLE public.businesses ALTER COLUMN business_number SET DEFAULT nextval('public.seq_business_number');
