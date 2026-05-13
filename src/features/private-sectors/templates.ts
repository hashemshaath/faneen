/**
 * Showcase templates for the private-sectors page.
 * Three richly-detailed example sectors that providers can preview and
 * one-click into their own draft. Includes bilingual copy, gallery images,
 * specifications, and a measurements/dimensions table.
 */
import saraya from '@/assets/private-sectors/saraya-aluminum.jpg';
import royal from '@/assets/private-sectors/royal-kitchens.jpg';
import crystal from '@/assets/private-sectors/crystal-glass.jpg';
import type { PrivateSectorBrandType } from './types';

export interface DimensionRow {
  code: string;
  label_ar: string;
  label_en: string;
  width_mm: string;
  height_mm: string;
  thickness_mm?: string;
  notes_ar?: string;
  notes_en?: string;
}

export interface FeatureBullet { ar: string; en: string }

export interface PrivateSectorTemplate {
  slug: string;
  name_ar: string;
  name_en: string;
  parent_sector: string;          // matches ONBOARDING_SECTORS ids
  brand_type: PrivateSectorBrandType;
  cover: string;
  accent: string;                 // tailwind gradient classes for the cover overlay
  established_year: number;
  short_description_ar: string;
  short_description_en: string;
  description_ar: string;
  description_en: string;
  highlights: FeatureBullet[];
  specializations: FeatureBullet[];
  certifications: FeatureBullet[];
  dimensions: {
    title_ar: string;
    title_en: string;
    unit: 'mm' | 'cm';
    rows: DimensionRow[];
  };
  starting_price_sar?: number;
}

