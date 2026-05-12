/**
 * Catalog of priceable services across Qitaat sectors.
 *
 * Powers /services (comparison + pricing + filters) and
 * /services/:slug (per-service SEO landing with Service + FAQPage JSON-LD).
 *
 * Prices are typical Saudi-market ranges in SAR per stated unit; orientation only.
 */
import type { SectorSlug } from './sector-keywords';

export type QualityTier = 'economy' | 'standard' | 'premium';
export type ServiceUnit = 'm2' | 'meter' | 'piece' | 'project';

export interface ServiceFeature {
  id: string;
  ar: string;
  en: string;
}

export interface ServiceFaq {
  q_ar: string;
  q_en: string;
  a_ar: string;
  a_en: string;
}

export interface ServiceEntry {
  slug: string;
  sector: SectorSlug;
  name_ar: string;
  name_en: string;
  tagline_ar: string;
  tagline_en: string;
  description_ar: string;
  description_en: string;
  unit: ServiceUnit;
  price_min: number;
  price_max: number;
  quality: QualityTier;
  lead_time_days: number;
  warranty_years: number;
  features: ServiceFeature[];
  faq: ServiceFaq[];
  keywords: string[];
}

const f = (id: string, ar: string, en: string): ServiceFeature => ({ id, ar, en });

const FEAT = {
  thermalBreak: f('thermal_break', 'قطاع حراري', 'Thermal-break profile'),
  doubleGlazing: f('double_glazing', 'زجاج مزدوج', 'Double glazing'),
  soundProof: f('soundproof', 'عزل صوتي', 'Sound insulation'),
  fireRated: f('fire_rated', 'مقاومة حريق A2', 'A2 fire-rated'),
  pvdf: f('pvdf', 'طلاء PVDF', 'PVDF coating'),
  smartMotor: f('smart_motor', 'تشغيل ذكي', 'Smart motor / app'),
  galvanized: f('galvanized', 'مجلفن', 'Galvanized steel'),
  laserCut: f('laser_cut', 'قص ليزر', 'Laser-cut design'),
  temperedGlass: f('tempered', 'زجاج مقسّى', 'Tempered glass'),
  laminated: f('laminated', 'زجاج مصفّح', 'Laminated safety glass'),
  cncWood: f('cnc_wood', 'CNC خشب', 'CNC-routed wood'),
  solidSurface: f('solid_surface', 'كوريان', 'Solid-surface counters'),
  softClose: f('soft_close', 'مفصلات صامتة', 'Soft-close hinges'),
  warranty5: f('warranty_5y', 'ضمان 5+ سنوات', '5+ year warranty'),
  installation: f('installation', 'تركيب احترافي', 'Pro installation included'),
} as const;

