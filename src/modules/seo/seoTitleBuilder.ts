/**
 * SEO-TITLES-METADATA-OPTIMIZER-1 — Unified title/description builder.
 *
 * One source of truth for page titles, meta descriptions, OG titles, and
 * JSON-LD names across the public Qitaat surface. Supports Arabic + English
 * with safe fallbacks when fields are missing.
 */

export type Lang = 'ar' | 'en';

export type PageKind =
  | 'home'
  | 'company'
  | 'category'
  | 'brand'
  | 'service'
  | 'product'
  | 'project'
  | 'blog'
  | 'search'
  | 'offer'
  | 'help';

export interface SeoInputs {
  kind: PageKind;
  lang: Lang;
  /** Primary entity name (company, category, brand, service, post title…). */
  name?: string | null;
  /** Activity / nature of business (e.g. "ألمنيوم", "Aluminum Fabrication"). */
  activity?: string | null;
  city?: string | null;
  category?: string | null;
  brand?: string | null;
  service?: string | null;
  /** Optional override: an editor-supplied SEO title (already localized). */
  customTitle?: string | null;
  /** Optional override: an editor-supplied meta description (already localized). */
  customDescription?: string | null;
  /** Optional fallback description text (e.g. profile bio, post excerpt). */
  rawDescription?: string | null;
  /** Extra keywords appended to keyword meta. */
  keywords?: string[];
}

export const SITE_NAME_AR = 'قطاعات';
export const SITE_NAME_EN = 'Qitaat';
export const COUNTRY_AR = 'السعودية';
export const COUNTRY_EN = 'Saudi Arabia';

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 158;

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const REF_ID_RE = /\b[A-Z]{2,4}-\d{6,}\b/;

