import { supabase } from '@/integrations/supabase/client';

export interface LandingContent {
  id: string;
  section_key: string;
  title_ar: string | null;
  title_en: string | null;
  subtitle_ar: string | null;
  subtitle_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  image_url: string | null;
  cta_primary_label_ar: string | null;
  cta_primary_label_en: string | null;
  cta_primary_href: string | null;
  cta_secondary_label_ar: string | null;
  cta_secondary_label_en: string | null;
  cta_secondary_href: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface LandingFeature {
  id: string;
  icon_name: string;
  title_ar: string;
  title_en: string | null;
  desc_ar: string;
  desc_en: string | null;
  category: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface LandingFaq {
  id: string;
  question_ar: string;
  question_en: string | null;
  answer_ar: string;
  answer_en: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface LandingTestimonial {
  id: string;
  business_id: string | null;
  quote_ar: string;
  quote_en: string | null;
  author_name: string;
  author_role_ar: string | null;
  author_role_en: string | null;
  avatar_url: string | null;
  rating: number | null;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface LandingSettings {
  id: number;
  seo_title_ar: string | null;
  seo_title_en: string | null;
  seo_desc_ar: string | null;
  seo_desc_en: string | null;
  keywords: string | null;
  og_image_url: string | null;
  hero_video_url: string | null;
  ga4_measurement_id: string | null;
  gtm_container_id: string | null;
  gsc_verification: string | null;
  bing_verification: string | null;
  yandex_verification: string | null;
  indexnow_key: string | null;
  enable_tracking: boolean;
}

export const fetchLandingContent = async (): Promise<LandingContent[]> => {
  const { data, error } = await supabase
    .from('provider_landing_content')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LandingContent[];
};

export const fetchLandingFeatures = async (): Promise<LandingFeature[]> => {
  const { data, error } = await supabase
    .from('provider_landing_features')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LandingFeature[];
};

export const fetchLandingFaq = async (): Promise<LandingFaq[]> => {
  const { data, error } = await supabase
    .from('provider_landing_faq')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LandingFaq[];
};

export const fetchLandingTestimonials = async (): Promise<LandingTestimonial[]> => {
  const { data, error } = await supabase
    .from('provider_landing_testimonials')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LandingTestimonial[];
};

export const fetchLandingSettings = async (): Promise<LandingSettings | null> => {
  const { data, error } = await supabase
    // Public-safe view: excludes the secret IndexNow key. Admin screens write
    // directly to provider_landing_settings via the admin policy.
    .from('provider_landing_settings_public' as never)
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  const row = (data ?? null) as Omit<LandingSettings, 'indexnow_key'> | null;
  return row ? ({ ...row, indexnow_key: null } as LandingSettings) : null;
};

export interface LandingMetricsSummary {
  totalViews: number;
  uniqueSessions: number;
  ctaClicks: number;
  signups: number;
  conversionRate: number;
  bySource: Array<{ source: string; count: number }>;
  bySection: Array<{ section: string; count: number }>;
  byDay: Array<{ day: string; views: number; clicks: number }>;
}

export const fetchLandingMetrics = async (days = 30): Promise<LandingMetricsSummary> => {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await supabase
    .from('provider_landing_metrics')
    .select('event_type, section, utm_source, session_id, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  const rows = data ?? [];

  const sessions = new Set<string>();
  let views = 0;
  let ctaClicks = 0;
  let signups = 0;
  const sourceMap = new Map<string, number>();
  const sectionMap = new Map<string, number>();
  const dayMap = new Map<string, { views: number; clicks: number }>();

  for (const r of rows) {
    if (r.session_id) sessions.add(r.session_id);
    if (r.event_type === 'view') views++;
    if (r.event_type === 'cta_click') ctaClicks++;
    if (r.event_type === 'signup') signups++;
    if (r.utm_source) sourceMap.set(r.utm_source, (sourceMap.get(r.utm_source) ?? 0) + 1);
    if (r.section) sectionMap.set(r.section, (sectionMap.get(r.section) ?? 0) + 1);
    const day = new Date(r.created_at as string).toISOString().slice(0, 10);
    const cur = dayMap.get(day) ?? { views: 0, clicks: 0 };
    if (r.event_type === 'view') cur.views++;
    if (r.event_type === 'cta_click') cur.clicks++;
    dayMap.set(day, cur);
  }

  return {
    totalViews: views,
    uniqueSessions: sessions.size,
    ctaClicks,
    signups,
    conversionRate: views > 0 ? Math.round((signups / views) * 1000) / 10 : 0,
    bySource: [...sourceMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source, count]) => ({ source, count })),
    bySection: [...sectionMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([section, count]) => ({ section, count })),
    byDay: [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => ({ day, ...v })),
  };
};