export const SERVICES_CATALOG: ServiceEntry[] = [
  {
    slug: 'aluminum-windows',
    sector: 'aluminum',
    name_ar: 'تركيب شبابيك ألمنيوم',
    name_en: 'Aluminum windows installation',
    tagline_ar: 'شبابيك ألمنيوم عازلة بزجاج مزدوج وقطاع حراري.',
    tagline_en: 'Insulated aluminum windows with double glazing and thermal break.',
    description_ar: 'أسعار شبابيك الألمنيوم في السعودية لكل متر مربع، ومقارنة بين القطاعات الحرارية والعادية مع أنواع الزجاج المزدوج والمصفّح.',
    description_en: 'Saudi aluminum window prices per m², comparing thermal-break vs standard profiles and double / laminated glazing options.',
    unit: 'm2', price_min: 380, price_max: 950, quality: 'standard', lead_time_days: 14, warranty_years: 5,
    features: [FEAT.thermalBreak, FEAT.doubleGlazing, FEAT.soundProof, FEAT.warranty5, FEAT.installation],
    faq: [
      { q_ar: 'كم سعر متر شباك الألمنيوم في السعودية؟', q_en: 'Price per m² of aluminum windows in Saudi Arabia?',
        a_ar: 'بين 380 و950 ريالاً للمتر شاملاً الزجاج والتركيب، حسب نوع القطاع وسماكة الزجاج.',
        a_en: 'SAR 380–950 per m² including glass and installation, depending on profile and glazing.' },
      { q_ar: 'هل الفرق بين القطاع العادي والحراري كبير؟', q_en: 'Is the gap between standard and thermal-break big?',
        a_ar: 'نعم، الحراري يقلل انتقال الحرارة حتى 35% ويوفّر الكهرباء، بزيادة سعر 25–40%.',
        a_en: 'Yes — thermal break cuts heat transfer up to 35% at ~25–40% higher cost.' },
      { q_ar: 'كم تستغرق مدة التصنيع والتركيب؟', q_en: 'How long does installation take?',
        a_ar: 'من 10 إلى 18 يوم عمل في المتوسط.', a_en: '10–18 working days on average.' },
    ],
    keywords: ['شبابيك ألمنيوم', 'سعر متر ألمنيوم', 'ثيرموبريك', 'aluminum windows price'],
  },
  {
    slug: 'aluminum-cladding', sector: 'aluminum',
    name_ar: 'كلادينج واجهات ألمنيوم', name_en: 'Aluminum cladding facades',
    tagline_ar: 'واجهات ACP بطلاء PVDF ومقاومة حريق A2.',
    tagline_en: 'ACP facades with PVDF coating and A2 fire rating.',
    description_ar: 'مقارنة أسعار الكلادينج للمتر المربع، مع شرح فروقات السماكة وأنواع الحشو المقاوم للحريق وضمانات طلاء PVDF.',
    description_en: 'Compare aluminum cladding prices per m², with thickness, fire-rated cores, and PVDF coating warranties.',
    unit: 'm2', price_min: 220, price_max: 520, quality: 'standard', lead_time_days: 21, warranty_years: 10,
    features: [FEAT.pvdf, FEAT.fireRated, FEAT.warranty5, FEAT.installation],
    faq: [
      { q_ar: 'ما الفرق بين الكلادينج العادي والمقاوم للحريق؟', q_en: 'Standard vs fire-rated cladding?',
        a_ar: 'العادي حشوه قابل للاشتعال، أما A2 فمعدني ولا ينشر اللهب — مطلوب فوق 18م.',
        a_en: 'Standard cores are flammable; A2 cores are mineral and required above 18 m.' },
      { q_ar: 'كم سنة ضمان طلاء PVDF؟', q_en: 'PVDF warranty years?',
        a_ar: 'الموردون المعتمدون يقدمون 10–15 سنة ضد البهتان عند Kynar 500.',
        a_en: 'Approved suppliers warranty 10–15 years against fading with Kynar 500.' },
    ],
    keywords: ['كلادينج', 'واجهات ألمنيوم', 'ACP', 'PVDF', 'aluminum cladding'],
  },
  {
    slug: 'aluminum-pergolas', sector: 'aluminum',
    name_ar: 'برجولات ألمنيوم', name_en: 'Aluminum pergolas',
    tagline_ar: 'برجولات ثابتة ومتحركة ذكية بمحركات IP65.',
    tagline_en: 'Fixed & motorized smart pergolas with IP65 motors.',
    description_ar: 'مقارنة أسعار برجولات الألمنيوم الثابتة، الريش المتحركة، والذكية بالتحكم عن بعد، مع البحور والضمانات.',
    description_en: 'Compare prices of fixed, louvered, and smart aluminum pergolas with span ranges and warranty terms.',
    unit: 'm2', price_min: 450, price_max: 1600, quality: 'premium', lead_time_days: 18, warranty_years: 5,
    features: [FEAT.smartMotor, FEAT.pvdf, FEAT.warranty5, FEAT.installation],
    faq: [
      { q_ar: 'هل البرجولا الذكية تستحق فرق السعر؟', q_en: 'Are smart pergolas worth it?',
        a_ar: 'نعم للاستخدام اليومي؛ التحكم بالريش يقلّل الحرارة ويصرّف الأمطار تلقائياً.',
        a_en: 'Yes for daily use — louvre control cuts heat and drains rain.' },
    ],
    keywords: ['برجولات', 'ألمنيوم', 'ريش متحركة', 'pergola price'],
  },
  {
    slug: 'steel-canopies', sector: 'iron',
    name_ar: 'مظلات حديد للسيارات', name_en: 'Steel car canopies',
    tagline_ar: 'مظلات هرمية وريشة بضمان الصدأ حتى 5 سنوات.',
    tagline_en: 'Pyramid & wave canopies with 5-year anti-rust warranty.',
    description_ar: 'أسعار مظلات السيارات الحديد بالمتر المربع، مع مقارنة الأنواع الهرمية والريشة والمستوية وأقمشة PVC.',
    description_en: 'Steel car canopy prices per m², comparing pyramid, wave, and flat designs with certified PVC fabrics.',
    unit: 'm2', price_min: 180, price_max: 380, quality: 'standard', lead_time_days: 7, warranty_years: 5,
    features: [FEAT.galvanized, FEAT.warranty5, FEAT.installation],
    faq: [
      { q_ar: 'ما أفضل قماش لمظلات السيارات؟', q_en: 'Best fabric for car canopies?',
        a_ar: 'PVC ألماني/كوري 650–900 جم/م² يقاوم الشمس 7+ سنوات بدون تشقق.',
        a_en: 'German/Korean PVC 650–900 g/m² lasts 7+ years without cracking.' },
    ],
    keywords: ['مظلات سيارات', 'حداد مظلات', 'مظلات حديد', 'car canopy'],
  },
  {
    slug: 'iron-gates', sector: 'iron',
    name_ar: 'بوابات حديد ليزر', name_en: 'Laser-cut iron gates',
    tagline_ar: 'بوابات بقص ليزر CNC ودهان فرن مقاوم للصدأ.',
    tagline_en: 'CNC laser-cut gates with rust-proof oven coating.',
    description_ar: 'مقارنة أسعار البوابات الحديدية بقص الليزر بالمتر المربع، مع خيارات السماكة والدهان والفتحات الكهربائية.',
    description_en: 'Compare laser-cut iron gate prices per m², with thickness, coating, and electric opener options.',
    unit: 'm2', price_min: 750, price_max: 1800, quality: 'premium', lead_time_days: 12, warranty_years: 3,
    features: [FEAT.laserCut, FEAT.galvanized, FEAT.smartMotor],
    faq: [
      { q_ar: 'هل أحتاج محرك كهربائي للبوابة؟', q_en: 'Do I need an electric gate motor?',
        a_ar: 'موصى به لما هو أوسع من 3.5م، ويضيف 1500–4000 ريال.',
        a_en: 'Recommended for gates wider than 3.5 m; adds SAR 1,500–4,000.' },
    ],
    keywords: ['بوابات حديد', 'قص ليزر', 'iron gates', 'laser gate'],
  },
  {
    slug: 'glass-shopfronts', sector: 'glass',
    name_ar: 'واجهات زجاجية للمحلات', name_en: 'Storefront glass facades',
    tagline_ar: 'زجاج مقسّى 12مم وأبواب سحب أوتوماتيكية.',
    tagline_en: '12mm tempered glass with automatic sliding doors.',
    description_ar: 'أسعار واجهات الزجاج للمحلات بالمتر المربع، ومقارنة بين الزجاج المقسّى والمصفّح والأبواب الأوتوماتيكية.',
    description_en: 'Storefront glass prices per m², comparing tempered, laminated, and automatic sliding doors.',
    unit: 'm2', price_min: 520, price_max: 1350, quality: 'premium', lead_time_days: 10, warranty_years: 3,
    features: [FEAT.temperedGlass, FEAT.laminated, FEAT.installation],
    faq: [
      { q_ar: 'هل الزجاج المقسّى آمن للواجهات؟', q_en: 'Is tempered glass safe for storefronts?',
        a_ar: 'نعم، أقوى 4–5 أضعاف من العادي ويتفتت لقطع غير حادة.',
        a_en: 'Yes — 4–5× stronger and shatters into blunt pieces.' },
    ],
    keywords: ['واجهات زجاج', 'زجاج مقسّى', 'storefront glass'],
  },
  {
    slug: 'glass-shower-cabins', sector: 'glass',
    name_ar: 'كبائن استحمام زجاج', name_en: 'Glass shower cabins',
    tagline_ar: 'كبائن مقسّى 8–10مم بإكسسوار كروم/أسود.',
    tagline_en: '8–10mm tempered cabins in chrome or matte black.',
    description_ar: 'مقارنة أسعار كبائن الاستحمام الزجاجية بالقطعة، مع خيارات الباب السحاب أو المفصلي وطلاء nano.',
    description_en: 'Compare shower cabin prices per piece, with sliding/hinged doors and nano anti-scale coating.',
    unit: 'piece', price_min: 1800, price_max: 5500, quality: 'standard', lead_time_days: 7, warranty_years: 2,
    features: [FEAT.temperedGlass, FEAT.installation],
    faq: [
      { q_ar: 'هل طلاء nano المقاوم للترسبات يستحق التكلفة؟', q_en: 'Is anti-scale nano coating worth it?',
        a_ar: 'نعم في مناطق الماء العسر؛ يقلل التنظيف ويحفظ الشفافية 3–5 سنوات.',
        a_en: 'Yes in hard-water areas — keeps glass clear for 3–5 years.' },
    ],
    keywords: ['كبائن استحمام', 'زجاج مقسّى', 'shower cabin glass'],
  },
  {
    slug: 'wood-doors', sector: 'wood',
    name_ar: 'أبواب خشب داخلية', name_en: 'Interior wood doors',
    tagline_ar: 'أبواب MDF و HDF بقشرة طبيعية أو ميلامين.',
    tagline_en: 'MDF & HDF doors with natural veneer or melamine.',
    description_ar: 'أسعار الأبواب الخشبية الداخلية بالقطعة، ومقارنة بين الـMDF والـHDF والقشرة الطبيعية والميلامين.',
    description_en: 'Interior wood door prices per piece, comparing MDF vs HDF and veneer vs melamine finishes.',
    unit: 'piece', price_min: 650, price_max: 2400, quality: 'standard', lead_time_days: 14, warranty_years: 2,
    features: [FEAT.cncWood, FEAT.softClose, FEAT.installation],
    faq: [
      { q_ar: 'أيهما أفضل MDF أم HDF للأبواب؟', q_en: 'MDF or HDF for doors?',
        a_ar: 'الـHDF أكثف وأقوى مع الرطوبة بـ20% ويناسب الحمامات؛ MDF أرخص للغرف.',
        a_en: 'HDF is denser and ~20% better with humidity; MDF is cheaper for rooms.' },
    ],
    keywords: ['أبواب خشب', 'MDF', 'HDF', 'interior doors'],
  },
  {
    slug: 'wood-flooring', sector: 'wood',
    name_ar: 'أرضيات باركيه خشب', name_en: 'Wood parquet flooring',
    tagline_ar: 'باركيه HDF و SPC بسماكة 8–12مم.',
    tagline_en: 'HDF & SPC parquet at 8–12 mm thickness.',
    description_ar: 'مقارنة أسعار الباركيه HDF و SPC للمتر المربع، مع درجة مقاومة الخدش AC4/AC5 والضمانات.',
    description_en: 'Compare HDF vs SPC parquet prices per m², with AC4/AC5 scratch ratings and warranty.',
    unit: 'm2', price_min: 85, price_max: 280, quality: 'economy', lead_time_days: 5, warranty_years: 10,
    features: [FEAT.warranty5, FEAT.installation],
    faq: [
      { q_ar: 'ما الفرق بين HDF و SPC؟', q_en: 'HDF vs SPC?',
        a_ar: 'الـSPC مقاوم للماء 100% ويناسب المطابخ والحمامات، والـHDF أدفأ تحت القدم وأرخص.',
        a_en: 'SPC is fully waterproof; HDF is warmer underfoot and cheaper.' },
    ],
    keywords: ['باركيه', 'أرضيات خشب', 'SPC', 'parquet price'],
  },
  {
    slug: 'kitchen-cabinets', sector: 'cabinets',
    name_ar: 'مطابخ خشبية وألمنيوم', name_en: 'Wood & aluminum kitchens',
    tagline_ar: 'مطابخ كاملة بمسطح كوريان أو غرانيت.',
    tagline_en: 'Full kitchens with solid-surface or granite tops.',
    description_ar: 'مقارنة أسعار المطابخ بالمتر الطولي، مع خيارات الأبواب (PVC، أكريليك، خشب) ومسطحات الكوريان والغرانيت.',
    description_en: 'Compare kitchen prices per linear meter, with PVC/acrylic/solid-wood doors and corian or granite tops.',
    unit: 'meter', price_min: 1400, price_max: 4800, quality: 'premium', lead_time_days: 30, warranty_years: 5,
    features: [FEAT.solidSurface, FEAT.softClose, FEAT.cncWood, FEAT.warranty5, FEAT.installation],
    faq: [
      { q_ar: 'كم سعر متر المطبخ في السعودية؟', q_en: 'Kitchen price per linear meter in Saudi Arabia?',
        a_ar: 'بين 1,400 و4,800 ريال للمتر شاملاً الكبائن والمسطح والحوض والمخلطة.',
        a_en: 'SAR 1,400–4,800 per linear meter incl. cabinets, tops, sink and mixer.' },
      { q_ar: 'كم تستغرق صناعة المطبخ؟', q_en: 'How long does a kitchen take?',
        a_ar: 'بين 25 و40 يوماً من القياس النهائي حتى التركيب.',
        a_en: '25–40 days from final measurement to install.' },
    ],
    keywords: ['مطابخ', 'مطبخ كوريان', 'سعر مطبخ', 'kitchen cabinets price'],
  },
  {
    slug: 'wardrobes', sector: 'cabinets',
    name_ar: 'دواليب ملابس مفصّلة', name_en: 'Custom wardrobes',
    tagline_ar: 'دواليب سحاب أو مفصلي بإضاءة LED داخلية.',
    tagline_en: 'Sliding or hinged wardrobes with internal LED lighting.',
    description_ar: 'مقارنة أسعار دواليب الملابس المفصّلة بالمتر المربع للواجهة، مع خيارات السحاب وقواطع داخلية ودرج مخفي.',
    description_en: 'Compare custom wardrobe prices per facade m², with sliding doors, dividers, and hidden drawers.',
    unit: 'm2', price_min: 750, price_max: 2200, quality: 'standard', lead_time_days: 21, warranty_years: 3,
    features: [FEAT.softClose, FEAT.cncWood, FEAT.installation],
    faq: [
      { q_ar: 'هل الدولاب السحاب أغلى من المفصلي؟', q_en: 'Sliding vs hinged wardrobe price?',
        a_ar: 'نعم بنحو 15–25% بسبب آلية السكك، لكنه يوفّر مساحة فتح الباب.',
        a_en: 'Yes by ~15–25% due to track hardware, but saves swing space.' },
    ],
    keywords: ['دواليب', 'دولاب سحاب', 'wardrobes', 'closet price'],
  },
];

