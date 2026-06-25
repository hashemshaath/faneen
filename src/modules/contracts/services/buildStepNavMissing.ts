/**
 * Builds the missing-requirements list shown in the toast when the
 * user tries to advance the contract wizard. Extracted from
 * DashboardContracts.tsx to keep that page under its line cap.
 */
import { pickBi } from '@/components/common/Bilingual';
import {
  CONTRACT_PARTY_MISSING_MESSAGES,
  type ContractPartyMissingRequirement,
} from './contractParties';

export interface BuildStepNavMissingInput {
  isRTL: boolean;
  activeStep: string;
  partyMissing: ContractPartyMissingRequirement[];
  selectedWorkType: unknown;
  workTypeTouched: boolean;
  contractPricingChoice: unknown;
  hasClient: boolean;
  isClientOnlyAccount: boolean;
  form: {
    title_ar?: string;
    total_amount?: string;
    start_date?: string;
    end_date?: string;
    vat_rate?: string;
  };
}

export function buildStepNavMissing(i: BuildStepNavMissingInput): string[] {
  const m: string[] = i.partyMissing.map((r) => CONTRACT_PARTY_MISSING_MESSAGES[r][i.isRTL ? 'ar' : 'en']);
  if (!(i.selectedWorkType && i.workTypeTouched)) m.push(pickBi(i.isRTL, 'اختر نوع العمل / الخدمة أولًا', 'Select work type / service first'));
  if (!i.contractPricingChoice) m.push(pickBi(i.isRTL, 'اختر طريقة التسعير قبل إنشاء العقد', 'Pick a pricing method before creating the contract'));
  if (!i.hasClient) m.push(pickBi(i.isRTL, i.isClientOnlyAccount ? 'الطرف الثاني' : 'العميل', i.isClientOnlyAccount ? 'Second party' : 'Client'));
  if (i.activeStep === 'details') {
    if (!i.form.title_ar) m.push(pickBi(i.isRTL, 'أدخل عنوان العقد', 'Enter contract title'));
    if (!i.form.total_amount || Number(i.form.total_amount) <= 0) m.push(pickBi(i.isRTL, 'أدخل قيمة العقد', 'Enter contract amount'));
    if (i.form.start_date && i.form.end_date && new Date(i.form.end_date) < new Date(i.form.start_date)) m.push(pickBi(i.isRTL, 'تاريخ الانتهاء قبل البدء', 'End date is before start date'));
  }
  if (i.activeStep === 'pricing' && !i.form.vat_rate) m.push(pickBi(i.isRTL, 'حدد نسبة الضريبة', 'Set the VAT rate'));
  return m;
}

export default buildStepNavMissing;