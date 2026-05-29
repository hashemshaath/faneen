/**
 * Provider Growth Engine v1.0 — pure analytics helpers.
 *
 * No DB access, no Supabase imports. Everything in this module operates
 * on plain data passed in by callers. Mirrors the publishing rules in
 * `PublishReadinessPanel` (single source of truth for required fields)
 * and the `businesses_public` filter.
 */

export interface GrowthBusiness {
  id?: string;
  name_ar?: string | null;
  name_en?: string | null;
  username?: string | null;
  username_status?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  short_description_ar?: string | null;
  short_description_en?: string | null;
  sectors?: string[] | null;
  sub_services?: string[] | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  city_id?: string | null;
  country_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  approval_status?: string | null;
  is_active?: boolean | null;
  is_demo?: boolean | null;
  verified?: boolean | null;
  gallery_count?: number | null;
  onboarding_completion?: number | null;
  created_at?: string | null;
  submitted_at?: string | null;
  published_at?: string | null;
}

/* ────────────────────────────────────────────────────────────────────── */
/* PART A — Provider funnel                                               */
/* ────────────────────────────────────────────────────────────────────── */

export type FunnelStage =
  | 'registered'
  | 'onboarding_started'
  | 'profile_completed'
  | 'username_approved'
  | 'published'
  | 'active'
  | 'verified';

export interface FunnelStageResult {
  stage: FunnelStage;
  count: number;
  /** Conversion from the previous stage (0..1). 1.0 for the first stage. */
  conversionFromPrev: number;
  /** Drop-off from the previous stage (count delta). */
  dropOffFromPrev: number;
}

export interface ProviderFunnel {
  stages: FunnelStageResult[];
  /** Overall registered → published conversion (0..1). */
  overallConversion: number;
  /** Stage with the largest drop-off from its predecessor. */
  largestDropOffStage: FunnelStage | null;
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.max(0, Math.min(1, numerator / denominator));
}

