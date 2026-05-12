// C6.4a — Helper for future contract lock error mapping.
// CT5B — Extended with INVALID_LINE_ITEM_PRICING:* mapping.
export type ContractLockErrorCode = 'CONTRACT_LOCKED' | 'CONTRACT_STATUS_LOCKED';

export type LineItemPricingErrorCode =
  | 'unsupported_method'
  | 'missing_length'
  | 'missing_width'
  | 'missing_height'
  | 'missing_weight'
  | 'negative_value'
  | 'value_too_large'
  | 'invalid_number'
  | 'invalid_total'
  | 'method_not_allowed_by_template';

export interface MappedContractError {
  code: ContractLockErrorCode | 'INVALID_LINE_ITEM_PRICING' | 'GENERIC';
  message: string;
  pricingError?: LineItemPricingErrorCode;
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

const PRICING_MESSAGES: Record<LineItemPricingErrorCode, { ar: string; en: string }> = {
  unsupported_method: {
    ar: 'طريقة التسعير غير مدعومة حالياً.',
    en: 'This pricing method is not supported yet.',
  },
  missing_length: { ar: 'يرجى إدخال الطول بشكل صحيح.', en: 'Please enter a valid length.' },
  missing_width:  { ar: 'يرجى إدخال العرض بشكل صحيح.', en: 'Please enter a valid width.' },
  missing_height: { ar: 'يرجى إدخال الارتفاع بشكل صحيح.', en: 'Please enter a valid height.' },
  missing_weight: { ar: 'يرجى إدخال الوزن بشكل صحيح.', en: 'Please enter a valid weight.' },
  negative_value: {
    ar: 'لا يمكن استخدام قيم سالبة في حساب التكلفة.',
    en: 'Negative values are not allowed in pricing.',
  },
  value_too_large: {
    ar: 'القيمة المدخلة كبيرة جداً. يرجى مراجعة القياسات.',
    en: 'The value entered is too large. Please review the measurements.',
  },
  invalid_number: {
    ar: 'تعذر احتساب تكلفة البند. يرجى مراجعة البيانات.',
    en: 'Could not calculate the line item cost. Please review the inputs.',
  },
  invalid_total: {
    ar: 'تعذر احتساب تكلفة البند. يرجى مراجعة البيانات.',
    en: 'Could not calculate the line item cost. Please review the inputs.',
  },
  method_not_allowed_by_template: {
    ar: 'طريقة التسعير المختارة غير مسموحة في قالب العقد الحالي.',
    en: 'The selected pricing method is not allowed by the current contract template.',
  },
};

export function mapContractLockError(err: unknown, isRTL: boolean): MappedContractError {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const upper = raw.toUpperCase();

  // CT5B — Pricing trigger error: INVALID_LINE_ITEM_PRICING:<code>
  const pricingMatch = raw.match(/INVALID_LINE_ITEM_PRICING:([a-z_]+)/i);
  if (pricingMatch) {
    const code = pricingMatch[1].toLowerCase() as LineItemPricingErrorCode;
    const meta = PRICING_MESSAGES[code] ?? PRICING_MESSAGES.invalid_total;
    return {
      code: 'INVALID_LINE_ITEM_PRICING',
      pricingError: code,
      message: isRTL ? meta.ar : meta.en,
    };
  }

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
