import type { ProviderLeadFormState, ProviderLeadBranchInput, ErrorMap } from './types';

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isSaudiOrIntlPhone = (v: string) => {
  const s = v.replace(/[\s-]/g, '');
  return /^(?:\+?966|0)?5\d{8}$/.test(s) || /^\+?\d{7,15}$/.test(s);
};
export const isUrl = (v: string) => {
  if (!v) return true;
  try { new URL(v.startsWith('http') ? v : `https://${v}`); return true; } catch { return false; }
};
export const isCrNumber = (v: string) => !v || /^\d{7,12}$/.test(v.replace(/\D/g, ''));
export const isUnifiedNumber = (v: string) => !v || /^\d{7,12}$/.test(v.replace(/\D/g, ''));
export const isVatNumber = (v: string) => !v || /^3\d{13}3$/.test(v.replace(/\D/g, ''));
export const isNationalAddress = (v: string) => !v || /^[A-Za-z]{4}\d{4}$/i.test(v.replace(/\s/g, ''));

export function validateProviderLeadForm(
  form: ProviderLeadFormState,
  branches: ProviderLeadBranchInput[],
  t: (ar: string, en: string) => string,
): ErrorMap {
  const er: ErrorMap = {};
  if (!form.name_ar.trim()) er.name_ar = t('يرجى إدخال اسم المنشأة بالعربية', 'Please enter the business name in Arabic');
  else if (form.name_ar.trim().length < 2) er.name_ar = t('الاسم قصير جداً', 'Name is too short');
  if (!form.contact_name.trim()) er.contact_name = t('يرجى إدخال اسم المسؤول', 'Please enter the contact name');
  if (!form.email.trim()) er.email = t('يرجى إدخال البريد الإلكتروني', 'Please enter your email');
  else if (!isEmail(form.email)) er.email = t('صيغة البريد الإلكتروني غير صحيحة', 'Invalid email format');
  if (!form.phone.trim()) er.phone = t('يرجى إدخال رقم الجوال', 'Please enter your phone number');
  else if (!isSaudiOrIntlPhone(form.phone)) er.phone = t('رقم الجوال غير صحيح', 'Invalid phone number');
  if (form.website && !isUrl(form.website)) er.website = t('رابط الموقع غير صحيح', 'Invalid website URL');
  if (form.map_link && !isUrl(form.map_link)) er.map_link = t('رابط الخريطة غير صحيح', 'Invalid map URL');
  if (form.cr_number && !isCrNumber(form.cr_number)) er.cr_number = t('رقم السجل غير صحيح', 'Invalid CR number');
  if (form.unified_number && !isUnifiedNumber(form.unified_number)) er.unified_number = t('الرقم الموحد غير صحيح', 'Invalid unified number');
  if (form.vat_number && !isVatNumber(form.vat_number)) er.vat_number = t('الرقم الضريبي غير صحيح', 'Invalid VAT number');
  if (form.national_address && !isNationalAddress(form.national_address)) er.national_address = t('العنوان الوطني غير صحيح', 'Invalid national address');
  if (form.branches_count < 1) er.branches_count = t('عدد الفروع 1 أو أكثر', 'Branches must be 1 or more');
  branches.forEach((b, i) => {
    if (!b.branch_name.trim()) er[`branch_${i}_name`] = t(`أدخل اسم الفرع ${i + 2}`, `Enter name for branch ${i + 2}`);
  });
  return er;
}

export function pickStepErrors(all: ErrorMap, step: 1 | 2 | 3 | 4): ErrorMap {
  const keys: Record<1 | 2 | 3 | 4, (k: string) => boolean> = {
    1: (k) => ['name_ar'].includes(k),
    2: (k) => ['contact_name', 'email', 'phone', 'website', 'map_link', 'national_address'].includes(k),
    3: (k) => ['cr_number', 'unified_number', 'vat_number', 'branches_count', 'cr_file'].includes(k) || k.startsWith('branch_'),
    4: () => true,
  };
  return Object.fromEntries(Object.entries(all).filter(([k]) => keys[step](k)));
}

export function completionPercent(form: ProviderLeadFormState): number {
  const fields = [
    !!form.name_ar.trim(), !!form.main_activity.trim(), form.specialties.length > 0,
    !!form.contact_name.trim(), !!form.email.trim(), !!form.phone.trim(),
    !!form.city.trim() || !!form.national_address.trim(),
    !!form.cr_number.trim() || !!form.unified_number.trim(),
    form.branches_count >= 1,
    !!form.brief.trim(),
  ];
  const done = fields.filter(Boolean).length;
  return Math.round((done / fields.length) * 100);
}