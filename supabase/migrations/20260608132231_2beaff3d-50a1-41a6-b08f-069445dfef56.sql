
-- Admin full control over Contracts subsystem (additive policies — no weakening)

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'contracts',
    'contract_amendments',
    'contract_line_items',
    'contract_milestones',
    'contract_measurements',
    'contract_attachments',
    'contract_notes',
    'contract_versions',
    'contract_templates',
    'contract_template_versions',
    'contract_template_sections',
    'contract_template_clauses',
    'contract_template_required_fields',
    'contract_template_pricing_rules',
    'contract_template_attachments',
    'contract_template_snapshots',
    'contract_template_review_events',
    'contract_amendment_approvals',
    'contract_amendment_audit',
    'contract_counter_offers',
    'contract_measurement_methods'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "admin full %1$I" ON public.%1$I;', t);
      EXECUTE format(
        'CREATE POLICY "admin full %1$I" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(),''admin''::app_role));',
        t
      );
    END IF;
  END LOOP;
END $$;
