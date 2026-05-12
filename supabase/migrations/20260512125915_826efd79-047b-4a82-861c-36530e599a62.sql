
-- ── A. Public view of template versions (safe columns only) ──
DROP VIEW IF EXISTS public.contract_template_versions_public;
CREATE VIEW public.contract_template_versions_public
WITH (security_invoker = on) AS
SELECT
  v.id,
  v.template_id,
  v.version_number,
  v.status,
  v.effective_from,
  v.published_at,
  v.published_by,
  v.language_precedence,
  v.body_hash,
  v.created_at,
  v.updated_at,
  v.archived_at,
  v.superseded_by
FROM public.contract_template_versions v;

GRANT SELECT ON public.contract_template_versions_public TO anon, authenticated;

-- ── B. Tighten base table SELECT to admins only ──
DROP POLICY IF EXISTS "ctv_read_published" ON public.contract_template_versions;
CREATE POLICY "ctv_admin_read"
  ON public.contract_template_versions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

-- ── C. Server-side child-row guard (TEMPLATE_VERSION_LOCKED) ──
CREATE OR REPLACE FUNCTION public._ct_assert_version_editable(p_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status
    FROM contract_template_versions WHERE id = p_version_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'TEMPLATE_VERSION_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF v_status NOT IN ('draft','changes_requested') THEN
    RAISE EXCEPTION 'TEMPLATE_VERSION_LOCKED: status=%', v_status USING ERRCODE = '55006';
  END IF;
END $$;

-- Trigger fn for tables with direct version_id (sections, pricing_rules, required_fields, attachments)
CREATE OR REPLACE FUNCTION public._ct_guard_child_by_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  v_id := COALESCE(NEW.version_id, OLD.version_id);
  PERFORM public._ct_assert_version_editable(v_id);
  RETURN COALESCE(NEW, OLD);
END $$;

-- Trigger fn for clauses (parented by section_id)
CREATE OR REPLACE FUNCTION public._ct_guard_clause()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT s.version_id INTO v_id
    FROM public.contract_template_sections s
   WHERE s.id = COALESCE(NEW.section_id, OLD.section_id);
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'TEMPLATE_SECTION_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  PERFORM public._ct_assert_version_editable(v_id);
  RETURN COALESCE(NEW, OLD);
END $$;

-- Wire triggers
DROP TRIGGER IF EXISTS ct_guard_sections ON public.contract_template_sections;
CREATE TRIGGER ct_guard_sections
  BEFORE INSERT OR UPDATE OR DELETE ON public.contract_template_sections
  FOR EACH ROW EXECUTE FUNCTION public._ct_guard_child_by_version();

DROP TRIGGER IF EXISTS ct_guard_pricing ON public.contract_template_pricing_rules;
CREATE TRIGGER ct_guard_pricing
  BEFORE INSERT OR UPDATE OR DELETE ON public.contract_template_pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public._ct_guard_child_by_version();

DROP TRIGGER IF EXISTS ct_guard_required ON public.contract_template_required_fields;
CREATE TRIGGER ct_guard_required
  BEFORE INSERT OR UPDATE OR DELETE ON public.contract_template_required_fields
  FOR EACH ROW EXECUTE FUNCTION public._ct_guard_child_by_version();

DROP TRIGGER IF EXISTS ct_guard_attachments ON public.contract_template_attachments;
CREATE TRIGGER ct_guard_attachments
  BEFORE INSERT OR UPDATE OR DELETE ON public.contract_template_attachments
  FOR EACH ROW EXECUTE FUNCTION public._ct_guard_child_by_version();

DROP TRIGGER IF EXISTS ct_guard_clauses ON public.contract_template_clauses;
CREATE TRIGGER ct_guard_clauses
  BEFORE INSERT OR UPDATE OR DELETE ON public.contract_template_clauses
  FOR EACH ROW EXECUTE FUNCTION public._ct_guard_clause();

-- ── D. Notification helper ──
-- Fans out one notification row per admin/super_admin (excluding the actor).
-- Payload is intentionally minimal: template name, version, action, link.
-- Never includes legal_review_notes, audit metadata, or PII.
CREATE OR REPLACE FUNCTION public._ct_notify_review_event(
  p_version_id uuid,
  p_action     text,
  p_to_status  text,
  p_actor      uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name_ar text; v_name_en text; v_ver int; v_type text;
  v_title_ar text; v_title_en text; v_body_ar text; v_body_en text;
BEGIN
  SELECT t.name_ar, t.name_en, v.version_number
    INTO v_name_ar, v_name_en, v_ver
    FROM contract_template_versions v
    JOIN contract_templates t ON t.id = v.template_id
   WHERE v.id = p_version_id;
  IF v_name_ar IS NULL THEN RETURN; END IF;

  v_type := CASE p_action
    WHEN 'submitted_for_review' THEN 'template_review_submitted'
    WHEN 'changes_requested'    THEN 'template_review_changes_requested'
    WHEN 'reverted_to_draft'    THEN 'template_review_reverted'
    WHEN 'approved_by_legal'    THEN 'template_review_approved'
    WHEN 'published'            THEN 'template_review_published'
    WHEN 'archived'             THEN 'template_review_archived'
    ELSE 'system'
  END;

  v_title_ar := CASE p_action
    WHEN 'submitted_for_review' THEN 'نسخة قالب قيد المراجعة القانونية'
    WHEN 'changes_requested'    THEN 'مطلوب تعديلات على نسخة قالب'
    WHEN 'reverted_to_draft'    THEN 'إعادة نسخة قالب إلى المسودة'
    WHEN 'approved_by_legal'    THEN 'اعتماد نسخة قالب قانونياً'
    WHEN 'published'            THEN 'نشر نسخة قالب'
    WHEN 'archived'             THEN 'أرشفة نسخة قالب'
    ELSE 'تحديث نسخة قالب'
  END;
  v_title_en := CASE p_action
    WHEN 'submitted_for_review' THEN 'Template version submitted for legal review'
    WHEN 'changes_requested'    THEN 'Changes requested on template version'
    WHEN 'reverted_to_draft'    THEN 'Template version reverted to draft'
    WHEN 'approved_by_legal'    THEN 'Template version legally approved'
    WHEN 'published'            THEN 'Template version published'
    WHEN 'archived'             THEN 'Template version archived'
    ELSE 'Template version updated'
  END;

  v_body_ar := COALESCE(v_name_ar, v_name_en, '—') || ' — الإصدار ' || v_ver::text;
  v_body_en := COALESCE(v_name_en, v_name_ar, '—') || ' — version ' || v_ver::text;

  INSERT INTO public.notifications
    (user_id, title_ar, title_en, body_ar, body_en,
     notification_type, reference_id, reference_type, action_url)
  SELECT DISTINCT ur.user_id,
         v_title_ar, v_title_en, v_body_ar, v_body_en,
         v_type, p_version_id, 'contract_template_version',
         '/admin/contract-templates'
    FROM public.user_roles ur
   WHERE ur.role IN ('admin'::app_role, 'super_admin'::app_role)
     AND (p_actor IS NULL OR ur.user_id <> p_actor);
END $$;

REVOKE EXECUTE ON FUNCTION public._ct_notify_review_event(uuid, text, text, uuid) FROM anon, public;

-- ── E. Inject notification calls into existing workflow RPCs ──
-- Re-create each RPC with a trailing PERFORM _ct_notify_review_event(...).
-- All other behavior preserved exactly from CT7.

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
     SET status = 'in_review', review_requested_at = now(), review_status_note = p_note
   WHERE id = p_version_id;
  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note)
    VALUES (p_version_id, 'submitted_for_review', v_uid, v_from, 'in_review', p_note);
  PERFORM public._ct_notify_review_event(p_version_id, 'submitted_for_review', 'in_review', v_uid);
END $$;

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
     SET status = 'changes_requested', changes_requested_at = now(),
         review_decision_by = v_uid, review_decision_at = now(), review_status_note = p_note
   WHERE id = p_version_id;
  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note)
    VALUES (p_version_id, 'changes_requested', v_uid, v_from, 'changes_requested', p_note);
  PERFORM public._ct_notify_review_event(p_version_id, 'changes_requested', 'changes_requested', v_uid);
