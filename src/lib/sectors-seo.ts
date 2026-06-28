/**
 * SEO content dictionary for the public /sectors landing pages.
 *
 * The 6 SEO slugs are URL-stable and SEO-targeted; they may differ from the
 * internal directory taxonomy (`SECTOR_KEYWORDS`). Each entry maps to an
 * internal Quote sector key so CTAs can prefill /quote?sector=… cleanly.
 */

export type SeoSectorSlug =
  | 'aluminum'
  | 'steel'
  | 'wood'
  | 'glass'
  | 'stainless-steel'
  | 'fabrication-installation';

export interface SectorSeo {
  slug: SeoSectorSlug;
  /** Internal Quote form sector value (matches Quote.tsx Sector union) */
  quoteSector: 'aluminum' | 'iron' | 'wood' | 'glass' | 'stainless' | 'fabrication';
  /** Existing /search filter value (best-effort) */
  searchSector?: string;
  name: string;
  shortName: string;
  cardDescription: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  hero: string;
  primaryCta: string;
  secondaryCta: string;
  services: string[];
  whenNeeded: string[];
  beforeQuote: string[];
  faqs: { q: string; a: string }[];
  serviceType: string;
}

export const SECTORS_SEO: Record<SeoSectorSlug, SectorSeo> = {
  aluminum: {
    slug: 'aluminum',
    quoteSector: 'aluminum',
    searchSector: 'aluminum',
    name: 'أعمال الألمنيوم',
    shortName: 'ألمنيوم',
    cardDescription: 'أبواب، شبابيك، واجهات، مطابخ، قواطع، وأعمال تركيب.',
    metaTitle: 'أعمال الألمنيوم | اطلب عروض أسعار من مزودي ألمنيوم | قطاعات',
    metaDescription:
      'ابحث عن مزودي أعمال الألمنيوم للأبواب، الشبابيك، الواجهات، المطابخ والقواطع، واطلب عرض سعر لمشروعك عبر منصة قطاعات.',
    h1: 'أعمال الألمنيوم لمشروعك',
    hero:
      'ابحث عن مزودي خدمات الألمنيوم للأبواب، الشبابيك، الواجهات، المطابخ، القواطع، وأعمال التركيب، وابدأ طلب عرض السعر بطريقة منظمة.',
    primaryCta: 'اطلب عرض سعر للألمنيوم',
    secondaryCta: 'استعرض مزودي الألمنيوم',
    services: [
      'شبابيك ألمنيوم', 'أبواب ألمنيوم', 'واجهات ألمنيوم', 'مطابخ ألمنيوم',
      'قواطع ألمنيوم', 'ألمنيوم مع زجاج', 'صيانة واستبدال', 'تركيب في الموقع',
    ],
    whenNeeded: [
      'عند بناء منزل أو فيلا',
      'عند تجديد واجهات أو شبابيك',
      'عند تجهيز محل أو مكتب',
      'عند تنفيذ مطبخ أو قواطع',
      'عند الحاجة إلى تفصيل حسب المقاس',
    ],
    beforeQuote: [
      'المقاسات التقريبية', 'عدد الشبابيك أو الأبواب', 'نوع الزجاج إن وجد',
      'صور الموقع', 'المدينة والحي', 'موعد التنفيذ المتوقع',
    ],
    faqs: [
      { q: 'هل أحتاج مقاسات دقيقة قبل طلب عرض ألمنيوم؟', a: 'ليست ضرورية في البداية، لكن المقاسات التقريبية والصور تساعد المزود على تقديم رد أدق.' },
      { q: 'هل يمكن طلب ألمنيوم مع زجاج؟', a: 'نعم، يمكنك توضيح ذلك في وصف الطلب وإرفاق الصور أو المخطط إن وجد.' },
      { q: 'هل قطاعات تنفذ أعمال الألمنيوم؟', a: 'لا. قطاعات تساعدك على تنظيم الطلب والوصول إلى مزودي الخدمة، بينما التنفيذ يتم بينك وبين المزود.' },
    ],
    serviceType: 'Aluminum works',
  },
  steel: {
    slug: 'steel',
    quoteSector: 'iron',
    searchSector: 'iron',
    name: 'أعمال الحديد والتصنيع المعدني',
    shortName: 'حديد',
    cardDescription: 'أبواب، سلالم، هياكل، شبك، مظلات، وأعمال معدنية.',
    metaTitle: 'أعمال الحديد والتصنيع المعدني | اطلب عروض أسعار | قطاعات',
    metaDescription:
      'ابحث عن مزودي أعمال الحديد والتصنيع المعدني للأبواب، السلالم، الهياكل، الشبك والمظلات، واطلب عرض سعر عبر قطاعات.',
    h1: 'أعمال الحديد والتصنيع المعدني',
    hero:
      'من الأبواب والسلالم إلى الهياكل والأعمال المعدنية، تساعدك قطاعات على الوصول إلى مزودي أعمال الحديد حسب نوع المشروع والمدينة.',
    primaryCta: 'اطلب عرض سعر لأعمال الحديد',
    secondaryCta: 'استعرض مزودي الحديد',
    services: [
      'أبواب حديد', 'سلالم حديد', 'درابزين', 'شبك وحمايات',
      'مظلات', 'هناجر وهياكل', 'أعمال لحام', 'تصنيع حسب الطلب',
    ],
    whenNeeded: [
      'عند تنفيذ بوابة أو باب',
      'عند تجهيز مستودع أو موقع',
      'عند عمل مظلات أو حمايات',
      'عند الحاجة إلى تصنيع خاص',
      'عند تنفيذ أعمال معدنية لمشروع تجاري',
    ],
    beforeQuote: [
      'نوع العمل المطلوب', 'المقاسات التقريبية', 'صور الموقع',
      'هل يوجد تصميم أو مخطط؟', 'المدينة والحي', 'موعد التنفيذ',
    ],
    faqs: [
      { q: 'هل يمكن طلب تصنيع حديد حسب المقاس؟', a: 'نعم، يمكنك توضيح المقاسات والتفاصيل في طلب عرض السعر.' },
      { q: 'هل الصور مهمة في طلب أعمال الحديد؟', a: 'الصور تساعد المزود على فهم الموقع ونوع العمل المطلوب بشكل أفضل.' },
      { q: 'هل أستطيع مقارنة أكثر من عرض؟', a: 'نعم، الهدف من قطاعات هو مساعدتك على تنظيم الطلب والمقارنة بين الخيارات المتاحة.' },
    ],
    serviceType: 'Steel & metalwork',
  },
  wood: {
    slug: 'wood',
    quoteSector: 'wood',
    searchSector: 'wood',
    name: 'أعمال الخشب والنجارة',
    shortName: 'خشب',
    cardDescription: 'أبواب، أثاث، ديكور، تفصيل، وتجهيزات داخلية.',
    metaTitle: 'أعمال الخشب والنجارة | اطلب عروض أسعار | قطاعات',
    metaDescription:
      'ابحث عن مزودي أعمال الخشب والنجارة للأبواب، الأثاث، الديكور، التفصيل والتجهيزات الداخلية، واطلب عرض سعر عبر قطاعات.',
    h1: 'أعمال الخشب والنجارة حسب احتياجك',
    hero:
      'ابحث عن مزودي خدمات الخشب والنجارة للأبواب، الأثاث، الديكورات، التفصيل، وتجهيزات المشاريع، وابدأ بطلب واضح.',
    primaryCta: 'اطلب عرض سعر لأعمال الخشب',
    secondaryCta: 'استعرض مزودي الخشب',
    services: [
      'أبواب خشب', 'تفصيل أثاث', 'ديكورات خشبية', 'خزائن',
      'مكاتب وتجهيزات', 'مطابخ خشب', 'قواطع داخلية', 'أعمال صيانة وتعديل',
    ],
    whenNeeded: [
      'عند تفصيل أثاث حسب المقاس',
      'عند تجهيز مكتب أو محل',
      'عند تنفيذ أبواب أو ديكور',
      'عند تجديد المساحات الداخلية',
      'عند الحاجة إلى أعمال نجارة مخصصة',
    ],
    beforeQuote: [
      'نوع الخشب إن كنت تعرفه', 'المقاسات التقريبية', 'صور أو إلهام للتصميم',
      'مكان التنفيذ', 'الكمية', 'موعد التسليم المتوقع',
    ],
    faqs: [
      { q: 'هل يجب أن أحدد نوع الخشب؟', a: 'لا، لكن إذا كنت تعرف النوع المطلوب فاذكره. ويمكنك أيضًا طلب اقتراح من المزود.' },
      { q: 'هل يمكنني إرفاق صورة للتصميم؟', a: 'نعم، إرفاق الصور يساعد المزود على فهم الشكل المطلوب بشكل أفضل.' },
      { q: 'هل قطاعات مناسبة للأعمال الصغيرة؟', a: 'نعم، يمكنك إرسال طلب لأعمال صغيرة أو مشاريع تجارية حسب احتياجك.' },
    ],
    serviceType: 'Wood & carpentry',
  },
  glass: {
    slug: 'glass',
    quoteSector: 'glass',
    searchSector: 'glass',
    name: 'أعمال الزجاج والسيكوريت',
    shortName: 'زجاج',
    cardDescription: 'واجهات، سيكوريت، قواطع، أبواب زجاجية، وتركيب.',
    metaTitle: 'أعمال الزجاج والسيكوريت | اطلب عروض أسعار | قطاعات',
    metaDescription:
      'ابحث عن مزودي أعمال الزجاج للواجهات، السيكوريت، القواطع، الأبواب الزجاجية والتركيب، واطلب عرض سعر عبر قطاعات.',
    h1: 'أعمال الزجاج والواجهات',
    hero:
      'ابحث عن مزودي الزجاج للواجهات، السيكوريت، القواطع، الأبواب الزجاجية، وأعمال التركيب، واطلب عرض سعر بطريقة أوضح.',
    primaryCta: 'اطلب عرض سعر للزجاج',
    secondaryCta: 'استعرض مزودي الزجاج',
    services: [
      'زجاج سيكوريت', 'واجهات زجاجية', 'أبواب زجاج', 'قواطع زجاجية',
      'مرايا', 'زجاج محلات', 'تركيب وصيانة', 'زجاج مع ألمنيوم',
    ],
    whenNeeded: [
      'عند تجهيز محل أو واجهة',
      'عند تنفيذ قواطع داخلية',
      'عند تركيب أبواب زجاجية',
      'عند تجديد واجهة أو مكتب',
      'عند الحاجة إلى قياسات وتركيب في الموقع',
    ],
    beforeQuote: [
      'نوع الزجاج إن وجد', 'المقاسات التقريبية', 'صور الموقع',
      'هل يوجد إطار ألمنيوم؟', 'المدينة والحي', 'موعد التنفيذ',
    ],
    faqs: [
      { q: 'هل يمكن طلب زجاج مع ألمنيوم؟', a: 'نعم، يمكنك توضيح ذلك في الطلب، وقد يرتبط الطلب بمزودي ألمنيوم وزجاج حسب التفاصيل.' },
      { q: 'هل أحتاج زيارة موقع قبل العرض؟', a: 'بعض الأعمال قد تحتاج معاينة، لكن يمكنك البدء بإرسال الصور والمقاسات التقريبية.' },
      { q: 'هل يمكن إرفاق مخطط؟', a: 'نعم، يمكنك إرفاق صور أو PDF أو مخطط ليساعد المزود على فهم الطلب.' },
    ],
    serviceType: 'Glass works',
  },
  'stainless-steel': {
    slug: 'stainless-steel',
    quoteSector: 'stainless',
    searchSector: 'stainless',
    name: 'أعمال الستانلس ستيل',
    shortName: 'ستانلس ستيل',
    cardDescription: 'مطابخ، مطاعم، درابزين، تجهيزات، وأعمال خاصة.',
    metaTitle: 'أعمال الستانلس ستيل | مطاعم ومطابخ وتجهيزات | قطاعات',
    metaDescription:
      'ابحث عن مزودي أعمال الستانلس ستيل للمطاعم، المطابخ، الدرابزين، التجهيزات الخاصة والتصنيع، واطلب عرض سعر عبر قطاعات.',
    h1: 'أعمال الستانلس ستيل للمشاريع والمحلات',
    hero:
      'ابحث عن مزودي خدمات الستانلس ستيل للمطاعم، المطابخ، الدرابزين، التجهيزات الخاصة، وأعمال التصنيع حسب الطلب.',
    primaryCta: 'اطلب عرض سعر للستانلس ستيل',
    secondaryCta: 'استعرض مزودي الستانلس',
    services: [
      'تجهيزات مطاعم', 'طاولات ستانلس', 'أحواض ومغاسل', 'درابزين ستانلس',
      'مطابخ تجارية', 'عربات وتجهيزات خاصة', 'تفصيل حسب المقاس', 'صيانة وتعديل',
    ],
    whenNeeded: [
      'عند تجهيز مطعم أو كافيه',
      'عند تنفيذ مطبخ تجاري',
      'عند الحاجة إلى تجهيزات صحية أو مقاومة',
      'عند تفصيل طاولات أو أحواض',
      'عند تنفيذ درابزين أو أعمال خاصة',
    ],
    beforeQuote: [
      'نوع الاستخدام', 'المقاسات التقريبية', 'صور أو مخطط',
      'الكمية', 'مكان التنفيذ', 'موعد التسليم',
    ],
    faqs: [
      { q: 'هل الستانلس مناسب للمطاعم؟', a: 'نعم، يستخدم الستانلس كثيرًا في تجهيزات المطاعم والمطابخ التجارية، ويمكنك توضيح الاستخدام المطلوب في الطلب.' },
      { q: 'هل يمكن طلب تفصيل خاص؟', a: 'نعم، اذكر المقاسات والصور أو المخطط ليساعد المزود على فهم المطلوب.' },
      { q: 'هل يمكن طلب أكثر من قطعة؟', a: 'نعم، أضف الكمية والتفاصيل داخل طلب عرض السعر.' },
    ],
    serviceType: 'Stainless steel works',
  },
  'fabrication-installation': {
    slug: 'fabrication-installation',
    quoteSector: 'fabrication',
    searchSector: 'fabrication',
    name: 'خدمات التصنيع والتركيب',
    shortName: 'تصنيع وتركيب',
    cardDescription: 'ورش، مصانع، وفرق تنفيذ حسب احتياج المشروع.',
    metaTitle: 'خدمات التصنيع والتركيب | ورش ومصانع وفرق تنفيذ | قطاعات',
    metaDescription:
      'ابحث عن ورش ومصانع وفرق تنفيذ لخدمات التصنيع والتركيب في الألمنيوم، الحديد، الخشب، الزجاج والستانلس، واطلب عرض سعر عبر قطاعات.',
    h1: 'خدمات التصنيع والتركيب',
    hero:
      'للمشاريع التي تحتاج تنفيذًا مخصصًا، تساعدك قطاعات على الوصول إلى ورش ومصانع وفرق تركيب حسب القطاع والمدينة.',
    primaryCta: 'اطلب عرض سعر للتصنيع والتركيب',
    secondaryCta: 'استعرض مزودي التصنيع والتركيب',
    services: [
      'تصنيع حسب الطلب', 'تركيب في الموقع', 'تجهيز محلات', 'تجهيز مكاتب',
      'تنفيذ واجهات', 'أعمال معدنية وخشبية', 'أعمال مشتركة بين أكثر من قطاع', 'صيانة وتعديل',
    ],
    whenNeeded: [
      'عندما يكون المشروع مخصصًا',
      'عند وجود مخطط أو تصميم جاهز',
      'عند الحاجة إلى تنفيذ في الموقع',
      'عند تجهيز محل أو منشأة',
      'عند الحاجة إلى أكثر من تخصص',
    ],
    beforeQuote: [
      'وصف واضح للعمل', 'الصور أو المخططات', 'المقاسات',
      'المواد المطلوبة', 'المدينة ومكان التنفيذ', 'الموعد المتوقع',
    ],
    faqs: [
      { q: 'هل يمكن طلب أكثر من قطاع في نفس الطلب؟', a: 'نعم، اشرح تفاصيل المشروع في وصف الطلب، ويمكن توجيهه حسب الاحتياج.' },
      { q: 'هل أحتاج مخططًا قبل الطلب؟', a: 'ليس دائمًا، لكن المخطط أو الصور تساعد المزود على فهم المطلوب بشكل أفضل.' },
      { q: 'هل هذه الصفحة مناسبة للمقاولين؟', a: 'نعم، يمكن للمقاولين استخدام قطاعات للوصول إلى ورش ومصانع وفرق تنفيذ حسب المشروع.' },
    ],
    serviceType: 'Fabrication & installation',
  },
};

