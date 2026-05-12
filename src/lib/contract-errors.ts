// C6.4a — Helper for future contract lock error mapping.
// No trigger is enforced yet; this is a forward-compatible utility.
export type ContractLockErrorCode = 'CONTRACT_LOCKED' | 'CONTRACT_STATUS_LOCKED';

export interface MappedContractError {
  code: ContractLockErrorCode | 'GENERIC';
  message: string;
}

const MESSAGES: Record<ContractLockErrorCode, { ar: string; en: string }> = {
  CONTRACT_LOCKED: {
    ar: 'لا يمكن تعديل هذا العقد مباشرة بعد تفعيله. يرجى استخدام نظام الملاحق لإجراء أي تعديل رسمي.',
    en: 'This contract is locked after activation. Use the amendment workflow to make any official change.',
  },
  CONTRACT_STATUS_LOCKED: {
    ar: 'لا يمكن تغيير حالة العقد مباشرة. استخدم إجراءات الإكمال أو الإلغاء.',
    en: 'Status changes must go through the complete or cancel actions.',
  },
};

export function mapContractLockError(err: unknown, isRTL: boolean): MappedContractError {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const upper = raw.toUpperCase();
  for (const code of Object.keys(MESSAGES) as ContractLockErrorCode[]) {
    if (upper.includes(code)) {
      return { code, message: isRTL ? MESSAGES[code].ar : MESSAGES[code].en };
    }
  }
  return { code: 'GENERIC', message: raw || (isRTL ? 'حدث خطأ' : 'Something went wrong') };
}
