-- Security hardening: REVOKE EXECUTE from anon & authenticated on
-- SECURITY DEFINER functions that should never be invoked directly by clients.
-- Categories:
--   (A) Trigger functions: only fired by table triggers, never via PostgREST
--   (B) Cron/maintenance: scheduled jobs, called as service_role
--   (C) Email queue (pgmq wrappers): service_role workers only
--   (D) Internal helpers: should not be exposed to PostgREST
--   (E) Admin-only: enforce admin check internally, but no need to expose RPC
-- Functions explicitly KEPT public (callable):
--   get_home_stats, get_public_bnpl_for_business, get_public_branch_data,
--   get_public_business_data, has_admin_access, has_role, has_business_role,
--   is_business_owner_or_manager, is_business_staff, is_super_admin,
--   increment_blog_views, increment_promotion_views, track_content_interaction,
--   submit_business_for_review, subscribe_to_plan, cancel_subscription,
--   unsubscribe_newsletter, compute_business_onboarding_completion,
--   get_contract_counterpart_profile, get_current_migration_rerun

-- (A) Trigger functions
REVOKE EXECUTE ON FUNCTION public.auto_add_business_owner() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_message() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_contract_operation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_project_operation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_review_operation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_role_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_settings_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_contract_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_installment_payment() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_maintenance_request() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_milestone_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_promotion() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_subscription_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_contact_message_replied() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_business_rating() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_profile_uniqueness() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_notify_violations() FROM anon, authenticated;

-- (B) Cron / maintenance jobs
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_audit_data() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_migration_telemetry() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_email_deliverability() FROM anon, authenticated;

-- (C) Email queue wrappers (service_role only)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;

-- (D) Internal helpers (called from other definer fns / edge functions only)
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, varchar, uuid, varchar, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_ref_id(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_password_reset_rate_limit(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer) FROM anon, authenticated;

-- (E) Admin-only RPCs (internally guarded; remove from anon to avoid noise/probe)
REVOKE EXECUTE ON FUNCTION public.admin_update_business_approval(uuid, business_approval_status, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_username_status(uuid, username_status, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_upgrade_subscription(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bump_migration_epoch(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_migration_epoch() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_migration_failure_stats_24h() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_migration_failure_stats_window(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_migration_rerun_history(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_web_vitals_summary(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_email_deliverability_stats(integer) FROM anon;