export const PRIVATE_SECTOR_TEMPLATES: PrivateSectorTemplate[] = [
  {
    slug: 'saraya-aluminum',
    name_ar: 'سرايا الألمنيوم',
    name_en: 'Saraya Aluminum',
    parent_sector: 'aluminum',
    brand_type: 'own_brand',
    cover: saraya,
    accent: 'from-slate-900/80 via-slate-900/40 to-transparent',
    established_year: 2014,
    short_description_ar: 'علامة متخصصة بأنظمة الألمنيوم الفاخرة وواجهات الكلادينج للمشاريع السكنية والتجارية الراقية.',
    short_description_en: 'Premium aluminum systems & cladding facades for high-end residential and commercial projects.',
    description_ar:
      'سرايا الألمنيوم علامة سعودية متخصصة في تصميم وتصنيع وتركيب أنظمة الألمنيوم الفاخرة. نعمل بمواصفات قياسية معتمدة لقطاعات الواجهات والنوافذ والأبواب الانزلاقية والكلادينج، بقطاعات معتمدة من Schüco و YKK و Reynaers، وزجاج مزدوج ذو كفاءة حرارية عالية. نقدم حلول كاملة من المعاينة والمقاسات حتى التركيب والصيانة الدورية.',
    description_en:
      'Saraya Aluminum is a Saudi brand specialized in designing, fabricating and installing premium aluminum systems. We work with certified Schüco, YKK and Reynaers profiles, double-glazed thermal-break units, and deliver end-to-end service: site survey, shop drawings, fabrication, installation and maintenance.',
    highlights: [
      { ar: 'كسر حراري بأداء U-value منخفض', en: 'Low U-value thermal-break system' },
      { ar: 'زجاج دبل جلاس 6+12+6 ملم', en: 'Double-glazed 6+12+6 mm units' },
      { ar: 'دهان فرن إلكتروستاتيكي 10 سنوات ضمان', en: 'Powder-coat finish — 10-year warranty' },
      { ar: 'مقاومة رياح حتى 240 كم/س', en: 'Wind resistance up to 240 km/h' },
    ],
    specializations: [
      { ar: 'واجهات كيرتن وول', en: 'Curtain-wall facades' },
      { ar: 'نوافذ وأبواب انزلاقية', en: 'Sliding windows & doors' },
      { ar: 'كلادينج ألوكوبوند', en: 'Alucobond cladding' },
      { ar: 'سكاي لايت وقباب', en: 'Skylights & domes' },
    ],
    certifications: [
      { ar: 'شهادة سابر SASO', en: 'SASO / SABER certified' },
      { ar: 'مطابقة كود البناء السعودي', en: 'Saudi Building Code compliant' },
      { ar: 'ISO 9001:2015', en: 'ISO 9001:2015' },
    ],
    dimensions: {
      title_ar: 'جدول مقاسات وأنظمة الألمنيوم',
      title_en: 'Aluminum systems — dimensions',
      unit: 'mm',
      rows: [
        { code: 'AL-W-60', label_ar: 'نافذة شباك 60', label_en: 'Casement window 60', width_mm: '600–1500', height_mm: '600–2400', thickness_mm: '60', notes_ar: 'كسر حراري', notes_en: 'Thermal break' },
        { code: 'AL-S-90', label_ar: 'باب انزلاقي 90', label_en: 'Sliding door 90',     width_mm: '1800–4500', height_mm: '2100–3000', thickness_mm: '90', notes_ar: 'مساران/ثلاثة', notes_en: '2 or 3 tracks' },
        { code: 'AL-CW-150', label_ar: 'واجهة كيرتن وول', label_en: 'Curtain wall',      width_mm: '1200', height_mm: '3000', thickness_mm: '150', notes_ar: 'وحدة قياسية', notes_en: 'Standard unit' },
        { code: 'AL-CL-4', label_ar: 'لوح كلادينج', label_en: 'Cladding panel',          width_mm: '1250', height_mm: '3050', thickness_mm: '4', notes_ar: 'PE / FR', notes_en: 'PE or fire-rated' },
        { code: 'AL-SK-25', label_ar: 'سكاي لايت', label_en: 'Skylight unit',            width_mm: '1500–3000', height_mm: '1500–3000', thickness_mm: '25', notes_ar: 'زجاج لامينيت', notes_en: 'Laminated glass' },
      ],
    },
    starting_price_sar: 380,
  },
  {
    slug: 'royal-kitchens',
    name_ar: 'رويال للمطابخ',
    name_en: 'Royal Kitchens',
    parent_sector: 'kitchens',
    brand_type: 'exclusive_agency',
    cover: royal,
    accent: 'from-amber-900/70 via-amber-900/30 to-transparent',
    established_year: 2012,
    short_description_ar: 'وكالة حصرية لمطابخ بولي لاك وأكريليك إيطالية الصنع، تصميم وتفصيل حسب المساحة.',
    short_description_en: 'Exclusive agency for Italian polylac & acrylic kitchens — fully tailored to your space.',
    description_ar:
      'رويال للمطابخ وكيل حصري لإحدى أعرق العلامات الإيطالية في صناعة المطابخ المنزلية. نقدم خدمة متكاملة من التصميم ثلاثي الأبعاد، اختيار الخامات (بولي لاك، أكريليك، HPL، خشب طبيعي)، وحتى التركيب وضمان عشر سنوات على الهيكل. أبواب بسماكة 18 ملم بمفصلات Blum، أسطح كوارتز سيزرستون، وإضاءة LED مدمجة.',
    description_en:
      'Royal Kitchens is the exclusive agent of a leading Italian kitchen brand. We deliver an end-to-end experience: 3D design, material selection (polylac, acrylic, HPL, solid wood), and full installation backed by a 10-year structural warranty. 18 mm doors with Blum hinges, Caesarstone quartz tops and integrated LED lighting.',
    highlights: [
      { ar: 'هيكل MDF مقاوم للرطوبة', en: 'Moisture-resistant MDF carcass' },
      { ar: 'مفصلات Blum بإغلاق هادئ', en: 'Blum soft-close hinges' },
      { ar: 'سطح كوارتز سيزرستون 20 ملم', en: 'Caesarstone quartz 20 mm tops' },
      { ar: 'تصميم 3D مجاني خلال 48 ساعة', en: 'Free 3D design within 48 h' },
    ],
    specializations: [
      { ar: 'مطابخ بولي لاك بأعلى لمعان', en: 'High-gloss polylac kitchens' },
      { ar: 'أكريليك ألماني درجة A', en: 'German grade-A acrylic' },
      { ar: 'مطابخ HPL مقاومة', en: 'HPL durable kitchens' },
      { ar: 'جزر مطبخ مفصّلة', en: 'Custom kitchen islands' },
    ],
    certifications: [
      { ar: 'مطابقة E1 لانبعاثات الفورمالديهايد', en: 'E1 formaldehyde compliance' },
      { ar: 'شهادة Blum للتركيب', en: 'Blum installation certified' },
      { ar: 'ضمان هيكل 10 سنوات', en: '10-year structural warranty' },
    ],
    dimensions: {
      title_ar: 'جدول مقاسات الوحدات القياسية',
      title_en: 'Standard cabinet dimensions',
      unit: 'mm',
      rows: [
        { code: 'KT-B-60', label_ar: 'وحدة قاعدة 60',  label_en: 'Base cabinet 60',  width_mm: '600',  height_mm: '720', thickness_mm: '560', notes_ar: 'عمق', notes_en: 'Depth' },
        { code: 'KT-B-90', label_ar: 'وحدة قاعدة 90',  label_en: 'Base cabinet 90',  width_mm: '900',  height_mm: '720', thickness_mm: '560' },
        { code: 'KT-T-60', label_ar: 'وحدة علوية 60',  label_en: 'Wall cabinet 60',  width_mm: '600',  height_mm: '720', thickness_mm: '320' },
        { code: 'KT-CL-40', label_ar: 'عمود مخزن 40',   label_en: 'Tall pantry 40',   width_mm: '400',  height_mm: '2200', thickness_mm: '560' },
        { code: 'KT-IS-180', label_ar: 'جزيرة مطبخ',    label_en: 'Kitchen island',   width_mm: '1800–3000', height_mm: '900', thickness_mm: '900', notes_ar: 'سطح كوارتز 20', notes_en: 'Quartz top 20' },
      ],
    },
    starting_price_sar: 1850,
  },
  {
    slug: 'crystal-glass',
    name_ar: 'كريستال للزجاج',
    name_en: 'Crystal Glass',
    parent_sector: 'glass',
    brand_type: 'manufacturer',
    cover: crystal,
    accent: 'from-sky-900/70 via-sky-900/30 to-transparent',
    established_year: 2009,
    short_description_ar: 'مصنع متخصص بالزجاج السكوريت والقواطع الزجاجية وكبائن الدش بأعلى معايير السلامة.',
    short_description_en: 'Manufacturer of tempered glass, partitions and shower enclosures to the highest safety standards.',
    description_ar:
      'مصنع كريستال للزجاج يقدم حلول الزجاج السكوريت بسماكات من 6 إلى 19 ملم لمشاريع الواجهات والقواطع وكبائن الدش والدرابزينات. خط إنتاج كامل: قطع CNC، شطف، تثقيب، حرارة (Tempered)، ولامينيت أمان. منتجاتنا مطابقة لـ EN 12150 وSASO ومرفقة بشهادة منشأ ومختبر.',
    description_en:
      'Crystal Glass manufactures tempered glass solutions from 6 mm up to 19 mm for facades, partitions, shower enclosures and railings. Full production line: CNC cutting, polishing, drilling, tempering and safety lamination. Products are EN 12150 and SASO compliant with full origin and lab certification.',
    highlights: [
      { ar: 'سماكات من 6 حتى 19 ملم', en: 'Thicknesses from 6 to 19 mm' },
      { ar: 'حرارة EN 12150', en: 'Tempering per EN 12150' },
      { ar: 'تسليم خلال 7 أيام', en: '7-day delivery lead time' },
      { ar: 'ضمان شد وكسر سنتان', en: '2-year breakage & stress warranty' },
    ],
    specializations: [
      { ar: 'سكوريت شفاف وملوّن', en: 'Clear & tinted tempered' },
      { ar: 'قواطع مكاتب', en: 'Office partitions' },
      { ar: 'كبائن دش فريم-لس', en: 'Frameless shower enclosures' },
      { ar: 'درابزين زجاجي', en: 'Glass balustrades' },
    ],
    certifications: [
      { ar: 'EN 12150-1 / 12150-2', en: 'EN 12150-1 / 12150-2' },
      { ar: 'سابر SASO', en: 'SASO / SABER' },
      { ar: 'تقرير مختبر معتمد', en: 'Accredited lab report' },
    ],
    dimensions: {
      title_ar: 'جدول سماكات وأبعاد الزجاج',
      title_en: 'Glass thickness & size table',
      unit: 'mm',
      rows: [
        { code: 'GL-T-06', label_ar: 'سكوريت 6 ملم',    label_en: 'Tempered 6 mm',  width_mm: 'حتى 2400', height_mm: 'حتى 1800', thickness_mm: '6',  notes_ar: 'قواطع داخلية', notes_en: 'Interior partitions' },
        { code: 'GL-T-10', label_ar: 'سكوريت 10 ملم',   label_en: 'Tempered 10 mm', width_mm: 'حتى 3000', height_mm: 'حتى 2400', thickness_mm: '10', notes_ar: 'كبائن دش', notes_en: 'Shower enclosures' },
        { code: 'GL-T-12', label_ar: 'سكوريت 12 ملم',   label_en: 'Tempered 12 mm', width_mm: 'حتى 3600', height_mm: 'حتى 2700', thickness_mm: '12', notes_ar: 'درابزين', notes_en: 'Balustrades' },
        { code: 'GL-LM-66', label_ar: 'لامينيت 6+6',    label_en: 'Laminated 6+6',  width_mm: 'حتى 3000', height_mm: 'حتى 2400', thickness_mm: '13.52', notes_ar: 'سلامة', notes_en: 'Safety glass' },
        { code: 'GL-DG-26', label_ar: 'دبل جلاس 6+12+6', label_en: 'Double 6+12+6', width_mm: 'حتى 2400', height_mm: 'حتى 1800', thickness_mm: '24', notes_ar: 'عزل حراري', notes_en: 'Thermal insulation' },
      ],
    },
    starting_price_sar: 90,
  },
];