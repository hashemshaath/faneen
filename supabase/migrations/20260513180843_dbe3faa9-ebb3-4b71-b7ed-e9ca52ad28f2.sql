-- Prevent duplicate draft businesses for the same owner under concurrent inserts
CREATE UNIQUE INDEX IF NOT EXISTS uniq_businesses_one_draft_per_user
  ON public.businesses (user_id)
  WHERE approval_status = 'draft';