/**
 * CONTRACT PARTY MODEL — central resolver (Phase B).
 *
 * Single source of truth for who the contract parties are and whether
 * a draft can be created from a given UI surface. Replaces inline
 * `isClientOnlyAccount` / eligibility logic that previously lived in
 * `DashboardContracts.tsx` and `WorkspaceContractsTab.tsx`.
 *
 * Party model (Qitaat):
 *   - First party  = الجهة المنفذة (executing provider business).
 *     Sourced from `selectedProviderBusinessId` with fallback to the
 *     legacy project `businessId` (business-owned projects).
 *   - Second party = صاحب الحساب / طالب الخدمة. In client-only
 *     accounts this is always `auth.uid()`; on provider/admin
 *     surfaces it is the explicitly picked target user.
 *
 * The helper is pure. It does NOT touch the network, does NOT mutate
 * state, does NOT change contract lifecycle, and does NOT alter
 * template filtering. It only labels parties and reports what is
 * still missing before a draft can be created.
 */

export type ContractPartyMissingRequirement =
  | 'missing_first_party'
  | 'missing_second_party_profile'
  | 'missing_execution_site'
  | 'missing_sector'
  | 'missing_template'
  | 'missing_scope_of_work'
  | 'missing_contract_terms'
  | 'missing_warranty'
  | 'missing_payment_terms'
  | 'missing_execution_duration'
  | 'missing_delivery_terms'
  | 'missing_project'
  | 'missing_permission';

export const CONTRACT_PARTY_MISSING_MESSAGES: Record<
  ContractPartyMissingRequirement,
  { ar: string; en: string }
> = {
  missing_first_party: {
    ar: 'اختر الجهة المنفذة لتحديد الطرف الأول',
    en: 'Select the executing provider to set the first party',
  },
  missing_second_party_profile: {
    ar: 'أكمل بيانات الطرف الثاني قبل إنشاء العقد',
    en: 'Complete second-party profile details before creating the contract',
  },
  missing_execution_site: {
    ar: 'أضف موقع التنفيذ قبل إنشاء العقد',
    en: 'Add an execution site before creating the contract',
  },
  missing_sector: {
    ar: 'اختر المجال / التخصص قبل اختيار القالب',
    en: 'Select the sector / specialty before choosing a template',
  },
  missing_template: {
    ar: 'لا يوجد قالب عقد متاح حاليًا',
    en: 'No contract template is currently available',
  },
  missing_scope_of_work: {
    ar: 'أضف نطاق العمل قبل إنشاء العقد',
    en: 'Add the scope of work before creating the contract',
  },
  missing_contract_terms: {
    ar: 'أكمل بنود العقد أو اختر قالبًا يتضمنها',
    en: 'Complete contract terms or choose a template that includes them',
  },
  missing_warranty: {
    ar: 'حدد الضمان أو خيار لا يوجد ضمان',
    en: 'Set warranty terms or choose no warranty',
  },
  missing_payment_terms: {
    ar: 'حدد الدفعات أو طريقة الدفع المتفق عليها',
    en: 'Set payment terms or the agreed payment method',
  },
  missing_execution_duration: {
    ar: 'حدد مدة التنفيذ قبل إنشاء العقد',
    en: 'Set the execution duration before creating the contract',
  },
  missing_delivery_terms: {
    ar: 'حدد شروط التسليم أو اختر قالبًا يتضمنها',
    en: 'Set delivery terms or choose a template that includes them',
  },
  missing_project: {
    ar: 'حدد المشروع قبل إنشاء العقد',
    en: 'Select a project before creating the contract',
  },
  missing_permission: {
    ar: 'ليس لديك صلاحية على هذا المشروع',
    en: 'You do not have permission on this project',
  },
};

export interface ResolveContractPartiesInput {
  readonly user: { id: string } | null;
  readonly profile: {
    full_name?: string | null;
    phone?: string | null;
  } | null;
  readonly isAdmin: boolean;
  readonly isProvider: boolean;
  /** Owned-business id for the signed-in user; `null` means none. */
  readonly ownedBusinessId: string | null;
  /** Edit mode disables client-only auto-fill so admins can fix data. */
  readonly editingId?: string | null;

  readonly firstParty: {
    selectedProviderBusinessId?: string | null;
    fallbackBusinessId?: string | null;
    displayName?: string | null;
  };

  readonly secondParty?: {
    userId?: string | null;
    displayName?: string | null;
    hasProfile?: boolean;
  };

