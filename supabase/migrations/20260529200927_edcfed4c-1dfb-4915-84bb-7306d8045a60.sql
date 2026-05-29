
-- HELP-CENTER-ASSISTANT-4

CREATE SEQUENCE IF NOT EXISTS public.seq_help_content_gap START 1000;

CREATE TYPE public.help_content_gap_status AS ENUM ('new','reviewing','article_planned','article_created','ignored');

CREATE TABLE public.help_content_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  query_normalized text NOT NULL,
  last_query text NOT NULL,
  audience public.help_audience,
  page_key text,
  dedupe_key text NOT NULL,
  frequency integer NOT NULL DEFAULT 1,
  zero_result_count integer NOT NULL DEFAULT 0,
  suggested_title_ar text,
  suggested_title_en text,
  status public.help_content_gap_status NOT NULL DEFAULT 'new',
  created_article_id uuid REFERENCES public.help_articles(id) ON DELETE SET NULL,
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_help_content_gaps_dedupe ON public.help_content_gaps (dedupe_key);
CREATE INDEX idx_help_content_gaps_status ON public.help_content_gaps (status);
CREATE INDEX idx_help_content_gaps_created_at ON public.help_content_gaps (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_help_content_gap_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN NEW.ref_id := 'HGAP-' || nextval('public.seq_help_content_gap')::text; END IF;
  IF NEW.submitted_by IS NULL THEN NEW.submitted_by := auth.uid(); END IF;
  NEW.dedupe_key := NEW.query_normalized || '||' || COALESCE(NEW.audience::text,'') || '||' || COALESCE(NEW.page_key,'');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_help_content_gap_defaults BEFORE INSERT OR UPDATE ON public.help_content_gaps FOR EACH ROW EXECUTE FUNCTION public.set_help_content_gap_defaults();
CREATE TRIGGER trg_help_content_gap_updated_at BEFORE UPDATE ON public.help_content_gaps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE ON public.help_content_gaps TO authenticated;
GRANT ALL ON public.help_content_gaps TO service_role;

ALTER TABLE public.help_content_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hcg_insert_authenticated"
  ON public.help_content_gaps FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "hcg_select_own_or_admin"
  ON public.help_content_gaps FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "hcg_admin_update"
  ON public.help_content_gaps FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.help_articles
  ADD COLUMN IF NOT EXISTS created_from_gap_id uuid REFERENCES public.help_content_gaps(id) ON DELETE SET NULL;

CREATE TABLE public.help_assistant_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL CHECK (event IN ('question_asked','answer_found','low_confidence','content_gap_submitted')),
  query_normalized text,
  page_key text,
  audience public.help_audience,
  confidence numeric,
  sources_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_help_assistant_logs_created_at ON public.help_assistant_logs (created_at DESC);
CREATE INDEX idx_help_assistant_logs_event ON public.help_assistant_logs (event);

GRANT INSERT ON public.help_assistant_logs TO authenticated;
GRANT ALL ON public.help_assistant_logs TO service_role;

ALTER TABLE public.help_assistant_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hal_insert_authenticated"
  ON public.help_assistant_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "hal_admin_select"
  ON public.help_assistant_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RPC: idempotent upsert via dedupe_key
CREATE OR REPLACE FUNCTION public.submit_help_content_gap(
  _query text,
  _query_normalized text,
  _audience public.help_audience DEFAULT NULL,
  _page_key text DEFAULT NULL,
  _suggested_title_ar text DEFAULT NULL,
  _suggested_title_en text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_dedupe text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  v_dedupe := _query_normalized || '||' || COALESCE(_audience::text,'') || '||' || COALESCE(_page_key,'');

  SELECT id INTO v_id FROM public.help_content_gaps WHERE dedupe_key = v_dedupe LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.help_content_gaps
      SET frequency = frequency + 1,
          zero_result_count = zero_result_count + 1,
          last_query = _query,
          suggested_title_ar = COALESCE(suggested_title_ar, _suggested_title_ar),
          suggested_title_en = COALESCE(suggested_title_en, _suggested_title_en),
          updated_at = now()
      WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.help_content_gaps (
    query_normalized, last_query, audience, page_key,
    suggested_title_ar, suggested_title_en, frequency, zero_result_count, submitted_by
  )
  VALUES (
    _query_normalized, _query, _audience, _page_key,
    _suggested_title_ar, _suggested_title_en, 1, 1, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.submit_help_content_gap(text, text, public.help_audience, text, text, text) TO authenticated;
