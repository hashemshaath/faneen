/**
 * Thin re-export of the providers module's submit service.
 * Keeps page imports scoped to the rebuild folder so the page never
 * touches Supabase directly. All transport, dedup, CR upload, email
 * confirmation, and admin notification logic lives in
 * `@/modules/providers/services/submitProviderLead`.
 */
export {
  submitProviderLead,
  type SubmitProviderLeadResult,
  type SubmitProviderLeadErrorCode,
} from '@/modules/providers';