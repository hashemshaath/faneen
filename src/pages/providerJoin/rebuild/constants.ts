import type { StepDef } from './types';

export const DRAFT_STORAGE_KEY = 'qitaat_provider_lead_draft_v1';

export const STEPS: StepDef[] = [
  { id: 1, titleAr: 'بيانات المنشأة والخدمات', titleEn: 'Business & Services', descAr: 'الاسم، النشاط، التخصصات والعلامات.', descEn: 'Name, activity, specialties and brands.' },
  { id: 2, titleAr: 'التواصل والموقع', titleEn: 'Contact & Location', descAr: 'بيانات المسؤول والوصول للمنشأة.', descEn: 'Contact person and how to reach you.' },
  { id: 3, titleAr: 'البيانات الرسمية والفروع', titleEn: 'Official & Branches', descAr: 'السجل، الرقم الموحد، والفروع.', descEn: 'CR, unified number, and branches.' },
  { id: 4, titleAr: 'المراجعة والإرسال', titleEn: 'Review & Submit', descAr: 'تأكد من البيانات قبل الإرسال.', descEn: 'Confirm details before submitting.' },
];

export const DEFAULT_SERVICES_AR = [
  'مطابخ ألمنيوم','مطابخ خشب','مطابخ عالمية','أنظمة ذكية','مصاعد',
  'حلول استدامة','طاقة شمسية','أنظمة مراقبة','ديكورات خشبية','أعمال ديكور','خزائن ملابس',
];
export const DEFAULT_SERVICES_EN = [
  'Aluminum Kitchens','Wood Kitchens','Modern Kitchens','Smart Systems','Elevators',
  'Sustainability Solutions','Solar Energy','Surveillance Systems','Wood Decorations','Decor Works','Wardrobes',
];

export const CR_ACCEPT = '.pdf,image/jpeg,image/png,application/pdf';

export const STEP_FIELD_KEYS: Record<1 | 2 | 3, string[]> = {
  1: ['name_ar'],
  2: ['contact_name', 'email', 'phone', 'website', 'map_link'],
  3: ['cr_file', 'branches_count'],
};