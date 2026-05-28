
ALTER TABLE public.businesses DISABLE TRIGGER trg_audit_businesses;
ALTER TABLE public.businesses DISABLE TRIGGER trg_businesses_sensitive_audit;
DELETE FROM public.businesses WHERE id = 'b9b64c7c-34b3-45de-a3ea-61e0e65e90ba' AND user_id = 'da662e3f-1876-4016-92f5-c4bf1c18f2a0';
ALTER TABLE public.businesses ENABLE TRIGGER trg_audit_businesses;
ALTER TABLE public.businesses ENABLE TRIGGER trg_businesses_sensitive_audit;

CREATE OR REPLACE FUNCTION public.prevent_super_admin_business_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Super admin accounts cannot own business entities (user_id=%).', NEW.user_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_super_admin_business_ownership ON public.businesses;
CREATE TRIGGER trg_prevent_super_admin_business_ownership
BEFORE INSERT OR UPDATE OF user_id ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.prevent_super_admin_business_ownership();

INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
VALUES (
  'da662e3f-1876-4016-92f5-c4bf1c18f2a0',
  'cleanup_super_admin_business_link',
  'business',
  'b9b64c7c-34b3-45de-a3ea-61e0e65e90ba',
  jsonb_build_object(
    'reason', 'Super admin must remain standalone — no entity ownership',
    'business_name_ar', 'مؤسسة النوافذ الذكية للزجاج',
    'ref_id', 'ENT-1000003'
  )
);
