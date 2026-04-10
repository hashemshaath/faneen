
-- 1. User creation → profile (use CREATE OR REPLACE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Contract triggers
DROP TRIGGER IF EXISTS trg_contract_status_notify ON public.contracts;
CREATE TRIGGER trg_contract_status_notify
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_contract_status_change();

DROP TRIGGER IF EXISTS trg_contract_operations_log ON public.contracts;
CREATE TRIGGER trg_contract_operations_log
  AFTER INSERT OR UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_contract_operation();

-- 3. Milestone notification function + trigger
CREATE OR REPLACE FUNCTION public.notify_milestone_status_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _contract contracts%ROWTYPE;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT * INTO _contract FROM contracts WHERE id = NEW.contract_id;
    IF NEW.status = 'completed' THEN
      PERFORM create_notification(_contract.client_id,
        'تم إنجاز مرحلة: ' || NEW.title_ar, 'Milestone completed: ' || COALESCE(NEW.title_en, NEW.title_ar),
        'تم إنجاز المرحلة بنجاح في العقد ' || _contract.contract_number,
        'Milestone completed in contract ' || _contract.contract_number,
        'contract', _contract.id, 'milestone', '/contracts/' || _contract.id);
      PERFORM create_notification(_contract.provider_id,
        'تم إنجاز مرحلة: ' || NEW.title_ar, 'Milestone completed: ' || COALESCE(NEW.title_en, NEW.title_ar),
        'تم إنجاز المرحلة بنجاح في العقد ' || _contract.contract_number,
        'Milestone completed in contract ' || _contract.contract_number,
        'contract', _contract.id, 'milestone', '/contracts/' || _contract.id);
    ELSIF NEW.status = 'in_progress' THEN
      PERFORM create_notification(_contract.client_id,
        'بدء العمل على مرحلة: ' || NEW.title_ar, 'Work started: ' || COALESCE(NEW.title_en, NEW.title_ar),
        'بدأ المزود العمل على المرحلة', 'Provider started work on milestone',
        'contract', _contract.id, 'milestone', '/contracts/' || _contract.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_milestone_status_notify ON public.contract_milestones;
CREATE TRIGGER trg_milestone_status_notify
  AFTER UPDATE ON public.contract_milestones
  FOR EACH ROW EXECUTE FUNCTION public.notify_milestone_status_change();

-- 4. Installment payments
DROP TRIGGER IF EXISTS trg_installment_payment_notify ON public.installment_payments;
CREATE TRIGGER trg_installment_payment_notify
  AFTER INSERT OR UPDATE ON public.installment_payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_installment_payment();

-- 5. Reviews
DROP TRIGGER IF EXISTS trg_review_update_rating ON public.reviews;
CREATE TRIGGER trg_review_update_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_business_rating();

DROP TRIGGER IF EXISTS trg_review_operations_log ON public.reviews;
CREATE TRIGGER trg_review_operations_log
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.log_review_operation();

-- 6. Projects
DROP TRIGGER IF EXISTS trg_project_operations_log ON public.projects;
CREATE TRIGGER trg_project_operations_log
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_project_operation();

-- 7. Messages
DROP TRIGGER IF EXISTS trg_new_message_notify ON public.messages;
CREATE TRIGGER trg_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- 8. Security violations
DROP TRIGGER IF EXISTS trg_violation_alert ON public.access_violation_log;
CREATE TRIGGER trg_violation_alert
  AFTER INSERT ON public.access_violation_log
  FOR EACH ROW EXECUTE FUNCTION public.check_and_notify_violations();

-- 9. Role changes
DROP TRIGGER IF EXISTS trg_role_change_log ON public.user_roles;
CREATE TRIGGER trg_role_change_log
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- 10. Platform settings
DROP TRIGGER IF EXISTS trg_settings_change_log ON public.platform_settings;
CREATE TRIGGER trg_settings_change_log
  AFTER INSERT OR UPDATE OR DELETE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_settings_change();

-- 11. Promotions
DROP TRIGGER IF EXISTS trg_promotion_notify ON public.promotions;
CREATE TRIGGER trg_promotion_notify
  AFTER INSERT ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_promotion();

-- 12. Maintenance requests
CREATE OR REPLACE FUNCTION public.notify_maintenance_request()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(NEW.provider_id,
      'طلب صيانة جديد: ' || NEW.title_ar, 'New maintenance request: ' || COALESCE(NEW.title_en, NEW.title_ar),
      'تم استلام طلب صيانة جديد رقم ' || NEW.request_number,
      'New maintenance request #' || NEW.request_number,
      'maintenance', NEW.id, 'maintenance_request', '/dashboard/warranties');
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM create_notification(NEW.client_id,
      'تحديث طلب صيانة: ' || NEW.request_number, 'Maintenance update: ' || NEW.request_number,
      'تم تغيير حالة طلب الصيانة إلى ' || NEW.status::text,
      'Maintenance request status changed to ' || NEW.status::text,
      'maintenance', NEW.id, 'maintenance_request', '/dashboard/warranties');
    PERFORM create_notification(NEW.provider_id,
      'تحديث طلب صيانة: ' || NEW.request_number, 'Maintenance update: ' || NEW.request_number,
      'تم تغيير حالة طلب الصيانة إلى ' || NEW.status::text,
      'Maintenance request status changed to ' || NEW.status::text,
      'maintenance', NEW.id, 'maintenance_request', '/dashboard/warranties');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_request_notify ON public.maintenance_requests;
CREATE TRIGGER trg_maintenance_request_notify
  AFTER INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_request();

-- 13. Enable realtime for notifications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 14. Updated_at triggers
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_milestones_updated_at ON public.contract_milestones;
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.contract_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_updated_at ON public.maintenance_requests;
CREATE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
