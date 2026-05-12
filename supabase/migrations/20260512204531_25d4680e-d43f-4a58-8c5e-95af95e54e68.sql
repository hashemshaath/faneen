-- Deduplicate any existing rows before adding the unique constraint
DELETE FROM public.badge_conversions a
USING public.badge_conversions b
WHERE a.ctid < b.ctid
  AND a.session_token = b.session_token
  AND a.event_type = b.event_type;

ALTER TABLE public.badge_conversions
ADD CONSTRAINT badge_conversions_session_event_unique
UNIQUE (session_token, event_type);