
-- ── 1. Audit columns on contract_template_versions ──
ALTER TABLE public.contract_template_versions
  ADD COLUMN IF NOT EXISTS legal_reviewed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS review_requested_at    timestamptz,
  ADD COLUMN IF NOT EXISTS changes_requested_at   timestamptz,
  ADD COLUMN IF NOT EXISTS review_decision_by     uuid,
  ADD COLUMN IF NOT EXISTS review_decision_at     timestamptz,
  ADD COLUMN IF NOT EXISTS review_status_note     text;

-- ── 2. Review event log ──
CREATE TABLE IF NOT EXISTS public.contract_template_review_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id uuid NOT NULL REFERENCES public.contract_template_versions(id) ON DELETE CASCADE,
  action              text NOT NULL CHECK (action IN (
                        'submitted_for_review','changes_requested','approved_by_legal',
                        'published','archived','superseded','reverted_to_draft')),
  actor_id            uuid,
  from_status         text,
  to_status           text,
  note                text,
  risk_level          text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ctre_version_idx ON public.contract_template_review_events(template_version_id, created_at DESC);

ALTER TABLE public.contract_template_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ctre_admin_read" ON public.contract_template_review_events;
CREATE POLICY "ctre_admin_read" ON public.contract_template_review_events
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

DROP POLICY IF EXISTS "ctre_admin_write" ON public.contract_template_review_events;
CREATE POLICY "ctre_admin_write" ON public.contract_template_review_events
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

-- ── 3. Helper: assert admin ──
CREATE OR REPLACE FUNCTION public._ct_assert_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'FORBIDDEN: admin role required' USING ERRCODE = '42501';
  END IF;
END $$;

-- ── 4. Workflow RPCs ──

-- submit draft → in_review
CREATE OR REPLACE FUNCTION public.template_version_submit_for_review(
  p_version_id uuid, p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from text; v_uid uuid := auth.uid();
BEGIN
  PERFORM public._ct_assert_admin();
  SELECT status INTO v_from FROM contract_template_versions WHERE id = p_version_id FOR UPDATE;
  IF v_from IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_from NOT IN ('draft','changes_requested') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: % → in_review', v_from;
  END IF;
  UPDATE contract_template_versions
     SET status = 'in_review',
         review_requested_at = now(),
         review_status_note  = p_note
   WHERE id = p_version_id;
  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note)
    VALUES (p_version_id, 'submitted_for_review', v_uid, v_from, 'in_review', p_note);
END $$;

-- in_review → changes_requested
CREATE OR REPLACE FUNCTION public.template_version_request_changes(
  p_version_id uuid, p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from text; v_uid uuid := auth.uid();
BEGIN
  PERFORM public._ct_assert_admin();
  SELECT status INTO v_from FROM contract_template_versions WHERE id = p_version_id FOR UPDATE;
  IF v_from IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_from <> 'in_review' THEN RAISE EXCEPTION 'INVALID_TRANSITION: % → changes_requested', v_from; END IF;
  UPDATE contract_template_versions
     SET status = 'changes_requested',
         changes_requested_at = now(),
         review_decision_by   = v_uid,
         review_decision_at   = now(),
         review_status_note   = p_note
   WHERE id = p_version_id;
  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note)
    VALUES (p_version_id, 'changes_requested', v_uid, v_from, 'changes_requested', p_note);
END $$;

-- changes_requested → draft (revert)
CREATE OR REPLACE FUNCTION public.template_version_revert_to_draft(
  p_version_id uuid, p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from text; v_uid uuid := auth.uid();
BEGIN
  PERFORM public._ct_assert_admin();
  SELECT status INTO v_from FROM contract_template_versions WHERE id = p_version_id FOR UPDATE;
  IF v_from IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_from <> 'changes_requested' THEN RAISE EXCEPTION 'INVALID_TRANSITION: % → draft', v_from; END IF;
  UPDATE contract_template_versions
     SET status = 'draft',
         review_status_note = p_note
   WHERE id = p_version_id;
  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note)
    VALUES (p_version_id, 'reverted_to_draft', v_uid, v_from, 'draft', p_note);
END $$;

