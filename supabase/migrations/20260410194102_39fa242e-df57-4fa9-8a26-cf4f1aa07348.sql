
-- Use DROP IF EXISTS + CREATE to avoid conflicts

-- 2. Contract status notifications
DROP TRIGGER IF EXISTS trg_contract_status_notify ON public.contracts;
CREATE TRIGGER trg_contract_status_notify
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_contract_status_change();

-- 3. Contract operations log
DROP TRIGGER IF EXISTS trg_contract_operations_log ON public.contracts;
CREATE TRIGGER trg_contract_operations_log
  AFTER INSERT OR UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_contract_operation();

-- 4. Milestone status notifications
DROP TRIGGER IF EXISTS trg_milestone_status_notify ON public.contract_milestones;
CREATE TRIGGER trg_milestone_status_notify
  AFTER UPDATE ON public.contract_milestones
  FOR EACH ROW EXECUTE FUNCTION public.notify_milestone_status_change();

-- 5. Installment payment notifications
DROP TRIGGER IF EXISTS trg_installment_payment_notify ON public.installment_payments;
CREATE TRIGGER trg_installment_payment_notify
  AFTER INSERT OR UPDATE ON public.installment_payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_installment_payment();

-- 6. Maintenance request notifications
DROP TRIGGER IF EXISTS trg_maintenance_request_notify ON public.maintenance_requests;
CREATE TRIGGER trg_maintenance_request_notify
  AFTER INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_request();

-- 7. New message notifications
DROP TRIGGER IF EXISTS trg_new_message_notify ON public.messages;
CREATE TRIGGER trg_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- 8. Business rating update
DROP TRIGGER IF EXISTS trg_update_business_rating ON public.reviews;
CREATE TRIGGER trg_update_business_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_business_rating();

-- 9. Project operations log
DROP TRIGGER IF EXISTS trg_project_operations_log ON public.projects;
CREATE TRIGGER trg_project_operations_log
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_project_operation();

-- 10. Review operations log
DROP TRIGGER IF EXISTS trg_review_operations_log ON public.reviews;
CREATE TRIGGER trg_review_operations_log
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.log_review_operation();

-- 11. Role change audit log
DROP TRIGGER IF EXISTS trg_role_change_log ON public.user_roles;
CREATE TRIGGER trg_role_change_log
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- 12. Platform settings audit log
DROP TRIGGER IF EXISTS trg_settings_change_log ON public.platform_settings;
CREATE TRIGGER trg_settings_change_log
  AFTER INSERT OR UPDATE OR DELETE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_settings_change();

-- 13. Security violation alerts
DROP TRIGGER IF EXISTS trg_violation_notify ON public.access_violation_log;
CREATE TRIGGER trg_violation_notify
  AFTER INSERT ON public.access_violation_log
  FOR EACH ROW EXECUTE FUNCTION public.check_and_notify_violations();

-- 14. Auto-add business owner as staff
DROP TRIGGER IF EXISTS trg_auto_add_business_owner ON public.businesses;
CREATE TRIGGER trg_auto_add_business_owner
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_business_owner();

-- 15. Updated_at triggers
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_milestones_updated_at ON public.contract_milestones;
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.contract_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_businesses_updated_at ON public.businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON public.maintenance_requests;
CREATE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_installment_plans_updated_at ON public.installment_plans;
CREATE TRIGGER update_installment_plans_updated_at
  BEFORE UPDATE ON public.installment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications (ignore if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
