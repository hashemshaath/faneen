import type { TransferPrimaryManagerCode } from './transferPrimaryManager';

/**
 * ORG-RBAC-STRUCTURE-9D — Bilingual message mapping for the
 * `transfer_primary_manager` RPC envelope codes. Never leaks raw DB errors.
 */
export type TransferPrimaryManagerLang = 'en' | 'ar';

const MESSAGES: Record<TransferPrimaryManagerCode, { en: string; ar: string }> = {
  primary_manager_transferred: {
    en: 'Primary manager transferred successfully.',
    ar: 'تم نقل المدير الرئيسي بنجاح.',
  },
  already_primary_manager: {
    en: 'This member is already the primary manager.',
    ar: 'هذا العضو هو المدير الرئيسي بالفعل.',
  },
  forbidden: {
    en: 'You do not have permission to transfer the primary manager.',
    ar: 'لا تملك صلاحية نقل المدير الرئيسي.',
  },
  business_not_found: {
    en: 'Business not found.',
    ar: 'المنشأة غير موجودة.',
  },
  target_not_found: {
    en: 'Target staff member not found for this business.',
    ar: 'الموظف المستهدف غير موجود في هذه المنشأة.',
  },
  target_inactive: {
    en: 'Target staff member is inactive.',
    ar: 'الموظف المستهدف غير نشط.',
  },
  target_role_not_eligible: {
    en: 'Target role is not eligible to become primary manager.',
    ar: 'دور الموظف المستهدف لا يؤهله ليكون مديرًا رئيسيًا.',
  },
  unique_constraint_conflict: {
    en: 'A conflict occurred. Please try again.',
    ar: 'حدث تعارض، يرجى المحاولة مرة أخرى.',
  },
  unknown: {
    en: 'Something went wrong. Please try again.',
    ar: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.',
  },
};

export function mapTransferPrimaryManagerCode(
  code: string | null | undefined,
  lang: TransferPrimaryManagerLang = 'en',
): string {
  const key = (code && (code in MESSAGES) ? code : 'unknown') as TransferPrimaryManagerCode;
  return MESSAGES[key][lang];
}

export function getTransferPrimaryManagerMessageEntries() {
  return MESSAGES;
}
