-- Phase 5.5 Safe Batch 1: Revoke EXECUTE from anon on authenticated-only RPCs.
REVOKE EXECUTE ON FUNCTION public.cancel_subscription(_subscription_id uuid)                                                                                              FROM anon;
REVOKE EXECUTE ON FUNCTION public.subscribe_to_plan(_user_id uuid, _plan_id uuid, _business_id uuid, _billing_cycle text)                                                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_business_for_review(_business_id uuid)                                                                                           FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_my_inbox_notification_mute(_muted boolean)                                                                                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_contact_inbox_settings(_patch jsonb)                                                                                             FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_contact_inbox_settings()                                                                                                            FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_contract_counterpart_profile(_viewer_id uuid, _target_user_id uuid)                                                                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_email_engagement_stats(_window_minutes integer)                                                                                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_email_link_category_stats(_window_minutes integer)                                                                                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_contact_sla_compliance(_from timestamptz, _to timestamptz, _group_by text)                                                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_contact_sla_weekly()                                                                                                                FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_admin_assignees()                                                                                                                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_contact_audit_events(_from timestamptz, _to timestamptz, _event_types text[], _actor uuid, _message_id uuid, _limit integer)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_contact_notification_log(_from timestamptz, _to timestamptz, _channel text, _status text, _event_type text, _message_id uuid, _limit integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notification(_user_id uuid, _title_ar text, _title_en text, _body_ar text, _body_en text, _type varchar, _ref_id uuid, _ref_type varchar, _action_url text) FROM anon;