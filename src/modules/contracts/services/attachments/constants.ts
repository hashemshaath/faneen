/**
 * CT-7 — Canonical name of the Supabase storage bucket used for
 * contract runtime attachments (receipts, measurement files, generic
 * contract files, maintenance request images). All app/service code
 * MUST reference the bucket via this constant — never as a literal.
 */
export const CONTRACT_ATTACHMENTS_BUCKET = 'contract-attachments';