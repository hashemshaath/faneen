
-- Drop all existing triggers first, then recreate
DROP TRIGGER IF EXISTS trg_contract_status_notify ON public.contracts;
DROP TRIGGER IF EXISTS trg_contract_operation_log ON public.contracts;
DROP TRIGGER IF EXISTS trg_milestone_status_notify ON public.contract_milestones;
DROP TRIGGER IF EXISTS trg_installment_payment_notify ON public.installment_payments;
DROP TRIGGER IF EXISTS trg_maintenance_request_notify ON public.maintenance_requests;
DROP TRIGGER IF EXISTS trg_new_message_notify ON public.messages;
DROP TRIGGER IF EXISTS trg_role_change_log ON public.user_roles;
DROP TRIGGER IF EXISTS trg_settings_change_log ON public.platform_settings;
DROP TRIGGER IF EXISTS trg_security_violation_notify ON public.access_violation_log;
DROP TRIGGER IF EXISTS trg_auto_add_business_owner ON public.businesses;
DROP TRIGGER IF EXISTS trg_contracts_updated_at ON public.contracts;
DROP TRIGGER IF EXISTS trg_milestones_updated_at ON public.contract_milestones;
DROP TRIGGER IF EXISTS trg_maintenance_updated_at ON public.maintenance_requests;
DROP TRIGGER IF EXISTS trg_installment_plans_updated_at ON public.installment_plans;
DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
DROP TRIGGER IF EXISTS trg_business_staff_updated_at ON public.business_staff;

-- Notification triggers
CREATE TRIGGER trg_contract_status_notify AFTER UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.notify_contract_status_change();
CREATE TRIGGER trg_contract_operation_log AFTER INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.log_contract_operation();
CREATE TRIGGER trg_milestone_status_notify AFTER UPDATE ON public.contract_milestones FOR EACH ROW EXECUTE FUNCTION public.notify_milestone_status_change();
CREATE TRIGGER trg_installment_payment_notify AFTER INSERT OR UPDATE ON public.installment_payments FOR EACH ROW EXECUTE FUNCTION public.notify_installment_payment();
CREATE TRIGGER trg_maintenance_request_notify AFTER INSERT OR UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_request();
CREATE TRIGGER trg_new_message_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();
CREATE TRIGGER trg_role_change_log AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_role_change();
CREATE TRIGGER trg_settings_change_log AFTER INSERT OR UPDATE OR DELETE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.log_settings_change();
CREATE TRIGGER trg_security_violation_notify AFTER INSERT ON public.access_violation_log FOR EACH ROW EXECUTE FUNCTION public.check_and_notify_violations();
CREATE TRIGGER trg_auto_add_business_owner AFTER INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.auto_add_business_owner();

-- Updated_at triggers
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_milestones_updated_at BEFORE UPDATE ON public.contract_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_maintenance_updated_at BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_installment_plans_updated_at BEFORE UPDATE ON public.installment_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_business_staff_updated_at BEFORE UPDATE ON public.business_staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
