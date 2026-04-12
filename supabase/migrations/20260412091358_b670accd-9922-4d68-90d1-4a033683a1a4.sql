CREATE INDEX IF NOT EXISTS idx_businesses_category_id ON public.businesses USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses USING btree (city_id);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON public.businesses USING btree (is_active);