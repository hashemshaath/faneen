GRANT SELECT ON public.contract_templates TO authenticated;
GRANT SELECT ON public.contract_template_pricing_rules TO authenticated;
GRANT SELECT ON public.contract_template_required_fields TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;
GRANT ALL ON public.contract_template_versions TO service_role;
GRANT ALL ON public.contract_template_pricing_rules TO service_role;
GRANT ALL ON public.contract_template_required_fields TO service_role;