export const SECTORS_SEO_LIST: SectorSeo[] = Object.values(SECTORS_SEO);

export const SEO_SECTOR_SLUGS: SeoSectorSlug[] = SECTORS_SEO_LIST.map((s) => s.slug);

/** Map any inbound ?sector= value (Quote internal or SEO slug) to Quote internal Sector. */
/**
 * Safe Batch 3 — Resolves any URL ?sector= value into a canonical primary
 * taxonomy slug (the 13 from `CANONICAL_PRIMARY_SLUGS`). Accepts:
 *   - SEO sector slugs (aluminum, steel, wood, glass, stainless-steel,
 *     fabrication-installation)
 *   - Legacy directory slugs via `LEGACY_SECTOR_TO_TAXONOMY_SLUG`
 *   - Canonical primary slugs directly
 */
import {
  CANONICAL_PRIMARY_SLUGS,
  type CanonicalPrimarySlug,
} from '@/modules/taxonomy/canonical-primaries';
import { resolveLegacySectorToTaxonomy } from '@/modules/taxonomy/legacy-mapping';

const CANONICAL_SET = new Set<string>(CANONICAL_PRIMARY_SLUGS);

// Legacy SEO slug → canonical primary slug.
const SEO_TO_CANONICAL: Record<SeoSectorSlug, CanonicalPrimarySlug> = {
  aluminum: 'aluminum-works',
  steel: 'steel-metal-works',
  wood: 'wood-carpentry',
  glass: 'glass-securit-works',
  'stainless-steel': 'stainless-steel-works',
  'fabrication-installation': 'contracting-finishing',
};

