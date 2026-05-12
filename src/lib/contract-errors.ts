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

/* Provider Contract UX Polish — Part F: friendly create-flow error mapping. */
export type ContractCreateErrorCode =
  | 'MISSING_CLIENT'
  | 'MISSING_TEMPLATE'
  | 'TEMPLATE_NOT_PUBLISHED'
  | 'INVITATION_PENDING'
  | 'UNAUTHORIZED_BUSINESS'
  | 'SNAPSHOT_FAILED'
  | 'METHOD_NOT_ALLOWED'
  | 'INVALID_PRICING'
  | 'CONTRACT_LOCKED'
  | 'GENERIC';

const CREATE_MESSAGES: Record<ContractCreateErrorCode, { ar: string; en: string }> = {
  MISSING_CLIENT: { ar: 'يرجى اختيار العميل أو إرسال دعوة قبل إنشاء العقد.', en: 'Select a client or send an invitation before creating the contract.' },
  MISSING_TEMPLATE: { ar: 'يرجى اختيار قالب عقد منشور.', en: 'Please select a published contract template.' },
  TEMPLATE_NOT_PUBLISHED: { ar: 'هذا القالب غير منشور بعد. اختر إصداراً منشوراً.', en: 'This template is not published yet. Pick a published version.' },
  INVITATION_PENDING: { ar: 'الدعوة لا تزال قيد الانتظار. لن يُنشأ العقد قبل قبول العميل.', en: 'The invitation is still pending. The contract is created only after the client accepts.' },
  UNAUTHORIZED_BUSINESS: { ar: 'لا تملك صلاحية إنشاء عقد لهذا النشاط التجاري.', en: 'You do not have permission to create a contract for this business.' },
  SNAPSHOT_FAILED: { ar: 'تعذر تجهيز نسخة القالب الرسمية. يرجى المحاولة مرة أخرى.', en: 'Could not freeze the official template snapshot. Please try again.' },
  METHOD_NOT_ALLOWED: { ar: 'طريقة التسعير المختارة غير مسموحة في هذا القالب.', en: 'The selected pricing method is not allowed by this template.' },
  INVALID_PRICING: { ar: 'تعذر احتساب التسعير. يرجى مراجعة البيانات.', en: 'Pricing could not be calculated. Please review your inputs.' },
  CONTRACT_LOCKED: { ar: 'لا يمكن تعديل هذا العقد مباشرة. استخدم نظام الملاحق.', en: 'This contract is locked. Use the amendment workflow to make changes.' },
  GENERIC: { ar: 'تعذر إنشاء العقد. يرجى المحاولة لاحقاً.', en: 'Could not create the contract. Please try again later.' },
};

export function mapContractCreateError(err: unknown, isRTL: boolean): { code: ContractCreateErrorCode; message: string } {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const upper = raw.toUpperCase();

  // Reuse pricing/lock detection first
  const lock = mapContractLockError(err, isRTL);
  if (lock.code === 'INVALID_LINE_ITEM_PRICING') {
    return { code: 'INVALID_PRICING', message: lock.message };
  }
  if (lock.code === 'CONTRACT_LOCKED' || lock.code === 'CONTRACT_STATUS_LOCKED') {
    return { code: 'CONTRACT_LOCKED', message: lock.message };
  }

  const checks: Array<[RegExp, ContractCreateErrorCode]> = [
    [/CLIENT.*NOT.*FOUND|MISSING_CLIENT|اختيار العميل|select a client/i, 'MISSING_CLIENT'],
    [/TEMPLATE.*NOT.*PUBLISHED|NOT_PUBLISHED/i, 'TEMPLATE_NOT_PUBLISHED'],
    [/NO.*PUBLISHED.*TEMPLATE|MISSING_TEMPLATE|قالب عقد/i, 'MISSING_TEMPLATE'],
    [/INVITATION_PENDING|INVITE.*PENDING/i, 'INVITATION_PENDING'],
    [/UNAUTHORIZED|PERMISSION_DENIED|RLS|FORBIDDEN/i, 'UNAUTHORIZED_BUSINESS'],
    [/SNAPSHOT.*FAILED|FAILED_TO_SNAPSHOT|create_contract_from_template/i, 'SNAPSHOT_FAILED'],
    [/METHOD_NOT_ALLOWED/i, 'METHOD_NOT_ALLOWED'],
  ];
  for (const [re, code] of checks) {
    if (re.test(upper) || re.test(raw)) {
      return { code, message: isRTL ? CREATE_MESSAGES[code].ar : CREATE_MESSAGES[code].en };
    }
  }
  return {
    code: 'GENERIC',
    message: raw && raw.length < 160 && !/^[A-Z_]+$/.test(raw)
      ? raw
      : (isRTL ? CREATE_MESSAGES.GENERIC.ar : CREATE_MESSAGES.GENERIC.en),
  };
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
