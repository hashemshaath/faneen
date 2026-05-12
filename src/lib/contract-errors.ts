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
    ar: 'لا يمكن تغيير حالة العقد مباشرة. استخدم إجراءات الإكمال أو الإلغاء أو النزاع.',
    en: 'Status changes must go through the complete or cancel actions.',
  },
};

export function mapContractLockError(err: unknown, isRTL: boolean): MappedContractError {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const upper = raw.toUpperCase();
  // Legacy alias: the older `contracts_financial_lock` trigger raises
  // `contract_locked_use_amendment` for total/date/terms changes on active+ rows.
  if (upper.includes('CONTRACT_LOCKED_USE_AMENDMENT')) {
    return { code: 'CONTRACT_LOCKED', message: isRTL ? MESSAGES.CONTRACT_LOCKED.ar : MESSAGES.CONTRACT_LOCKED.en };
  }
  for (const code of Object.keys(MESSAGES) as ContractLockErrorCode[]) {
    if (upper.includes(code)) {
      return { code, message: isRTL ? MESSAGES[code].ar : MESSAGES[code].en };
    }
  }
  return { code: 'GENERIC', message: raw || (isRTL ? 'حدث خطأ' : 'Something went wrong') };
}
