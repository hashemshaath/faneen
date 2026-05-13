/**
 * Industrial promotions catalog (Qitaat).
 * Templates for the 7 industrial sectors — used to one-click pre-fill the
 * promotion form, bulk-insert, and seed demo content for new providers.
 */
export type PromoTemplateType = 'offer' | 'ad' | 'video';

export interface PromotionTemplate {
  id: string;
  type: PromoTemplateType;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  /** percent off (only for type='offer') */
  discount_percentage?: number;
  /** suggested original price in SAR (only for type='offer') */
  original_price?: number;
  currency_code?: string;
  /** validity window in days from today (default 30) */
  duration_days?: number;
}

export interface PromotionSector {
  id: string;
  name_ar: string;
  name_en: string;
  icon: string; // emoji
  color: string; // tailwind tone classes
  templates: PromotionTemplate[];
}

export const promotionCatalog: PromotionSector[] = [
  {
    id: 'aluminum',
    name_ar: 'الألمنيوم',
    name_en: 'Aluminum',
    icon: '🏗️',
    color: 'bg-info/10 text-info',
    templates: [
      {
        id: 'al-windows-30',
        type: 'offer',
        title_ar: 'خصم 30٪ على نوافذ الألمنيوم العازلة',
        title_en: '30% off insulated aluminum windows',
        description_ar: 'نوافذ ألمنيوم بزجاج مزدوج عازل للحرارة والصوت — تركيب احترافي وضمان 5 سنوات.',
        description_en: 'Double-glazed aluminum windows with thermal & acoustic insulation — pro install + 5-year warranty.',
        discount_percentage: 30,
        original_price: 1200,
        currency_code: 'SAR',
        duration_days: 21,
      },
      {
        id: 'al-facade-pkg',
        type: 'offer',
        title_ar: 'باقة واجهات كلادينج بسعر المتر 220 ر.س',
        title_en: 'Cladding facade package at SAR 220/m²',
        description_ar: 'تكسية واجهات بكلادينج ألوكوبوند مقاوم للحرائق — يشمل التركيب والإكسسوارات.',
        description_en: 'Alucobond fire-rated cladding facades — installation and accessories included.',
        discount_percentage: 15,
        original_price: 260,
        currency_code: 'SAR',
        duration_days: 30,
      },
      {
        id: 'al-doors-ad',
        type: 'ad',
        title_ar: 'أبواب ألمنيوم سيكوريت بتصاميم 2026',
        title_en: 'Securit aluminum doors — 2026 designs',
        description_ar: 'تشكيلة جديدة من الأبواب الخارجية بمقاومة عالية للصدأ والعوامل الجوية.',
        description_en: 'New range of exterior doors with high resistance to rust and weather.',
        duration_days: 60,
      },
    ],
  },
  {
    id: 'glass',
    name_ar: 'الزجاج',
    name_en: 'Glass',
    icon: '🪟',
    color: 'bg-primary/10 text-primary',
    templates: [
      {
        id: 'gl-tempered-25',
        type: 'offer',
        title_ar: 'خصم 25٪ على الزجاج السيكوريت 10 ملم',
        title_en: '25% off 10mm tempered glass',
        description_ar: 'زجاج مقسى مقاوم للصدمات والحرارة — مناسب للواجهات والأبواب والقواطع.',
        description_en: 'Tempered glass impact & heat resistant — facades, doors and partitions.',
        discount_percentage: 25,
        original_price: 280,
        currency_code: 'SAR',
        duration_days: 30,
      },
      {
        id: 'gl-double-glazed',
        type: 'offer',
        title_ar: 'عرض زجاج مزدوج عازل (Double-Glazing)',
        title_en: 'Double-glazing insulation offer',
        description_ar: 'وفّر حتى 35٪ من فاتورة التكييف بزجاج مزدوج عالي الكفاءة.',
        description_en: 'Save up to 35% on AC bills with high-efficiency double-glazing.',
        discount_percentage: 20,
        original_price: 480,
        currency_code: 'SAR',
        duration_days: 45,
      },
      {
        id: 'gl-mirror-video',
        type: 'video',
        title_ar: 'كيف نركّب مرايا الحمامات بدون إطار',
        title_en: 'How we install frameless bathroom mirrors',
        description_ar: 'فيديو قصير يوضح خطوات التركيب الاحترافي للمرايا الكبيرة.',
        description_en: 'Short video showing professional installation of large mirrors.',
        duration_days: 90,
      },
    ],
  },
  {
    id: 'wood',
    name_ar: 'الأخشاب',
    name_en: 'Wood',
    icon: '🪵',
    color: 'bg-warning/10 text-warning',
    templates: [
      {
        id: 'wd-kitchen-20',
        type: 'offer',
        title_ar: 'خصم 20٪ على المطابخ الخشبية بالكامل',
        title_en: '20% off full wooden kitchens',
        description_ar: 'مطابخ MDF عالية الجودة بتصاميم عصرية — يشمل التركيب والإكسسوارات.',
        description_en: 'High-quality MDF kitchens with modern designs — install + accessories.',
        discount_percentage: 20,
        original_price: 18000,
        currency_code: 'SAR',
        duration_days: 30,
      },
      {
        id: 'wd-doors-pkg',
        type: 'offer',
        title_ar: 'باقة 4 أبواب خشب داخلية + الإطارات',
        title_en: 'Pack of 4 interior wooden doors + frames',
        description_ar: 'خشب HDF مقاوم للرطوبة، تركيب احترافي مع الكوالين.',
        description_en: 'Moisture-resistant HDF wood, professional install with hinges.',
        discount_percentage: 15,
        original_price: 4800,
        currency_code: 'SAR',
        duration_days: 21,
      },
    ],
  },
  {
    id: 'steel',
    name_ar: 'الحديد والصلب',
    name_en: 'Steel',
    icon: '⚙️',
    color: 'bg-secondary/10 text-secondary',
    templates: [
      {
        id: 'st-railings-15',
        type: 'offer',
        title_ar: 'درابزين ستيل ستانلس بخصم 15٪',
        title_en: 'Stainless steel railings — 15% off',
        description_ar: 'درابزين ستانلس 304 للسلالم والشرفات بتصاميم متعددة.',
        description_en: 'SS-304 railings for stairs & balconies in multiple designs.',
        discount_percentage: 15,
        original_price: 350,
        currency_code: 'SAR',
        duration_days: 30,
      },
      {
        id: 'st-shed-ad',
        type: 'ad',
        title_ar: 'مظلات وسقائف حديدية بضمان 10 سنوات',
        title_en: 'Steel canopies & sheds — 10-year warranty',
        description_ar: 'تنفيذ مظلات سيارات وسقائف صناعية بمقاسات حسب الطلب.',
        description_en: 'Custom car canopies and industrial sheds built to spec.',
        duration_days: 60,
      },
    ],
  },
  {
    id: 'marble',
    name_ar: 'الرخام والجرانيت',
    name_en: 'Marble & Granite',
    icon: '🪨',
    color: 'bg-muted text-foreground',
    templates: [
      {
        id: 'mr-kitchen-counter',
        type: 'offer',
        title_ar: 'رخام مطابخ كوارتز بسعر المتر 850 ر.س',
        title_en: 'Quartz kitchen counters at SAR 850/m²',
        description_ar: 'رخام كوارتز مستورد مقاوم للبقع والخدش — تركيب وقص احترافي.',
        description_en: 'Imported quartz, stain & scratch resistant — pro cut & install.',
        discount_percentage: 18,
        original_price: 1050,
        currency_code: 'SAR',
        duration_days: 30,
      },
      {
        id: 'mr-stairs-pkg',
        type: 'offer',
        title_ar: 'تكسية درج كامل بالرخام',
        title_en: 'Full staircase marble cladding',
        description_ar: 'باقة شاملة لتكسية الدرج الداخلي حتى 12 درجة.',
        description_en: 'Complete cladding package up to 12 internal steps.',
        discount_percentage: 10,
        original_price: 6500,
        currency_code: 'SAR',
        duration_days: 21,
      },
    ],
  },
  {
    id: 'hvac',
    name_ar: 'التكييف والسباكة',
    name_en: 'HVAC & Plumbing',
    icon: '❄️',
    color: 'bg-info/10 text-info',
    templates: [
      {
        id: 'hv-split-25',
        type: 'offer',
        title_ar: 'تركيب مكيف سبليت إنفرتر بـ 350 ر.س',
        title_en: 'Split inverter AC installation at SAR 350',
        description_ar: 'تركيب احترافي مع التأسيس وفحص الفريون وضمان السنة.',
        description_en: 'Professional install with piping, freon check, 1-year warranty.',
        discount_percentage: 30,
        original_price: 500,
        currency_code: 'SAR',
        duration_days: 30,
      },
      {
        id: 'hv-maint-ad',
        type: 'ad',
        title_ar: 'صيانة دورية للمكيفات قبل الصيف',
        title_en: 'AC pre-summer maintenance',
        description_ar: 'تنظيف عميق وفحص شامل لجميع وحدات التكييف.',
        description_en: 'Deep cleaning and full inspection for all AC units.',
        duration_days: 60,
      },
    ],
  },
  {
    id: 'solar',
    name_ar: 'الطاقة الشمسية والعزل',
    name_en: 'Solar & Insulation',
    icon: '☀️',
    color: 'bg-warning/10 text-warning',
    templates: [
      {
        id: 'sl-rooftop-5kw',
        type: 'offer',
        title_ar: 'منظومة طاقة شمسية 5 كيلوواط للمنازل',
        title_en: 'Residential 5kW solar PV system',
        description_ar: 'ألواح Tier-1 + إنفرتر هايبرد + تركيب وتوصيل بشبكة الكهرباء.',
        description_en: 'Tier-1 panels + hybrid inverter + grid-tied install.',
        discount_percentage: 12,
        original_price: 28000,
        currency_code: 'SAR',
        duration_days: 45,
      },
      {
        id: 'sl-roof-insul',
        type: 'offer',
        title_ar: 'عزل أسطح حراري ومائي بضمان 10 سنوات',
        title_en: 'Thermal & waterproof roof insulation — 10-year warranty',
        description_ar: 'فوم بولي يوريثان + طبقة حماية UV — يقلل حرارة السطح حتى 20°م.',
        description_en: 'Polyurethane foam + UV protective coat — cuts roof heat up to 20°C.',
        discount_percentage: 20,
        original_price: 95,
        currency_code: 'SAR',
        duration_days: 30,
      },
    ],
  },
];

/**
 * Curated demo seed for new providers — 6 cross-sector promotions
 * tagged is_demo:true so they can be wiped in one click.
 */
export const promotionDemoSeed: PromotionTemplate[] = [
  promotionCatalog[0].templates[0], // aluminum windows -30%
  promotionCatalog[1].templates[0], // tempered glass -25%
  promotionCatalog[2].templates[0], // wooden kitchen -20%
  promotionCatalog[3].templates[0], // SS railings -15%
  promotionCatalog[5].templates[0], // split AC install
  promotionCatalog[6].templates[0], // solar 5kW
];