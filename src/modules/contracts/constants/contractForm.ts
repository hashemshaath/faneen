/**
 * Empty/default contract form state.
 */
import type { ContractForm } from '@/components/contracts/dashboard/create/contract-form-types';

export const emptyForm: ContractForm = {
  title_ar: '', title_en: '', description_ar: '', description_en: '',
  total_amount: '', currency_code: 'SAR', start_date: '', end_date: '',
  terms_ar: '', terms_en: '',
  supervisor_name: '', supervisor_phone: '', supervisor_email: '',
  client_email: '', vat_inclusive: false, vat_rate: '15',
};