END $$;

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
     SET status = 'draft', review_status_note = p_note
   WHERE id = p_version_id;
  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note)
    VALUES (p_version_id, 'reverted_to_draft', v_uid, v_from, 'draft', p_note);
  PERFORM public._ct_notify_review_event(p_version_id, 'reverted_to_draft', 'draft', v_uid);
END $$;

CREATE OR REPLACE FUNCTION public.template_version_legal_approve(
  p_version_id uuid, p_risk_level text, p_language_precedence text, p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from text; v_uid uuid := auth.uid();
BEGIN
  PERFORM public._ct_assert_admin();
  IF p_risk_level NOT IN ('low','medium','high') THEN RAISE EXCEPTION 'INVALID_RISK_LEVEL'; END IF;
  IF p_language_precedence NOT IN ('ar','en') THEN RAISE EXCEPTION 'INVALID_LANGUAGE_PRECEDENCE'; END IF;
  SELECT status INTO v_from FROM contract_template_versions WHERE id = p_version_id FOR UPDATE;
  IF v_from IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_from <> 'in_review' THEN RAISE EXCEPTION 'INVALID_TRANSITION: % → legal_approved', v_from; END IF;
  UPDATE contract_template_versions
     SET status='legal_approved', risk_level=p_risk_level, language_precedence=p_language_precedence,
         legal_reviewer_id=v_uid, legal_reviewed_at=now(),
         review_decision_by=v_uid, review_decision_at=now(),
         legal_review_notes=COALESCE(p_note, legal_review_notes)
   WHERE id = p_version_id;
  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note, risk_level)
    VALUES (p_version_id, 'approved_by_legal', v_uid, v_from, 'legal_approved', p_note, p_risk_level);
  PERFORM public._ct_notify_review_event(p_version_id, 'approved_by_legal', 'legal_approved', v_uid);
