-- Phase 5.5 Safe Batch 1 (corrected): revoke from PUBLIC, re-grant authenticated.
-- Direct REVOKE FROM anon was a no-op because EXECUTE was inherited from PUBLIC.

REVOKE EXECUTE ON FUNCTION public.cancel_subscription(_subscription_id uuid)                                                                                                                       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cancel_subscription(_subscription_id uuid)                                                                                                                       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.subscribe_to_plan(_user_id uuid, _plan_id uuid, _business_id uuid, _billing_cycle text)                                                                          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.subscribe_to_plan(_user_id uuid, _plan_id uuid, _business_id uuid, _billing_cycle text)                                                                          TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_business_for_review(_business_id uuid)                                                                                                                    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.submit_business_for_review(_business_id uuid)                                                                                                                    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_my_inbox_notification_mute(_muted boolean)                                                                                                                   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_my_inbox_notification_mute(_muted boolean)                                                                                                                   TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_contact_inbox_settings(_patch jsonb)                                                                                                                      FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.update_contact_inbox_settings(_patch jsonb)                                                                                                                      TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_contact_inbox_settings()                                                                                                                                     FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_contact_inbox_settings()                                                                                                                                     TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_contract_counterpart_profile(_viewer_id uuid, _target_user_id uuid)                                                                                          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_contract_counterpart_profile(_viewer_id uuid, _target_user_id uuid)                                                                                          TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_email_engagement_stats(_window_minutes integer)                                                                                                              FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_email_engagement_stats(_window_minutes integer)                                                                                                              TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_email_link_category_stats(_window_minutes integer)                                                                                                           FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_email_link_category_stats(_window_minutes integer)                                                                                                           TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_contact_sla_compliance(_from timestamptz, _to timestamptz, _group_by text)                                                                                   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_contact_sla_compliance(_from timestamptz, _to timestamptz, _group_by text)                                                                                   TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_contact_sla_weekly()                                                                                                                                         FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_contact_sla_weekly()                                                                                                                                         TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_admin_assignees()                                                                                                                                           FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.list_admin_assignees()                                                                                                                                           TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_contact_audit_events(_from timestamptz, _to timestamptz, _event_types text[], _actor uuid, _message_id uuid, _limit integer)                                FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.list_contact_audit_events(_from timestamptz, _to timestamptz, _event_types text[], _actor uuid, _message_id uuid, _limit integer)                                TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_contact_notification_log(_from timestamptz, _to timestamptz, _channel text, _status text, _event_type text, _message_id uuid, _limit integer)               FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.list_contact_notification_log(_from timestamptz, _to timestamptz, _channel text, _status text, _event_type text, _message_id uuid, _limit integer)               TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_notification(_user_id uuid, _title_ar text, _title_en text, _body_ar text, _body_en text, _type varchar, _ref_id uuid, _ref_type varchar, _action_url text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_notification(_user_id uuid, _title_ar text, _title_en text, _body_ar text, _body_en text, _type varchar, _ref_id uuid, _ref_type varchar, _action_url text) TO authenticated;