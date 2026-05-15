// City name normalizer for Saudi cities (AR/EN variants).
// Used internally for matching only — never mutates user-entered text.

const STRIP = /[\u064B-\u065F\u0670\u06D6-\u06ED\s\-_'"`.()،,]+/g;

function basic(s: string): string {
  if (!s) return '';
  return s
    .toString()
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(STRIP, '');
}

// Map of canonical key -> all known aliases (after basic())
const ALIASES: Record<string, string[]> = {
  riyadh: ['الرياض', 'رياض', 'riyadh', 'alriyadh'],
  jeddah: ['جده', 'جدة', 'jeddah', 'jedda', 'jiddah'],
  makkah: ['مكه', 'مكة', 'مكهالمكرمه', 'مكةالمكرمة', 'makkah', 'mecca', 'makka'],
  madinah: ['المدينه', 'المدينة', 'المدينهالمنوره', 'المدينةالمنورة', 'madinah', 'medina', 'almadinah'],
  dammam: ['الدمام', 'دمام', 'dammam', 'aldammam'],
  khobar: ['الخبر', 'خبر', 'khobar', 'alkhobar'],
  dhahran: ['الظهران', 'ظهران', 'dhahran'],
  taif: ['الطائف', 'طائف', 'taif', 'altaif'],
  abha: ['ابها', 'أبها', 'abha'],
  tabuk: ['تبوك', 'tabuk'],
  buraydah: ['بريده', 'بريدة', 'buraydah', 'buraidah'],
  qassim: ['القصيم', 'قصيم', 'qassim', 'alqassim'],
  hail: ['حائل', 'hail'],
  jazan: ['جازان', 'jazan', 'jizan'],
  najran: ['نجران', 'najran'],
  yanbu: ['ينبع', 'yanbu', 'yanbo'],
  jubail: ['الجبيل', 'جبيل', 'jubail', 'aljubail'],
  ahsa: ['الاحساء', 'الإحساء', 'الأحساء', 'احساء', 'ahsa', 'alahsa', 'hasa'],
};

const REVERSE: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [key, list] of Object.entries(ALIASES)) {
    m.set(basic(key), key);
    for (const a of list) m.set(basic(a), key);
  }
  return m;
})();

export function normalizeCityName(city: string | null | undefined): string {
  if (!city) return '';
  const b = basic(city);
  return REVERSE.get(b) ?? b;
}

export function citiesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeCityName(a);
  const nb = normalizeCityName(b);
  return !!na && na === nb;
}