export function resolveQuoteSectorFromUrl(
  value: string | null | undefined,
): CanonicalPrimarySlug | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (CANONICAL_SET.has(v)) return v as CanonicalPrimarySlug;
  if (SEO_TO_CANONICAL[v as SeoSectorSlug]) return SEO_TO_CANONICAL[v as SeoSectorSlug];
  const mapped = resolveLegacySectorToTaxonomy(v);
  if (mapped && CANONICAL_SET.has(mapped)) return mapped as CanonicalPrimarySlug;
  return null;
}

/* -------------------------------------------------------------------------- */
/* Phase 2B — Canonical SEO coverage (13/13 canonical primaries)               */
/* -------------------------------------------------------------------------- */
/**
 * Lightweight SEO surface keyed by the 13 canonical primary slugs. This
 * sits ALONGSIDE the legacy `SECTORS_SEO` map (which keeps powering the
 * 6 legacy /sectors/<slug> routes unchanged) and gives downstream code a
 * single source of meta title/description/H1/CTA per canonical primary.
 *
 * No routes change: nothing here is wired into `SECTORS_SEO_LIST` or the
 * existing `<Route path="/sectors/aluminum" …>` entries. Pages that want
 * canonical-aware meta opt in via `getCanonicalSectorSeo(slug)`.
 */