/** Strip control chars, collapse whitespace, trim. Never returns null. */
export function cleanText(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    // strip HTML
    .replace(/<[^>]*>/g, ' ')
    // strip markdown emphasis / links syntax
    .replace(/[*_`~]+/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // collapse whitespace incl. newlines
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncate at a soft word boundary near `max`, append ellipsis when cut. */
export function truncate(input: string, max: number): string {
  const text = cleanText(input);
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const cutoff = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cutoff.trim()}…`;
}

/** Returns true when string contains a raw UUID or internal Ref ID. */
export function containsRawId(input: string | null | undefined): boolean {
  if (!input) return false;
  return UUID_RE.test(input) || REF_ID_RE.test(input);
}

function siteSuffix(lang: Lang): string {
  return lang === 'ar' ? ` | ${SITE_NAME_AR}` : ` | ${SITE_NAME_EN}`;
}

function withSite(title: string, lang: Lang): string {
  const trimmed = title.trim();
  if (!trimmed) return lang === 'ar' ? SITE_NAME_AR : SITE_NAME_EN;
  if (trimmed.includes(SITE_NAME_AR) || trimmed.includes(SITE_NAME_EN)) {
    return truncate(trimmed, TITLE_MAX);
  }
  // Budget the prefix so the final length stays within TITLE_MAX.
  const suffix = siteSuffix(lang);
  const budget = TITLE_MAX - suffix.length;
  const prefix = trimmed.length > budget ? truncate(trimmed, budget) : trimmed;
  return `${prefix}${suffix}`;
}

function fallbackName(kind: PageKind, lang: Lang): string {
  const map: Record<PageKind, [string, string]> = {
    home: ['الرئيسية', 'Home'],
    company: ['شركة', 'Company'],
    category: ['تصنيف', 'Category'],
    brand: ['علامة تجارية', 'Brand'],
    service: ['خدمة', 'Service'],
    product: ['منتج', 'Product'],
    project: ['مشروع', 'Project'],
    blog: ['مقال', 'Article'],
    search: ['بحث', 'Search'],
    offer: ['عرض', 'Offer'],
    help: ['مساعدة', 'Help'],
  };
  const [ar, en] = map[kind];
  return lang === 'ar' ? ar : en;
}

/**
 * Build a fully-formatted, language-correct page title with site suffix.
 * Honors `customTitle` when provided; otherwise applies the kind-specific
 * template with safe fallbacks for missing fields.
 */
export function buildSeoTitle(inputs: SeoInputs): string {
  const { kind, lang } = inputs;

  // Editor-supplied title wins, but we still scrub IDs + clamp length.
  if (inputs.customTitle && inputs.customTitle.trim()) {
    const safe = cleanText(inputs.customTitle).replace(UUID_RE, '').replace(REF_ID_RE, '').trim();
    if (safe) return withSite(safe, lang);
  }

  const name = cleanText(inputs.name) || fallbackName(kind, lang);
  const activity = cleanText(inputs.activity);
  const city = cleanText(inputs.city);
  const category = cleanText(inputs.category);
  const brand = cleanText(inputs.brand);
  const service = cleanText(inputs.service);

  let core = '';
  if (lang === 'ar') {
    switch (kind) {
      case 'home':
        core = 'دليل قطاعات الصناعة | مزودون ومصانع وورش';
        break;
      case 'company':
        core = activity && city
          ? `${name} | ${activity} في ${city}`
          : activity
            ? `${name} | ${activity}`
            : city
              ? `${name} | ${city}`
              : name;
        break;
      case 'category':
        core = `${name} في ${COUNTRY_AR} | مزودون ومصانع وورش`;
        break;
      case 'brand':
        core = `${name} | مزودون معتمدون وخدمات مرتبطة`;
        break;
      case 'service':
      case 'product':
        core = `${name} | عروض ومزودون موثوقون`;
        break;
      case 'project':
        core = brand || category
          ? `${name} | ${brand || category}`
          : `${name} | مشروع`;
        break;
      case 'blog':
        core = `${name} | مدونة قطاعات`;
        // mdonah already includes brand, return early to avoid double suffix
        return truncate(core, TITLE_MAX);
      case 'search':
        core = service
          ? `ابحث عن ${service} | مزودو خدمات التصنيع والتشطيب`
          : 'ابحث عن مزودي خدمات التصنيع والتشطيب';
        break;
      case 'offer':
        core = `${name} | عرض حصري`;
        break;
      case 'help':
        core = `${name} | مركز المساعدة`;
        break;
    }
  } else {
    switch (kind) {
      case 'home':
        core = 'Industrial Sectors Directory | Suppliers, Factories & Workshops';
        break;
      case 'company':
        core = activity && city
          ? `${name} | ${activity} in ${city}`
          : activity
            ? `${name} | ${activity}`
            : city
              ? `${name} | ${city}`
              : name;
        break;
      case 'category':
        core = `${name} in ${COUNTRY_EN} | Suppliers, Factories & Workshops`;
        break;
      case 'brand':
        core = `${name} | Verified Providers & Related Services`;
        break;
      case 'service':
      case 'product':
        core = `${name} | Quotes & Trusted Providers`;
        break;
      case 'project':
        core = brand || category
          ? `${name} | ${brand || category}`
          : `${name} | Project`;
        break;
      case 'blog':
        core = `${name} | Qitaat Blog`;
        return truncate(core, TITLE_MAX);
      case 'search':
        core = service
          ? `Find ${service} Providers | Fabrication & Finishing`
          : 'Find Fabrication & Finishing Providers';
        break;
      case 'offer':
        core = `${name} | Exclusive Offer`;
        break;
      case 'help':
        core = `${name} | Help Center`;
        break;
    }
  }

  return withSite(core, lang);
}

/**
 * Build a localized meta description: editor override → derived from rawDescription
 * → kind-specific generic template. Always within DESCRIPTION_MAX chars.
 */
export function buildSeoDescription(inputs: SeoInputs): string {
  const { lang, kind } = inputs;

  if (inputs.customDescription && inputs.customDescription.trim()) {
    return truncate(cleanText(inputs.customDescription), DESCRIPTION_MAX);
  }

  const raw = cleanText(inputs.rawDescription);
  if (raw.length >= 60) {
    return truncate(raw, DESCRIPTION_MAX);
  }

  const name = cleanText(inputs.name) || fallbackName(kind, lang);
  const city = cleanText(inputs.city);
  const activity = cleanText(inputs.activity);

  let core = '';
  if (lang === 'ar') {
    switch (kind) {
      case 'home':
        core = 'منصة قطاعات تجمع مصانع وورش ومزودي خدمات الألمنيوم والزجاج والخشب والحديد في السعودية. قارن، تواصل، واحصل على عروض موثوقة.';
        break;
      case 'company':
        core = activity && city
          ? `${name} — ${activity} في ${city}. تواصل مباشر، اطلب عرض سعر، واطّلع على المشاريع والمعرض على قطاعات.`
          : `${name} على قطاعات. تواصل مباشر، اطلب عرض سعر، واطّلع على المشاريع والخدمات.`;
        break;
      case 'category':
        core = `استكشف أفضل مزودي ${name} في ${COUNTRY_AR}: مصانع وورش وخدمات معتمدة. قارن واطلب عروض أسعار عبر قطاعات.`;
        break;
      case 'brand':
        core = `${name}: مزودون معتمدون، منتجات أصلية، وخدمات تركيب وصيانة موثوقة عبر قطاعات.`;
        break;
      case 'service':
      case 'product':
        core = `${name} — قارن الأسعار، اطلب عرض، وتواصل مع مزودين موثوقين على قطاعات.`;
        break;
      case 'project':
        core = `تفاصيل مشروع ${name}: المواد، التنفيذ، والصور — تصفّح المشاريع المشابهة على قطاعات.`;
        break;
      case 'blog':
        core = `اقرأ "${name}" على مدونة قطاعات: أدلة ونصائح في قطاعات الصناعة والتشطيب.`;
        break;
      case 'search':
        core = 'ابحث عن مزودي خدمات التصنيع والتشطيب: ألمنيوم، زجاج، خشب، حديد. نتائج فورية مع تواصل مباشر.';
        break;
      case 'offer':
        core = `${name}: عرض حصري ومحدود من مزودين موثوقين على قطاعات.`;
        break;
      case 'help':
        core = `${name} — إجابات وأدلة استخدام منصة قطاعات.`;
        break;
    }
  } else {
    switch (kind) {
      case 'home':
        core = 'Qitaat connects Saudi factories, workshops, and service providers across Aluminum, Glass, Wood, and Steel. Compare, contact, and request trusted quotes.';
        break;
      case 'company':
        core = activity && city
          ? `${name} — ${activity} in ${city}. Contact directly, request a quote, and browse projects on Qitaat.`
          : `${name} on Qitaat. Contact directly, request a quote, and browse projects.`;
        break;
      case 'category':
        core = `Discover top ${name} providers in ${COUNTRY_EN}: certified factories, workshops, and services. Compare and request quotes on Qitaat.`;
        break;
      case 'brand':
        core = `${name}: verified providers, authentic products, and trusted installation and service partners on Qitaat.`;
        break;
      case 'service':
      case 'product':
        core = `${name} — compare prices, request a quote, and reach trusted providers on Qitaat.`;
        break;
      case 'project':
        core = `Project details for ${name}: materials, execution, and gallery — explore related projects on Qitaat.`;
        break;
      case 'blog':
        core = `Read "${name}" on the Qitaat blog: guides and insights across industrial fabrication and finishing.`;
        break;
      case 'search':
        core = 'Find fabrication and finishing providers: Aluminum, Glass, Wood, Steel. Instant results with direct contact.';
        break;
      case 'offer':
        core = `${name}: an exclusive limited offer from trusted providers on Qitaat.`;
        break;
      case 'help':
        core = `${name} — guides and answers for using the Qitaat platform.`;
        break;
    }
  }

  return truncate(core, DESCRIPTION_MAX);
}

/** Join keyword array into the comma-separated form expected by meta tags. */
export function buildSeoKeywords(inputs: SeoInputs): string | undefined {
  const seed = [
    inputs.name,
    inputs.activity,
    inputs.city,
    inputs.category,
    inputs.brand,
    inputs.service,
    inputs.lang === 'ar' ? SITE_NAME_AR : SITE_NAME_EN,
  ];
  const all = [...seed, ...(inputs.keywords ?? [])]
    .map((v) => cleanText(v))
    .filter((v) => v.length > 1);
  const unique = Array.from(new Set(all));
  if (unique.length === 0) return undefined;
  return unique.slice(0, 12).join(', ');
}

export interface SeoOutputs {
  title: string;
  description: string;
  keywords?: string;
}

/** Convenience: builds title + description + keywords in one call. */
export function buildSeo(inputs: SeoInputs): SeoOutputs {
  return {
    title: buildSeoTitle(inputs),
    description: buildSeoDescription(inputs),
    keywords: buildSeoKeywords(inputs),
  };
}