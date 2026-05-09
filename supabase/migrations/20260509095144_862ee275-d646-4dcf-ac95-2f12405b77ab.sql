DROP POLICY IF EXISTS "Anyone can insert interactions" ON public.provider_interactions;

CREATE POLICY "Anyone can insert interactions"
ON public.provider_interactions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  ((user_id IS NULL) OR (user_id = auth.uid()))
  AND (event_type = ANY (ARRAY[
    'view'::text,
    'contact_click'::text,
    'phone_click'::text,
    'whatsapp_click'::text,
    'website_click'::text,
    'share'::text,
    'save'::text,
    'unsave'::text,
    'section_view'::text,
    'card_click'::text,
    'view_all_click'::text
  ]))
);