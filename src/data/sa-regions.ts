/**
 * Saudi Arabia administrative regions + mapping of common cities to their
 * region. Used by the business-edit page to (a) present a region dropdown
 * and (b) filter the city list once a region is picked.
 *
 * The mapping uses normalized AR/EN substrings — the lookup compares against
 * the city row's `name_ar` / `name_en` from the DB.
 */
export type SaRegionId =
  | 'riyadh'
  | 'makkah'
  | 'madinah'
  | 'eastern'
  | 'asir'
  | 'tabuk'
  | 'hail'
  | 'qassim'
  | 'northern_borders'
  | 'jazan'
  | 'najran'
  | 'bahah'
  | 'jouf';

export interface SaRegion {
  id: SaRegionId;
  name_ar: string;
  name_en: string;
  /** lowercase tokens — any city whose name (ar/en) contains one of these is in this region */
  cityTokens: string[];
}

export const SA_REGIONS: SaRegion[] = [
  { id: 'riyadh',           name_ar: 'منطقة الرياض',          name_en: 'Riyadh Region',
    cityTokens: ['الرياض','riyadh','الخرج','kharj','الدوادمي','dawadmi','المجمعة','majmaah','شقراء','shaqra','الزلفي','zulfi','وادي الدواسر','wadi','الافلاج','aflaj','حوطة بني تميم','hotat'] },
  { id: 'makkah',           name_ar: 'منطقة مكة المكرمة',     name_en: 'Makkah Region',
    cityTokens: ['مكة','makkah','mecca','جدة','jeddah','jiddah','الطائف','taif','ينبع','yanbu','رابغ','rabigh','القنفذة','qunfudhah','الليث','laith','خليص','khulays','الجموم','jamoom'] },
  { id: 'madinah',          name_ar: 'منطقة المدينة المنورة',  name_en: 'Madinah Region',
    cityTokens: ['المدينة','madinah','medina','العلا','ula','بدر','badr','الحناكية','hanakiyah','مهد الذهب','mahd'] },
  { id: 'eastern',          name_ar: 'المنطقة الشرقية',        name_en: 'Eastern Region',
    cityTokens: ['الدمام','dammam','الخبر','khobar','الظهران','dhahran','الاحساء','الأحساء','ahsa','hasa','الجبيل','jubail','القطيف','qatif','حفر الباطن','hafar','رأس تنورة','ras tanura','بقيق','buqayq','الخفجي','khafji','النعيرية','nuayriyah'] },
  { id: 'asir',             name_ar: 'منطقة عسير',             name_en: 'Asir Region',
    cityTokens: ['ابها','أبها','abha','خميس مشيط','khamis','بيشة','bisha','محايل','muhayil','النماص','namas','تثليث','tathlith','ظهران الجنوب','dhahran al janub','سراة عبيدة','sarat'] },
  { id: 'tabuk',            name_ar: 'منطقة تبوك',             name_en: 'Tabuk Region',
    cityTokens: ['تبوك','tabuk','نيوم','neom','ضباء','duba','الوجه','wajh','حقل','haql','تيماء','tayma','أملج','umluj'] },
  { id: 'hail',             name_ar: 'منطقة حائل',             name_en: 'Hail Region',
    cityTokens: ['حائل','hail','بقعاء','baqaa','الشنان','shinan','الغزالة','ghazalah'] },
  { id: 'qassim',           name_ar: 'منطقة القصيم',           name_en: 'Qassim Region',
    cityTokens: ['بريدة','buraidah','buraydah','عنيزة','unayzah','الرس','rass','المذنب','muthnib','البكيرية','bukayriyah','البدائع','badai','الأسياح','asyah','رياض الخبراء','riyadh al khabra'] },
  { id: 'northern_borders', name_ar: 'منطقة الحدود الشمالية',  name_en: 'Northern Borders',
    cityTokens: ['عرعر','arar','رفحاء','rafha','طريف','turaif','العويقيلة'] },
  { id: 'jazan',            name_ar: 'منطقة جازان',             name_en: 'Jazan Region',
    cityTokens: ['جازان','jazan','jizan','صبيا','sabya','أبو عريش','abu arish','صامطة','samtah','بيش','baysh','الدرب','darb','فرسان','farasan'] },
  { id: 'najran',           name_ar: 'منطقة نجران',             name_en: 'Najran Region',
    cityTokens: ['نجران','najran','شرورة','sharurah','حبونا','habuna','بدر الجنوب','badr al janub'] },
  { id: 'bahah',            name_ar: 'منطقة الباحة',            name_en: 'Al Bahah Region',
    cityTokens: ['الباحة','bahah','baljurashi','بلجرشي','المندق','mandaq','قلوة','qilwah','المخواة','makhwah'] },
  { id: 'jouf',             name_ar: 'منطقة الجوف',             name_en: 'Al Jouf Region',
    cityTokens: ['سكاكا','sakaka','القريات','qurayyat','دومة الجندل','dumat','طبرجل','tabarjal'] },
];

const normalize = (s: string | null | undefined): string =>
  (s ?? '')
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();

/** Find the region that best matches a city by its AR/EN name. */
export function findRegionForCity(
  nameAr: string | null | undefined,
  nameEn: string | null | undefined,
): SaRegionId | null {
  const ar = normalize(nameAr);
  const en = normalize(nameEn);
  for (const r of SA_REGIONS) {
    for (const tok of r.cityTokens) {
      const t = normalize(tok);
      if (!t) continue;
      if ((ar && ar.includes(t)) || (en && en.includes(t))) return r.id;
    }
  }
  return null;
}

export function getRegionById(id: string | null | undefined): SaRegion | null {
  if (!id) return null;
  return SA_REGIONS.find((r) => r.id === id) ?? null;
}

/** Match a free-text region label (AR/EN, possibly stored in `businesses.region`) to a region id. */
export function findRegionByLabel(label: string | null | undefined): SaRegionId | null {
  const n = normalize(label);
  if (!n) return null;
  for (const r of SA_REGIONS) {
    if (normalize(r.name_ar).includes(n) || n.includes(normalize(r.name_ar))) return r.id;
    if (normalize(r.name_en).includes(n) || n.includes(normalize(r.name_en))) return r.id;
  }
  return null;
}