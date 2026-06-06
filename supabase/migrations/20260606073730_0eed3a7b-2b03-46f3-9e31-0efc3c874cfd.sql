ALTER TABLE public.business_qa
  ADD CONSTRAINT business_qa_published_requires_answer_chk
  CHECK (
    (is_published = false)
    OR (is_published = true AND answer IS NOT NULL AND length(btrim(answer)) > 0)
  );

ALTER TABLE public.business_qa
  ADD CONSTRAINT business_qa_question_min_len_chk
  CHECK (length(btrim(question)) >= 5);

CREATE INDEX IF NOT EXISTS idx_business_qa_asker
  ON public.business_qa (asker_user_id)
  WHERE asker_user_id IS NOT NULL;

ALTER TABLE public.user_favorite_businesses
  ADD CONSTRAINT user_favorite_businesses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quote_requests_target_entity
  ON public.quote_requests (target_entity_id)
  WHERE target_entity_id IS NOT NULL;