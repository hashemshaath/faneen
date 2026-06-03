
-- ============================================================
-- Site Contacts (engineer, guard, owner, trade leads, etc.)
-- ============================================================
CREATE TABLE public.site_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role_code text NOT NULL DEFAULT 'other',
  role_label text,
  scope_category text,
  trade text,
  phone text,
  email text,
  whatsapp text,
  responsibilities text,
  permissions jsonb NOT NULL DEFAULT '{"can_approve":false,"can_view_financials":false,"can_receive_reports":true}'::jsonb,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  user_id uuid,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_site_contacts_site ON public.site_contacts(site_id, sort_order);
CREATE INDEX idx_site_contacts_contract ON public.site_contacts(contract_id) WHERE contract_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_contacts TO authenticated;
GRANT ALL ON public.site_contacts TO service_role;

ALTER TABLE public.site_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY sc_manage ON public.site_contacts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_sites s WHERE s.id = site_id
      AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid()
        OR public.is_business_staff(s.business_id, auth.uid())
        OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.client_sites s WHERE s.id = site_id
      AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid()
        OR public.is_business_staff(s.business_id, auth.uid())
        OR public.has_role(auth.uid(),'admin'))));

CREATE TRIGGER trg_site_contacts_updated_at BEFORE UPDATE ON public.site_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Tasks (optionally assigned to a site contact)
-- ============================================================
CREATE TABLE public.site_contact_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.site_contacts(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  due_date date,
  completed_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sct_site ON public.site_contact_tasks(site_id, status, due_date);
CREATE INDEX idx_sct_contact ON public.site_contact_tasks(contact_id) WHERE contact_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_contact_tasks TO authenticated;
GRANT ALL ON public.site_contact_tasks TO service_role;

ALTER TABLE public.site_contact_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY sct_manage ON public.site_contact_tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_sites s WHERE s.id = site_id
    AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid()
      OR public.is_business_staff(s.business_id, auth.uid())
      OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_sites s WHERE s.id = site_id
    AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid()
      OR public.is_business_staff(s.business_id, auth.uid())
      OR public.has_role(auth.uid(),'admin'))));

CREATE TRIGGER trg_sct_updated_at BEFORE UPDATE ON public.site_contact_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Reports / complaints (general about site, or about a contact)
-- ============================================================
CREATE TABLE public.site_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.site_contacts(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  report_type text NOT NULL DEFAULT 'issue' CHECK (report_type IN ('issue','complaint','delay','quality','safety','other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','urgent')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  reporter_user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sr_site ON public.site_reports(site_id, status, created_at DESC);
CREATE INDEX idx_sr_contact ON public.site_reports(contact_id) WHERE contact_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_reports TO authenticated;
GRANT ALL ON public.site_reports TO service_role;

ALTER TABLE public.site_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY sr_manage ON public.site_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_sites s WHERE s.id = site_id
    AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid()
      OR public.is_business_staff(s.business_id, auth.uid())
      OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_sites s WHERE s.id = site_id
    AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid()
      OR public.is_business_staff(s.business_id, auth.uid())
      OR public.has_role(auth.uid(),'admin'))));

CREATE TRIGGER trg_sr_updated_at BEFORE UPDATE ON public.site_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Communication log per contact (call, whatsapp, email, visit, note)
-- ============================================================
CREATE TABLE public.site_contact_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.site_contacts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('call','whatsapp','email','visit','note','sms')),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  summary text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scc_site ON public.site_contact_communications(site_id, occurred_at DESC);
CREATE INDEX idx_scc_contact ON public.site_contact_communications(contact_id, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_contact_communications TO authenticated;
GRANT ALL ON public.site_contact_communications TO service_role;

ALTER TABLE public.site_contact_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY scc_manage ON public.site_contact_communications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_sites s WHERE s.id = site_id
    AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid()
      OR public.is_business_staff(s.business_id, auth.uid())
      OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_sites s WHERE s.id = site_id
    AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid()
      OR public.is_business_staff(s.business_id, auth.uid())
      OR public.has_role(auth.uid(),'admin'))));

-- ============================================================
-- Extend timeline RPC to include contacts/tasks/reports
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_client_site_timeline(_site_id uuid, _limit int DEFAULT 100)
RETURNS TABLE (
  event_type text, event_id uuid, ref_id text, title text,
  status text, amount numeric, currency text, occurred_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH authz AS (
    SELECT EXISTS (
      SELECT 1 FROM public.client_sites s
      WHERE s.id = _site_id
        AND (s.owner_user_id = auth.uid() OR s.client_user_id = auth.uid()
          OR public.is_business_staff(s.business_id, auth.uid())
          OR public.has_role(auth.uid(), 'admin'))
    ) AS allowed
  ),
  events AS (
    SELECT 'contract'::text et, c.id eid, c.contract_number rid,
           COALESCE(c.title_ar, c.title_en) ttl, c.status::text st,
           c.total_amount amt, c.currency_code cur, c.created_at oc
    FROM public.contracts c, authz WHERE authz.allowed AND c.execution_site_id = _site_id
    UNION ALL
    SELECT 'milestone', m.id, NULL, m.title_ar, m.status::text, m.amount, NULL, m.created_at
    FROM public.contract_milestones m JOIN public.contracts c ON c.id = m.contract_id, authz
    WHERE authz.allowed AND c.execution_site_id = _site_id
    UNION ALL
    SELECT 'lead', l.id, l.ref_id, NULL, l.status::text, NULL, NULL, l.created_at
    FROM public.lead_requests l, authz WHERE authz.allowed AND l.source_site_id = _site_id
    UNION ALL
    SELECT 'rfq', r.id, r.ref_id, NULL, r.status::text, NULL, NULL, r.created_at
    FROM public.rfq_requests r, authz WHERE authz.allowed AND r.site_id = _site_id
    UNION ALL
    SELECT 'visit', v.id, NULL, v.action, v.visit_source, NULL, NULL, v.created_at
    FROM public.client_site_visit_logs v, authz WHERE authz.allowed AND v.site_id = _site_id
    UNION ALL
    SELECT 'contact', sc.id, NULL, sc.full_name, sc.role_code, NULL, NULL, sc.created_at
    FROM public.site_contacts sc, authz WHERE authz.allowed AND sc.site_id = _site_id
    UNION ALL
    SELECT 'task', t.id, NULL, t.title, t.status, NULL, NULL, t.created_at
    FROM public.site_contact_tasks t, authz WHERE authz.allowed AND t.site_id = _site_id
    UNION ALL
    SELECT 'report', rep.id, NULL, rep.title, rep.status, NULL, rep.severity, rep.created_at
    FROM public.site_reports rep, authz WHERE authz.allowed AND rep.site_id = _site_id
    UNION ALL
    SELECT 'comm', cc.id, NULL, cc.summary, cc.channel, NULL, cc.direction, cc.occurred_at
    FROM public.site_contact_communications cc, authz WHERE authz.allowed AND cc.site_id = _site_id
  )
  SELECT event_type, event_id, ref_id, title, status, amount, currency, occurred_at
  FROM (
    SELECT et event_type, eid event_id, rid ref_id, ttl title, st status, amt amount, cur currency, oc occurred_at
    FROM events
  ) e
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT GREATEST(_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.get_client_site_timeline(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_site_timeline(uuid, int) TO authenticated;
