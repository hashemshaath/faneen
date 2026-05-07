-- Revoke anon EXECUTE on internal/admin/trigger functions
-- Trigger functions (called by Postgres only)
REVOKE EXECUTE ON FUNCTION public.notify_subscription_change()           FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_milestone_status_change()       FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_new_promotion()                 FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_maintenance_request()           FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_installment_payment()           FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_booking_change()                FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_contract_status_change()        FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_contract_operation()               FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_project_operation()                FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_review_operation()                 FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_role_change()                      FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_settings_change()                  FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.validate_profile_uniqueness()          FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_business_rating()               FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.auto_add_business_owner()              FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                      FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_message()                   FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.touch_onboarding_draft()               FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()             FROM anon, public;

-- Admin-only functions
REVOKE EXECUTE ON FUNCTION public.admin_update_business_approval(uuid, business_approval_status, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_update_username_status(uuid, username_status, text)            FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_upgrade_subscription(uuid, uuid, text)                         FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bump_migration_epoch(text)                                           FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_migration_epoch()                                                FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_migration_failure_stats_24h()                                    FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_migration_failure_stats_window(integer)                          FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_migration_rerun_history(integer)                                 FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_current_migration_rerun()                                        FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_web_vitals_summary(integer)                                      FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_email_deliverability_stats(integer)                              FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.check_email_deliverability()                                         FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_data()                                             FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_migration_telemetry()                                    FROM anon, public;

-- Internal helpers (service_role only)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)                  FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer)    FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)                  FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)      FROM anon, public, authenticated;