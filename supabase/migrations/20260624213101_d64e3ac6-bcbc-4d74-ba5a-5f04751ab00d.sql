
-- Drop overly-broad SELECT policy on contract_templates
DROP POLICY IF EXISTS "Contract templates are viewable by authenticated users" ON public.contract_templates;

-- Replace with published-only visibility (admins still covered by existing "admin full" policy)
CREATE POLICY "ct_published_read" ON public.contract_templates
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_active, true) = true
    AND archived_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.contract_template_versions v
      WHERE v.template_id = contract_templates.id
        AND v.status = 'published'
    )
  );

-- Principle of least privilege: revoke wide default grants. RLS already gates reads,
-- but raw write privileges to anon are unnecessary and removed here.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.contract_templates FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.contract_template_versions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.contract_template_pricing_rules FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.contract_template_required_fields FROM anon;

-- anon should not read raw template tables; the public view is the only anon-readable surface.
REVOKE SELECT ON public.contract_templates FROM anon;
REVOKE SELECT ON public.contract_template_versions FROM anon;
REVOKE SELECT ON public.contract_template_pricing_rules FROM anon;
REVOKE SELECT ON public.contract_template_required_fields FROM anon;