END $$;

CREATE OR REPLACE FUNCTION public.template_version_publish(
  p_version_id uuid, p_effective_from timestamptz DEFAULT NULL, p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from text; v_uid uuid := auth.uid();
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
     SET status='published', published_at=now(), published_by=v_uid,
         effective_from=COALESCE(p_effective_from, now())
   WHERE id = p_version_id;

  SELECT current_version_id INTO v_prior FROM contract_templates WHERE id = v_template FOR UPDATE;
  IF v_prior IS NOT NULL AND v_prior <> p_version_id THEN
    UPDATE contract_template_versions
       SET status='superseded', superseded_by=p_version_id
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
  PERFORM public._ct_notify_review_event(p_version_id, 'published', 'published', v_uid);
END $$;

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
  UPDATE contract_template_versions SET status='archived', archived_at=now() WHERE id = p_version_id;
  UPDATE contract_templates SET current_version_id = NULL
   WHERE id = v_template AND current_version_id = p_version_id;
  INSERT INTO contract_template_review_events
    (template_version_id, action, actor_id, from_status, to_status, note)
    VALUES (p_version_id, 'archived', v_uid, v_from, 'archived', p_note);
  PERFORM public._ct_notify_review_event(p_version_id, 'archived', 'archived', v_uid);
END $$;

GRANT EXECUTE ON FUNCTION public.template_version_submit_for_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_version_request_changes(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_version_revert_to_draft(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_version_legal_approve(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_version_publish(uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_version_archive(uuid, text) TO authenticated;
