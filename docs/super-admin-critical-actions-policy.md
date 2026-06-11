# Super Admin Critical Actions Policy

Status: **PASS** — classification complete, no DB tightening required.

Source of truth: gate is asserted by reading `pg_proc` bodies. The mapping
below is enforced by `src/tests/superAdminCriticalActionsPolicyGuard.test.ts`
against the migration source.

## Classification (56 admin_* RPCs)

### Level 3 — Super Admin Only (already enforced)

| RPC | Why |
| --- | --- |
| `admin_set_module_override` | Toggles a module platform-wide / per-business override |
| `admin_clear_module_override` | Same blast radius as the setter |
| `admin_reassign_business_owner` | Changes ownership; alters every downstream permission |
| `admin_transfer_business_ownership` | Same: ownership change |
| `admin_reject_business_ownership_transfer` | Closes an ownership change flow |
| `admin_bulk_set_user_ban` | Mass account ban; identity-wide |
| `admin_bulk_set_business_active` | Mass enable/disable of businesses |
| `admin_sync_profile_email_from_auth` | Mutates identity email mirror |
| `admin_search_users_for_transfer` | Cross-tenant identity search |
| `admin_check_identity_availability` | Identity surface |
| `admin_identity_duplicates_report` | Identity-wide PII |
| `admin_identity_integrity_report` | Identity-wide PII |
| `admin_archive_barcode` / `admin_restore_barcode` / `admin_freeze_barcode` / `admin_issue_successor_barcode` / `admin_transfer_barcode` | Platform-wide barcode registry |
| `admin_list_barcodes` / `admin_get_barcode_detail` / `admin_get_barcode_transfer_trail` / `admin_barcode_registry_summary` | Registry-wide read |
| `admin_list_client_sites_monitoring` / `admin_client_sites_monitoring_summary` / `admin_get_client_site_monitoring_detail` / `admin_get_client_site_sensitive_detail` | Cross-tenant client-site PII |
| `admin_list_client_site_operations_notes` / `admin_add_client_site_operations_note` / `admin_log_client_site_contact_action` | Admin notes on tenant data |
| `admin_rotate_client_site_qr_token` | Security token rotation |
| `admin_list_contract_pdf_exports` / `admin_contract_pdf_exports_summary` | Cross-tenant export trail |
| `admin_convert_lead_to_contract` | Cross-tenant write |

### Level 2 — Restricted Admin (stays `admin`, requires audit + confirmation)

These mutate a **single** entity and have audit logs + UI confirmation.

| RPC | Audit | Confirmation |
| --- | --- | --- |
| `admin_adjust_provider_credits` | `provider_lead_credit_transactions` | Yes |
| `admin_set_business_membership_tier` | `business_audit_log` | Yes |
| `admin_mark_membership_paid_manually` | `membership_subscription_events` | Yes |
| `admin_mark_membership_payment_refunded_manually` | `membership_subscription_events` | Yes |
| `admin_upgrade_subscription` | `membership_upgrade_audit` | Yes |
| `admin_create_contract_on_behalf` | `business_audit_log` | Yes |
| `admin_update_business_approval` | `business_audit_log` | Yes |
| `admin_update_username_status` | `admin_activity_log` | Yes |
| `admin_update_provider_lead` | `lead_request_events` | Yes |
| `admin_merge_brands` / `admin_archive_brand` | `brand_audit_logs` | Yes |

### Level 1 — Admin Operational (no escalation)

`admin_approve_brand`, `admin_reject_brand`, `admin_approve_brand_product_request`,
`admin_reject_brand_product_request`, `admin_approve_provider_brand_link`,
`admin_reject_provider_brand_link`, `admin_get_contact_message_internal_notes`,
`admin_get_botr_admin_notes`, `admin_get_membership_lifecycle_jobs`,
`admin_get_membership_lifecycle_email_markers`, `admin_list_membership_usage`,
`admin_list_unparsed_attachments`.

### Excluded

`admin_operational_notes_guard` is a trigger function, not a callable RPC.

## Decision Table

| RPC / Action | Current Gate | Recommended Gate | Reason | Change Now? |
| --- | --- | --- | --- | --- |
| `admin_set_module_override` | super_admin | super_admin | platform-wide | No (already correct) |
| `admin_reassign_business_owner` | super_admin | super_admin | ownership | No |
| `admin_bulk_set_user_ban` | super_admin | super_admin | identity mass action | No |
| `admin_bulk_set_business_active` | super_admin | super_admin | mass deactivation | No |
| Brand approve/reject | admin | admin | operational moderation, has audit | No |
| Provider credits adjust | admin | admin | single-entity financial; audit + confirm exist | No |
| Membership manual paid/refund | admin | admin | single-entity financial; audit exists | No |
| Username status | admin | admin | single-account moderation; audit | No |
| Convert lead → contract | super_admin | super_admin | cross-tenant write | No |

## Conclusion

No RPC required tightening. All platform-wide actions already enforce
`super_admin` server-side via `public.has_role(auth.uid(), 'super_admin')` or
`public.is_super_admin(...)` with a `42501`/`forbidden` rejection. UI guards
(`ProtectedRoute requireSuperAdmin` on `/admin/users`, `/admin/identity`,
`/admin/access-management`) remain a secondary defense layer; primary
enforcement is in the SECURITY DEFINER functions.

Decision: **SUPER ADMIN CRITICAL ACTIONS POLICY PASS**.