export interface CanonicalSectorSeoEntry {
  canonicalSlug: CanonicalPrimarySlug;
  name: string;
  shortName: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  hero: string;
  primaryCta: string;
  secondaryCta: string;
  /** Optional pointer back to the legacy SEO slug when one exists. */
  legacySeoSlug?: SeoSectorSlug;
}

const fromLegacy = (
  canonicalSlug: CanonicalPrimarySlug,
  legacy: SectorSeo,
): CanonicalSectorSeoEntry => ({
  canonicalSlug,
  name: legacy.name,
  shortName: legacy.shortName,
  metaTitle: legacy.metaTitle,
  metaDescription: legacy.metaDescription,
  h1: legacy.h1,
  hero: legacy.hero,
  primaryCta: legacy.primaryCta,
  secondaryCta: legacy.secondaryCta,
  legacySeoSlug: legacy.slug,
});

export const SECTORS_SEO_CANONICAL: Record<CanonicalPrimarySlug, CanonicalSectorSeoEntry> = {
  'aluminum-works': fromLegacy('aluminum-works', SECTORS_SEO.aluminum),
  'steel-metal-works': fromLegacy('steel-metal-works', SECTORS_SEO.steel),
  'wood-carpentry': fromLegacy('wood-carpentry', SECTORS_SEO.wood),
  'glass-securit-works': fromLegacy('glass-securit-works', SECTORS_SEO.glass),
  'stainless-steel-works': fromLegacy('stainless-steel-works', SECTORS_SEO['stainless-steel']),
  'contracting-finishing': fromLegacy('contracting-finishing', SECTORS_SEO['fabrication-installation']),
  'kitchens-works': {
    canonicalSlug: 'kitchens-works',
    name: 'المطابخ',
    shortName: 'مطابخ',
    metaTitle: 'المطابخ — تفصيل وتركيب مطابخ ألمنيوم وخشب | قطاعات',
    metaDescription:
      'ابحث عن مزودي تفصيل وتركيب المطابخ في السعودية: مطابخ ألمنيوم وخشب وبولي لاك وكوارتز وكوريان، واطلب عرض سعر عبر قطاعات.',
    h1: 'تفصيل وتركيب المطابخ',
    hero: 'مطابخ منزلية وتجارية مفصّلة حسب المقاس مع خيارات متعددة للأسطح والواجهات.',
    primaryCta: 'اطلب عرض سعر للمطبخ',
    secondaryCta: 'استعرض مزودي المطابخ',
  },
  'facades-cladding': {
    canonicalSlug: 'facades-cladding',
    name: 'الواجهات والكلادينج',
    shortName: 'واجهات وكلادينج',
    metaTitle: 'الواجهات والكلادينج — تنفيذ واجهات مباني وفلل | قطاعات',
    metaDescription:
      'مزودو الواجهات والكلادينج للمباني التجارية والسكنية: ألوبوند، HPL، GRC، زجاج ستركشر. اطلب عرض سعر عبر قطاعات.',
    h1: 'الواجهات والكلادينج للمباني',
    hero: 'تنفيذ واجهات معمارية وكلادينج بأنواعه للمباني التجارية والسكنية والفلل.',
    primaryCta: 'اطلب عرض سعر للواجهات',
    secondaryCta: 'استعرض مزودي الواجهات',
  },
  'elevators-maintenance': {
    canonicalSlug: 'elevators-maintenance',
    name: 'المصاعد والصيانة',
    shortName: 'مصاعد',
    metaTitle: 'المصاعد والصيانة — تركيب وصيانة مصاعد وسلالم متحركة | قطاعات',
    metaDescription:
      'تركيب وصيانة وتشغيل المصاعد والسلالم المتحركة للمباني السكنية والتجارية في السعودية. اطلب عرض سعر عبر قطاعات.',
    h1: 'المصاعد والصيانة',
    hero: 'مزودون متخصصون في تركيب المصاعد، السلالم المتحركة، وعقود الصيانة الدورية.',
    primaryCta: 'اطلب عرض سعر للمصاعد',
    secondaryCta: 'استعرض مزودي المصاعد',
  },
  'energy-sustainability': {
    canonicalSlug: 'energy-sustainability',
    name: 'الطاقة والاستدامة',
    shortName: 'طاقة',
    metaTitle: 'الطاقة والاستدامة — أنظمة الطاقة الشمسية وكفاءة الطاقة | قطاعات',
    metaDescription:
      'حلول الطاقة الشمسية، كفاءة الطاقة، الإضاءة الموفّرة، والعزل الحراري للمنشآت في السعودية. اطلب عرض سعر عبر قطاعات.',
    h1: 'الطاقة والاستدامة',
    hero: 'أنظمة طاقة شمسية، حلول كفاءة طاقة، وعزل حراري للمباني والمنشآت.',
    primaryCta: 'اطلب عرض سعر للطاقة',
    secondaryCta: 'استعرض مزودي الطاقة',
  },
  'technology-networks': {
    canonicalSlug: 'technology-networks',
    name: 'التقنية والشبكات',
    shortName: 'تقنية وشبكات',
    metaTitle: 'التقنية والشبكات — أنظمة الشبكات والاتصالات والبنية التحتية | قطاعات',
    metaDescription:
      'حلول الشبكات السلكية واللاسلكية، الكابلات، السنترالات، أنظمة الاتصالات وأنظمة المباني الذكية. اطلب عرض سعر عبر قطاعات.',
    h1: 'التقنية والشبكات',
    hero: 'تأسيس وتمديد شبكات البيانات والاتصالات وأنظمة المباني الذكية.',
    primaryCta: 'اطلب عرض سعر للتقنية',
    secondaryCta: 'استعرض مزودي التقنية',
  },
  'security-control-systems': {
    canonicalSlug: 'security-control-systems',
    name: 'الأمن وأنظمة التحكم',
    shortName: 'أمن وتحكم',
    metaTitle: 'الأمن وأنظمة التحكم — كاميرات وإنذار ومراقبة وصول | قطاعات',
    metaDescription:
      'كاميرات مراقبة، أنظمة إنذار، تحكم بالوصول، بوابات أمنية، وأنظمة حماية للمنشآت في السعودية. اطلب عرض سعر عبر قطاعات.',
    h1: 'الأمن وأنظمة التحكم',
    hero: 'كاميرات مراقبة، إنذار، تحكم بالدخول، وأنظمة حماية متكاملة للمنشآت.',
    primaryCta: 'اطلب عرض سعر للأمن',
    secondaryCta: 'استعرض مزودي الأمن',
  },
  'equipment-rental': {
    canonicalSlug: 'equipment-rental',
    name: 'تأجير المعدات',
    shortName: 'تأجير معدات',
    metaTitle: 'تأجير المعدات — معدات ثقيلة، رافعات، سقالات | قطاعات',
    metaDescription:
      'تأجير المعدات الثقيلة، الرافعات، السقالات، عربات النقل، ومعدات المواقع الإنشائية في السعودية. اطلب عرض سعر عبر قطاعات.',
    h1: 'تأجير المعدات للمواقع',
    hero: 'رافعات، سقالات، معدات ثقيلة، وحلول لوجستية للمواقع الإنشائية.',
    primaryCta: 'اطلب عرض سعر للتأجير',
    secondaryCta: 'استعرض مزودي التأجير',
  },
};

/** Returns the canonical SEO entry for a canonical primary slug or `null`. */
export function getCanonicalSectorSeo(
  slug: string | null | undefined,
): CanonicalSectorSeoEntry | null {
  if (!slug) return null;
  const norm = slug.trim().toLowerCase();
  if (norm in SECTORS_SEO_CANONICAL) {
    return SECTORS_SEO_CANONICAL[norm as CanonicalPrimarySlug];
  }
  return null;
}