  readonly executionSiteId?: string | null;
  readonly projectId?: string | null;
  readonly sectorId?: string | null;
  readonly templateId?: string | null;
  readonly hasScopeOfWork?: boolean;
  readonly hasContractTerms?: boolean;
  readonly hasWarrantyTerms?: boolean;
  readonly hasPaymentTerms?: boolean;
  readonly hasExecutionDuration?: boolean;
  readonly hasDeliveryTerms?: boolean;
  /** Workspace surfaces require an explicit project context. */
  readonly requiresProject?: boolean;
  /** Caller-supplied permission gate (e.g. workspace ownership). */
  readonly hasPermission?: boolean;
}

export interface ResolvedContractParties {
  readonly firstPartyBusinessId: string | null;
  readonly firstPartyDisplayName: string | null;
  readonly firstPartyRoleLabel: { ar: string; en: string };
  readonly secondPartyUserId: string | null;
  readonly secondPartyDisplayName: string | null;
  readonly secondPartyRoleLabel: { ar: string; en: string };
  readonly executionSiteId: string | null;
  readonly projectId: string | null;
  readonly sectorId: string | null;
  readonly templateId: string | null;
  readonly isClientOnlyAccount: boolean;
  readonly isEligible: boolean;
  readonly missingRequirements: ContractPartyMissingRequirement[];
}

const FIRST_PARTY_LABEL = { ar: 'الجهة المنفذة', en: 'Executing provider' } as const;
const SECOND_PARTY_LABEL = {
  ar: 'صاحب الحساب / طالب الخدمة',
  en: 'Account holder / service requester',
} as const;

export function resolveContractPartiesAndEligibility(
  input: ResolveContractPartiesInput,
): ResolvedContractParties {
  const {
    user,
    profile,
    isAdmin,
    isProvider,
    ownedBusinessId,
    editingId,
    firstParty,
    secondParty,
    executionSiteId = null,
    projectId = null,
    sectorId = null,
    templateId = null,
    requiresProject = false,
    hasPermission = true,
    hasScopeOfWork,
    hasContractTerms,
    hasWarrantyTerms,
    hasPaymentTerms,
    hasExecutionDuration,
    hasDeliveryTerms,
  } = input;

  const isClientOnlyAccount =
    !!user && !isAdmin && !isProvider && ownedBusinessId === null && !editingId;

  const firstPartyBusinessId =
    firstParty.selectedProviderBusinessId ?? firstParty.fallbackBusinessId ?? null;

  const secondPartyUserId = isClientOnlyAccount
    ? user?.id ?? null
    : secondParty?.userId ?? null;

  const secondPartyDisplayName = isClientOnlyAccount
    ? profile?.full_name ?? null
    : secondParty?.displayName ?? null;

  const secondPartyHasProfile = isClientOnlyAccount
    ? !!(profile?.full_name && profile?.phone)
    : secondParty?.hasProfile ?? !!secondParty?.userId;

  const missing: ContractPartyMissingRequirement[] = [];
  if (!hasPermission) missing.push('missing_permission');
  if (requiresProject && !projectId) missing.push('missing_project');
  if (!firstPartyBusinessId) missing.push('missing_first_party');
  if ((isClientOnlyAccount && (!secondPartyUserId || !secondPartyHasProfile)) || (!isClientOnlyAccount && !secondPartyHasProfile))
    missing.push('missing_second_party_profile');
  if (!executionSiteId) missing.push('missing_execution_site');
  if (Object.prototype.hasOwnProperty.call(input, 'sectorId') && !sectorId)
    missing.push('missing_sector');
  if (Object.prototype.hasOwnProperty.call(input, 'templateId') && !templateId)
    missing.push('missing_template');
  if (hasScopeOfWork === false) missing.push('missing_scope_of_work');
  if (hasContractTerms === false) missing.push('missing_contract_terms');
  if (hasWarrantyTerms === false) missing.push('missing_warranty');
  if (hasPaymentTerms === false) missing.push('missing_payment_terms');
  if (hasExecutionDuration === false) missing.push('missing_execution_duration');
  if (hasDeliveryTerms === false) missing.push('missing_delivery_terms');

  return {
    firstPartyBusinessId,
    firstPartyDisplayName: firstParty.displayName ?? null,
    firstPartyRoleLabel: FIRST_PARTY_LABEL,
    secondPartyUserId,
    secondPartyDisplayName,
    secondPartyRoleLabel: SECOND_PARTY_LABEL,
    executionSiteId,
    projectId,
    sectorId,
    templateId,
    isClientOnlyAccount,
    isEligible: missing.length === 0,
    missingRequirements: missing,
  };
}