export function computeProviderFunnel(businesses: GrowthBusiness[]): ProviderFunnel {
  const counts: Record<FunnelStage, number> = {
    registered: 0,
    onboarding_started: 0,
    profile_completed: 0,
    username_approved: 0,
    published: 0,
    active: 0,
    verified: 0,
  };

  for (const b of businesses) {
    counts.registered += 1;
    const completion = b.onboarding_completion ?? 0;
    if (completion > 0 || b.name_ar || b.name_en) counts.onboarding_started += 1;
    if (completion >= 80 || (b.name_ar && (b.sectors?.length ?? 0) > 0 && (b.email || b.phone))) {
      counts.profile_completed += 1;
    }
    if (b.username && b.username_status === 'approved') counts.username_approved += 1;
    if (b.approval_status === 'published') counts.published += 1;
    if (b.approval_status === 'published' && b.is_active !== false && b.is_demo !== true) counts.active += 1;
    if (b.verified === true) counts.verified += 1;
  }

  const order: FunnelStage[] = [
    'registered',
    'onboarding_started',
    'profile_completed',
    'username_approved',
    'published',
    'active',
    'verified',
  ];

  const stages: FunnelStageResult[] = order.map((stage, i) => {
    const c = counts[stage];
    if (i === 0) {
      return { stage, count: c, conversionFromPrev: c > 0 ? 1 : 0, dropOffFromPrev: 0 };
    }
    const prev = counts[order[i - 1]];
    return {
      stage,
      count: c,
      conversionFromPrev: safeRate(c, prev),
      dropOffFromPrev: Math.max(0, prev - c),
    };
  });

  let largest: FunnelStage | null = null;
  let largestVal = -1;
  for (let i = 1; i < stages.length; i += 1) {
    if (stages[i].dropOffFromPrev > largestVal) {
      largestVal = stages[i].dropOffFromPrev;
      largest = stages[i].stage;
    }
  }
  if (largestVal <= 0) largest = null;

  return {
    stages,
    overallConversion: safeRate(counts.published, counts.registered),
    largestDropOffStage: largest,
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/* PART B — Profile completeness score                                    */
/* ────────────────────────────────────────────────────────────────────── */

export type ScoreLevel = 'weak' | 'good' | 'excellent';

export interface ProfileScoreFactor {
  key: string;
  weight: number;
  ok: boolean;
  level: 'required' | 'recommended' | 'optional';
  ar: string;
  en: string;
  helpSlug?: string;
}

export interface ProfileScore {
  score: number;
  level: ScoreLevel;
  factors: ProfileScoreFactor[];
  missingRequired: ProfileScoreFactor[];
  missingRecommended: ProfileScoreFactor[];
  missingOptional: ProfileScoreFactor[];
  nextBestActions: ProfileScoreFactor[];
}

const FACTOR_DEFS: Omit<ProfileScoreFactor, 'ok'>[] = [
  // Required — mirrors PublishReadinessPanel.computeReadiness blockers.
  { key: 'name',         weight: 12, level: 'required',    ar: 'اسم المنشأة',        en: 'Business name',          helpSlug: 'profile-basics' },
  { key: 'username',     weight: 12, level: 'required',    ar: 'اسم مستخدم معتمد',   en: 'Approved username',      helpSlug: 'username-approval' },
  { key: 'sectors',      weight: 10, level: 'required',    ar: 'القطاعات',           en: 'Sectors',                helpSlug: 'sectors-and-services' },
  { key: 'contact',      weight: 10, level: 'required',    ar: 'وسيلة تواصل',        en: 'Contact method',         helpSlug: 'contact-methods' },
  // Recommended.
  { key: 'logo',         weight: 10, level: 'recommended', ar: 'الشعار',             en: 'Logo',                   helpSlug: 'profile-branding' },
  { key: 'description',  weight: 10, level: 'recommended', ar: 'وصف المنشأة',        en: 'Business description',   helpSlug: 'profile-description' },
  { key: 'services',     weight: 8,  level: 'recommended', ar: 'الخدمات الفرعية',    en: 'Sub-services',           helpSlug: 'sectors-and-services' },
  { key: 'city',         weight: 6,  level: 'recommended', ar: 'المدينة/الموقع',     en: 'City / location',        helpSlug: 'location-setup' },
  { key: 'published',    weight: 10, level: 'recommended', ar: 'منشور للجمهور',      en: 'Published publicly',     helpSlug: 'publishing-workflow' },
  // Optional.
  { key: 'banner',       weight: 4,  level: 'optional',    ar: 'صورة الغلاف',        en: 'Banner image',           helpSlug: 'profile-branding' },
  { key: 'gallery',      weight: 4,  level: 'optional',    ar: 'معرض/مشاريع',        en: 'Gallery / projects',     helpSlug: 'gallery-projects' },
  { key: 'verified',     weight: 4,  level: 'optional',    ar: 'موثّق',              en: 'Verified',               helpSlug: 'verification' },
];

function evalFactor(key: string, b: GrowthBusiness): boolean {
  switch (key) {
    case 'name':         return Boolean(b.name_ar || b.name_en);
    case 'username':     return Boolean(b.username && b.username_status === 'approved');
    case 'sectors':      return (b.sectors?.length ?? 0) > 0;
    case 'contact':      return Boolean(b.email || b.phone);
    case 'logo':         return Boolean(b.logo_url);
    case 'description':  return Boolean(
      (b.description_ar && b.description_ar.length >= 40) ||
      (b.description_en && b.description_en.length >= 40) ||
      (b.short_description_ar && b.short_description_ar.length >= 40) ||
      (b.short_description_en && b.short_description_en.length >= 40),
    );
    case 'services':     return (b.sub_services?.length ?? 0) > 0;
    case 'city':         return Boolean(b.city || b.city_id);
    case 'published':    return b.approval_status === 'published' && b.is_active !== false && b.is_demo !== true;
    case 'banner':       return Boolean(b.banner_url);
    case 'gallery':      return (b.gallery_count ?? 0) > 0;
    case 'verified':     return b.verified === true;
    default:             return false;
  }
}

export function computeProviderProfileScore(b: GrowthBusiness): ProfileScore {
  const factors: ProfileScoreFactor[] = FACTOR_DEFS.map((def) => ({
    ...def,
    ok: evalFactor(def.key, b),
  }));

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const earned = factors.reduce((sum, f) => sum + (f.ok ? f.weight : 0), 0);
  const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;

  const level: ScoreLevel = score >= 85 ? 'excellent' : score >= 60 ? 'good' : 'weak';

  const missingRequired = factors.filter((f) => !f.ok && f.level === 'required');
  const missingRecommended = factors.filter((f) => !f.ok && f.level === 'recommended');
  const missingOptional = factors.filter((f) => !f.ok && f.level === 'optional');

  // Next best actions: required first, then recommended by weight, capped 4.
  const nextBestActions = [
    ...missingRequired,
    ...[...missingRecommended].sort((a, b2) => b2.weight - a.weight),
  ].slice(0, 4);

  return { score, level, factors, missingRequired, missingRecommended, missingOptional, nextBestActions };
}

/* ────────────────────────────────────────────────────────────────────── */
/* PART E — Directory quality                                             */
/* ────────────────────────────────────────────────────────────────────── */

export interface DirectoryQuality {
  totalProviders: number;
  publishedProviders: number;
  verifiedProviders: number;
  withLogo: number;
  withDescription: number;
  withSectors: number;
  withServices: number;
  withContact: number;
  averageProfileScore: number;
  readinessScore: number;
  weakSpots: string[];
  suggestedAdminActions: string[];
}

export function computeDirectoryQuality(rows: GrowthBusiness[]): DirectoryQuality {
  const totalProviders = rows.length;
  let published = 0;
  let verified = 0;
  let logo = 0;
  let desc = 0;
  let sectors = 0;
  let services = 0;
  let contact = 0;
  let scoreSum = 0;

  for (const b of rows) {
    if (evalFactor('published', b)) published += 1;
    if (b.verified === true) verified += 1;
    if (b.logo_url) logo += 1;
    if (evalFactor('description', b)) desc += 1;
    if ((b.sectors?.length ?? 0) > 0) sectors += 1;
    if ((b.sub_services?.length ?? 0) > 0) services += 1;
    if (b.email || b.phone) contact += 1;
    scoreSum += computeProviderProfileScore(b).score;
  }

  const averageProfileScore = totalProviders > 0 ? Math.round(scoreSum / totalProviders) : 0;
  // Readiness score blends publishing rate, verification rate, and avg profile quality.
  const pubRate = safeRate(published, totalProviders);
  const verRate = safeRate(verified, totalProviders);
  const readinessScore = Math.round((pubRate * 50 + verRate * 20 + (averageProfileScore / 100) * 30));

  const weakSpots: string[] = [];
  const suggestedAdminActions: string[] = [];
  if (totalProviders === 0) {
    weakSpots.push('no_providers');
    suggestedAdminActions.push('invite_providers');
    return {
      totalProviders, publishedProviders: published, verifiedProviders: verified,
      withLogo: logo, withDescription: desc, withSectors: sectors, withServices: services, withContact: contact,
      averageProfileScore, readinessScore: 0, weakSpots, suggestedAdminActions,
    };
  }
  if (pubRate < 0.3) { weakSpots.push('low_publish_rate'); suggestedAdminActions.push('review_drafts'); }
  if (verRate < 0.2) { weakSpots.push('low_verification_rate'); suggestedAdminActions.push('start_verification_program'); }
  if (safeRate(logo, totalProviders) < 0.7) { weakSpots.push('missing_logos'); suggestedAdminActions.push('nudge_logo_uploads'); }
  if (safeRate(desc, totalProviders) < 0.6) { weakSpots.push('missing_descriptions'); suggestedAdminActions.push('nudge_descriptions'); }
  if (safeRate(services, totalProviders) < 0.6) { weakSpots.push('missing_services'); suggestedAdminActions.push('nudge_services'); }

  return {
    totalProviders,
    publishedProviders: published,
    verifiedProviders: verified,
    withLogo: logo,
    withDescription: desc,
    withSectors: sectors,
    withServices: services,
    withContact: contact,
    averageProfileScore,
    readinessScore,
    weakSpots,
    suggestedAdminActions,
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/* PART G — Provider SEO score                                            */
/* ────────────────────────────────────────────────────────────────────── */

export interface SeoIssue {
  key: string;
  ar: string;
  en: string;
  helpSlug?: string;
}

export interface ProviderSeo {
  score: number;
  issues: SeoIssue[];
  recommendations: SeoIssue[];
}

export function computeProviderSeoScore(b: GrowthBusiness): ProviderSeo {
  const issues: SeoIssue[] = [];
  const recs: SeoIssue[] = [];
  let pts = 0;
  const max = 100;

  // Username (15)
  if (b.username && b.username_status === 'approved') pts += 15;
  else issues.push({ key: 'username', ar: 'اسم مستخدم نظيف ومعتمد ضروري للرابط العام.', en: 'A clean, approved username is required for the public URL.', helpSlug: 'username-approval' });

  // Name quality (10)
  const name = b.name_ar ?? b.name_en ?? '';
  if (name.trim().length >= 3) pts += 10;
  else issues.push({ key: 'name', ar: 'اسم المنشأة قصير جداً أو مفقود.', en: 'Business name is missing or too short.', helpSlug: 'profile-basics' });

  // Description length (15)
  const desc = (b.description_ar || b.description_en || b.short_description_ar || b.short_description_en || '').trim();
  if (desc.length >= 120) pts += 15;
  else if (desc.length >= 40) { pts += 8; recs.push({ key: 'description-longer', ar: 'وسّع الوصف لـ 120 حرفًا فأكثر لتحسين الظهور.', en: 'Expand description to 120+ chars for better discoverability.', helpSlug: 'profile-description' }); }
  else issues.push({ key: 'description', ar: 'الوصف غير كافٍ لمحركات البحث.', en: 'Description is too short for search engines.', helpSlug: 'profile-description' });

  // Sectors keywords (10)
  if ((b.sectors?.length ?? 0) >= 1) pts += 10;
  else issues.push({ key: 'sectors', ar: 'أضف القطاعات لتظهر في نتائج التصنيف.', en: 'Add sectors so you appear in category results.', helpSlug: 'sectors-and-services' });

  // Services keywords (10)
  if ((b.sub_services?.length ?? 0) >= 2) pts += 10;
  else if ((b.sub_services?.length ?? 0) === 1) { pts += 5; recs.push({ key: 'services-more', ar: 'أضف خدمات إضافية لتغطي كلمات بحث أوسع.', en: 'Add more sub-services to cover wider search terms.', helpSlug: 'sectors-and-services' }); }
  else issues.push({ key: 'services', ar: 'لا توجد خدمات فرعية — تفقد فرص بحث مهمة.', en: 'No sub-services — missing important search opportunities.', helpSlug: 'sectors-and-services' });

  // City/location (10)
  if (b.city || b.city_id) pts += 10;
  else issues.push({ key: 'city', ar: 'حدّد المدينة لتظهر في بحوث "قرب الموقع".', en: 'Set the city to surface in "near me" searches.', helpSlug: 'location-setup' });

  // Logo (10)
  if (b.logo_url) pts += 10;
  else recs.push({ key: 'logo', ar: 'أضف شعارًا لرفع نسبة النقر على بطاقتك.', en: 'Add a logo to improve click-through on your card.', helpSlug: 'profile-branding' });

  // Gallery/projects (10)
  if ((b.gallery_count ?? 0) >= 3) pts += 10;
  else if ((b.gallery_count ?? 0) >= 1) { pts += 5; recs.push({ key: 'gallery-more', ar: 'أضف صور مشاريع إضافية (3+) لتعزيز الثقة.', en: 'Add more project images (3+) to build trust.', helpSlug: 'gallery-projects' }); }
  else recs.push({ key: 'gallery', ar: 'أضف صور مشاريع لزيادة المصداقية.', en: 'Add project images to boost credibility.', helpSlug: 'gallery-projects' });

  // Published + internal-link readiness (10)
  if (b.approval_status === 'published' && b.is_active !== false && b.is_demo !== true) pts += 10;
  else issues.push({ key: 'published', ar: 'الملف غير منشور — لا يُفهرس في خرائط الموقع.', en: 'Profile is not published — not included in sitemap.', helpSlug: 'publishing-workflow' });

  const score = Math.max(0, Math.min(max, pts));
  return { score, issues, recommendations: recs };
}

/* ────────────────────────────────────────────────────────────────────── */
/* PART H — Help Center guidance mapping                                  */
/* ────────────────────────────────────────────────────────────────────── */

/**
 * Returns the existing Help Center URL for a given factor / issue key.
 * Falls back to the Help Center home when the specific article slug is
 * not known to this map — never produces a 404-shaped link.
 */
export function helpLinkForKey(key: string | undefined): string {
  if (!key) return '/help';
  const map: Record<string, string> = {
    name: '/help',
    username: '/help',
    'username-approval': '/help',
    sectors: '/help',
    'sectors-and-services': '/help',
    services: '/help',
    'services-more': '/help',
    contact: '/help',
    'contact-methods': '/help',
    logo: '/help',
    'profile-branding': '/help',
    description: '/help',
    'description-longer': '/help',
    'profile-description': '/help',
    city: '/help',
    'location-setup': '/help',
    published: '/help',
    'publishing-workflow': '/help',
    banner: '/help',
    gallery: '/help',
    'gallery-more': '/help',
    'gallery-projects': '/help',
    verified: '/help',
    verification: '/help',
  };
  return map[key] ?? '/help';
}

/**
 * Public alias used by PublishReadinessPanel and growth UIs.
 * Maps a profile/SEO action key to an existing Help Center route.
 */
export const mapProfileActionToHelpLink = helpLinkForKey;