-- in_review → legal_approved
CREATE OR REPLACE FUNCTION public.template_version_legal_approve(
  p_version_id uuid,
  p_risk_level text,
  p_language_precedence text,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from text; v_uid uuid := auth.uid();
BEGIN
  PERFORM public._ct_assert_admin();
  IF p_risk_level NOT IN ('low','medium','high') THEN
    RAISE EXCEPTION 'INVALID_RISK_LEVEL';
  END IF;
  IF p_language_precedence NOT IN ('ar','en') THEN
    RAISE EXCEPTION 'INVALID_LANGUAGE_PRECEDENCE';
  END IF;
  SELECT status INTO v_from FROM contract_template_versions WHERE id = p_version_id FOR UPDATE;
  IF v_from IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_from <> 'in_review' THEN RAISE EXCEPTION 'INVALID_TRANSITION: % → legal_approved', v_from; END IF;
  UPDATE contract_template_versions
     SET status              = 'legal_approved',
         risk_level          = p_risk_level,
         language_precedence = p_language_precedence,
         legal_reviewer_id   = v_uid,
         legal_reviewed_at   = now(),
         review_decision_by  = v_uid,
         review_decision_at  = now(),
         legal_review_notes  = COALESCE(p_note, legal_review_notes)
   WHERE id = p_version_id;
  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note, risk_level)
    VALUES (p_version_id, 'approved_by_legal', v_uid, v_from, 'legal_approved', p_note, p_risk_level);
END $$;

-- legal_approved → published; supersedes prior current
CREATE OR REPLACE FUNCTION public.template_version_publish(
  p_version_id uuid,
  p_effective_from timestamptz DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from text; v_uid uuid := auth.uid();
  v_template uuid; v_risk text; v_lang text; v_prior uuid;
BEGIN
  PERFORM public._ct_assert_admin();
  SELECT status, template_id, risk_level, language_precedence
    INTO v_from, v_template, v_risk, v_lang
    FROM contract_template_versions WHERE id = p_version_id FOR UPDATE;
  IF v_from IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_from <> 'legal_approved' THEN RAISE EXCEPTION 'PUBLISH_REQUIRES_LEGAL_APPROVAL'; END IF;
  IF v_risk IS NULL OR v_risk NOT IN ('low','medium','high') THEN RAISE EXCEPTION 'PUBLISH_REQUIRES_RISK_LEVEL'; END IF;
  IF v_lang IS NULL OR v_lang NOT IN ('ar','en') THEN RAISE EXCEPTION 'PUBLISH_REQUIRES_LANGUAGE_PRECEDENCE'; END IF;

  UPDATE contract_template_versions
     SET status         = 'published',
         published_at   = now(),
         published_by   = v_uid,
         effective_from = COALESCE(p_effective_from, now())
   WHERE id = p_version_id;

  -- Supersede prior current (only if a different published version)
  SELECT current_version_id INTO v_prior FROM contract_templates WHERE id = v_template FOR UPDATE;
  IF v_prior IS NOT NULL AND v_prior <> p_version_id THEN
    UPDATE contract_template_versions
       SET status = 'superseded', superseded_by = p_version_id
     WHERE id = v_prior AND status = 'published';
    INSERT INTO contract_template_review_events
      (template_version_id, action, actor_id, from_status, to_status, note)
      VALUES (v_prior, 'superseded', v_uid, 'published', 'superseded',
              'Superseded by version ' || p_version_id::text);
  END IF;

  UPDATE contract_templates SET current_version_id = p_version_id WHERE id = v_template;

  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note, risk_level)
    VALUES (p_version_id, 'published', v_uid, v_from, 'published', p_note, v_risk);
END $$;

-- → archived (from published or legal_approved)
CREATE OR REPLACE FUNCTION public.template_version_archive(
  p_version_id uuid, p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from text; v_template uuid; v_uid uuid := auth.uid();
BEGIN
  PERFORM public._ct_assert_admin();
  SELECT status, template_id INTO v_from, v_template FROM contract_template_versions WHERE id = p_version_id FOR UPDATE;
  IF v_from IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_from NOT IN ('published','legal_approved','superseded') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: % → archived', v_from;
  END IF;
  UPDATE contract_template_versions
     SET status = 'archived', archived_at = now()
   WHERE id = p_version_id;
  -- If archiving the current published version, clear pointer
  UPDATE contract_templates SET current_version_id = NULL
    WHERE id = v_template AND current_version_id = p_version_id;
  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note)
    VALUES (p_version_id, 'archived', v_uid, v_from, 'archived', p_note);
END $$;
