-- T1.1 — Rental customer request path.
-- Additive-only: extends rental_order_status enum with pending_provider_review + declined,
-- and adds delivery + request fields on rental_orders. RLS is already customer-friendly
-- (INSERT allows customer_user_id = auth.uid(); SELECT/UPDATE include the same predicate)
-- so no policy changes are needed here.

-- 1. Extend the enum (idempotent via IF NOT EXISTS).
ALTER TYPE public.rental_order_status ADD VALUE IF NOT EXISTS 'pending_provider_review';
ALTER TYPE public.rental_order_status ADD VALUE IF NOT EXISTS 'declined';

-- 2. Add delivery + request fields.
ALTER TABLE public.rental_orders
  ADD COLUMN IF NOT EXISTS delivery_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric,
  ADD COLUMN IF NOT EXISTS delivery_city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_address_text text,
  ADD COLUMN IF NOT EXISTS request_notes text,
  ADD COLUMN IF NOT EXISTS decline_reason text;

-- 3. Add a supporting index for the customer's "my rentals" list.
CREATE INDEX IF NOT EXISTS idx_rental_orders_customer_user_id
  ON public.rental_orders (customer_user_id, created_at DESC)
  WHERE customer_user_id IS NOT NULL;

-- 4. Small helper index for the provider's "new requests" tab.
CREATE INDEX IF NOT EXISTS idx_rental_orders_provider_status
  ON public.rental_orders (provider_business_id, status, created_at DESC);