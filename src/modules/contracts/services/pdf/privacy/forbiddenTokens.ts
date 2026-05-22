export const CONTRACT_PDF_FORBIDDEN_RUNTIME_TOKENS = [
  'file_url',
  'storage_path',
  'getSignedUrl',
  'sign=',
  'internal_note',
  'actor_id',
  'approver_id',
  'token_hash',
  'formula_inputs',
  'draft_template',
  'audit_metadata',
  'audit_log',
  '/storage/v1/object/sign',
  'X-Amz-Signature',
  'contract_pdf_exports',
  'exported_by',
  'ip_hash',
  'user_agent_hash',
  'document_hash_prefix',
  'created_by',
  'archived_at',
  'is_demo',
  'is_default',
  'client_user_id',
  'updated_at',
  'site_id',
  'city_id',
] as const;

export const CONTRACT_PDF_FORBIDDEN_URL_TOKENS = [
  'qr_token_hash',
  'current_scan_token_hash',
  'token=',
  '/s/',
  'X-Amz-Signature',
] as const;

export const CONTRACT_PDF_FORBIDDEN_URL_PATTERN =
  /signature=|X-Amz-Signature|token=/i;