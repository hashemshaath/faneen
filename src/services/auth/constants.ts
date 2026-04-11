export const countryCodes = [
  { code: '+966', flag: '🇸🇦', name_ar: 'السعودية', name_en: 'Saudi Arabia' },
  { code: '+971', flag: '🇦🇪', name_ar: 'الإمارات', name_en: 'UAE' },
  { code: '+965', flag: '🇰🇼', name_ar: 'الكويت', name_en: 'Kuwait' },
  { code: '+973', flag: '🇧🇭', name_ar: 'البحرين', name_en: 'Bahrain' },
  { code: '+968', flag: '🇴🇲', name_ar: 'عمان', name_en: 'Oman' },
  { code: '+974', flag: '🇶🇦', name_ar: 'قطر', name_en: 'Qatar' },
  { code: '+962', flag: '🇯🇴', name_ar: 'الأردن', name_en: 'Jordan' },
  { code: '+20', flag: '🇪🇬', name_ar: 'مصر', name_en: 'Egypt' },
  { code: '+964', flag: '🇮🇶', name_ar: 'العراق', name_en: 'Iraq' },
  { code: '+961', flag: '🇱🇧', name_ar: 'لبنان', name_en: 'Lebanon' },
] as const;

export type CountryCode = typeof countryCodes[number];

export const OTP_LENGTH = 6;
export const OTP_COOLDOWN_SECONDS = 60;
export const PHONE_MAX_LENGTH = 10;