export const SECTOR_LABEL: Record<SectorSlug, { ar: string; en: string }> = {
  aluminum: { ar: 'الألمنيوم', en: 'Aluminum' },
  iron: { ar: 'الحديد', en: 'Steel' },
  glass: { ar: 'الزجاج', en: 'Glass' },
  wood: { ar: 'الخشب', en: 'Wood' },
  cabinets: { ar: 'الخزائن', en: 'Cabinets' },
};

export const QUALITY_LABEL: Record<QualityTier, { ar: string; en: string }> = {
  economy: { ar: 'اقتصادي', en: 'Economy' },
  standard: { ar: 'قياسي', en: 'Standard' },
  premium: { ar: 'فاخر', en: 'Premium' },
};

export const UNIT_LABEL: Record<ServiceUnit, { ar: string; en: string }> = {
  m2: { ar: 'م²', en: 'm²' },
  meter: { ar: 'م.طولي', en: 'lin. m' },
  piece: { ar: 'قطعة', en: 'piece' },
  project: { ar: 'مشروع', en: 'project' },
};

export function getServiceBySlug(slug: string | undefined): ServiceEntry | null {
  if (!slug) return null;
  return SERVICES_CATALOG.find((s) => s.slug === slug) ?? null;
}

export function listAllFeatures(): ServiceFeature[] {
  const seen = new Map<string, ServiceFeature>();
  for (const s of SERVICES_CATALOG) {
    for (const ft of s.features) if (!seen.has(ft.id)) seen.set(ft.id, ft);
  }
  return [...seen.values()];
}

export function getRelatedServices(slug: string, limit = 3): ServiceEntry[] {
  const cur = getServiceBySlug(slug);
  if (!cur) return [];
  return SERVICES_CATALOG.filter((s) => s.sector === cur.sector && s.slug !== slug).slice(0, limit);
}
