-- Phase 5.3: Restrict EXECUTE on SECURITY DEFINER trigger functions.
-- Triggers always run under the function owner's privileges; the EXECUTE
-- grant only matters for direct RPC calls. None of these are valid RPC
-- targets (they take no args and return trigger), so revoking is safe and
-- silences the corresponding Supabase linter warnings.

REVOKE EXECUTE ON FUNCTION public.auto_add_business_owner()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_notify_violations()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.contact_messages_assign_ticket_number()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fire_contact_event_notification()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_message_set_read_at()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_notify_new_lead_request()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_on_onboarding_completed()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_message()                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_contact_message_changes()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_contract_operation()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_project_operation()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_review_operation()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_role_change()                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_settings_change()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_change()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_contract_status_change()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_installment_payment()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_maintenance_request()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_milestone_status_change()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_promotion()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_subscription_change()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_contact_message_replied()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_business_rating()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_profile_uniqueness()            FROM PUBLIC, anon, authenticated;