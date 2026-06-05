import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Phone, Mail, Globe, MessageCircle, ArrowLeft, ExternalLink,
  Star, UserCog, Instagram, Linkedin, Facebook, Youtube, Building2,
  Loader2, Boxes, Tag, Navigation, Share2, Check,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useJsonLd } from '@/hooks/usePageMeta';
import {
  listBranchServiceIds,
  listBranchPromotionIds,
  listServicesByBusiness,
} from '@/modules/catalog';
import { listBusinessesByIds, getBusinessIdByUsername } from '@/modules/businesses';
import { listProfilesByUserIds } from '@/modules/users';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BranchReviews } from '@/components/branch/BranchReviews';
import { toast } from 'sonner';

const t = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);

interface PublicBranch {
  id: string;
  business_id: string;
  ref_id: string | null;
  slug: string | null;
  is_main: boolean;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  customer_service_phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  region: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  sales_manager_staff_id: string | null;
  social_instagram: string | null;
  social_x: string | null;
  social_tiktok: string | null;
  social_linkedin: string | null;
  social_facebook: string | null;
  social_snapchat: string | null;
  social_youtube: string | null;
}

interface BusinessLite {
  id: string;
  username: string | null;
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
}

interface ServiceCard { id: string; name_ar: string; name_en: string | null; price_from: number | null; currency_code: string }
interface PromotionCard { id: string; title_ar: string; title_en: string | null; image_url: string | null; offer_price: number | null; original_price: number | null; currency_code: string }

const BranchDetail: React.FC = () => {
  // Supports two URL shapes:
  //   /branch/:slug                (legacy global slug)
  //   /:username/:branchSlug       (nested under business — preferred)
  const params = useParams<{ slug?: string; branchSlug?: string; username?: string }>();
  const slug = params.branchSlug ?? params.slug;
  const usernameParam = params.branchSlug ? params.username : undefined;
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // 0) When the URL is nested, resolve the parent business first so we can scope the lookup.
  const { data: scopedBusinessId } = useQuery({
    queryKey: ['branch-scope-business', usernameParam?.toLowerCase()],
    enabled: Boolean(usernameParam),
    queryFn: async () => {
      const { data } = await getBusinessIdByUsername({ username: usernameParam! });
      return data?.id ?? null;
    },
    staleTime: 60_000,
  });

  // 1) Branch (public view)
  const { data: branch, isLoading } = useQuery({
    queryKey: ['public-branch', slug, scopedBusinessId ?? null],
    enabled: Boolean(slug) && (!usernameParam || scopedBusinessId !== undefined),
    queryFn: async () => {
      // Nested form: scope by business_id (slug is unique per business).
      if (scopedBusinessId) {
        const { data, error } = await supabase
          .from('business_branches_public' as 'business_branches')
          .select('*')
          .eq('business_id', scopedBusinessId)
          .eq('slug', slug!)
          .maybeSingle();
        if (error) throw error;
        if (data) return data as unknown as PublicBranch | null;
      }

      // Legacy global lookup by slug
      const { data, error } = await supabase
        .from('business_branches_public' as 'business_branches')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as PublicBranch | null;

      // Backward-compat: old URLs like /branch/loc1000002 → match by ref_id (LOC-1000002)
      const refGuess = slug!.toUpperCase().replace(/^([A-Z]+)(\d+)$/, '$1-$2');
      const { data: byRef } = await supabase
        .from('business_branches_public' as 'business_branches')
        .select('*')
        .eq('ref_id', refGuess)
        .maybeSingle();
      return (byRef as unknown as PublicBranch | null) ?? null;
    },
  });

  // 2) Parent business
  const { data: business } = useQuery({
    queryKey: ['public-branch-business', branch?.business_id],
    enabled: Boolean(branch?.business_id),
    queryFn: async () => {
      const { data } = await listBusinessesByIds<BusinessLite>({
        ids: [branch!.business_id],
        select: 'id, username, name_ar, name_en, logo_url',
      });
      return (data?.[0] ?? null) as BusinessLite | null;
    },
  });

  // 3) Sales manager (resolved via security definer? — fallback safe display)
  const { data: salesManager } = useQuery({
    queryKey: ['branch-sales-manager', branch?.sales_manager_staff_id],
    enabled: Boolean(branch?.sales_manager_staff_id),
    queryFn: async () => {
      const { data: staff } = await supabase
        .from('business_staff')
        .select('id, user_id, role')
        .eq('id', branch!.sales_manager_staff_id!)
        .maybeSingle();
      if (!staff) return null;
      const uid = (staff as { user_id: string }).user_id;
      const { data: profiles } = await listProfilesByUserIds<{
        user_id: string; full_name: string | null; phone: string | null;
        email: string | null; avatar_url: string | null;
      }>({ userIds: [uid], select: 'user_id, full_name, phone, email, avatar_url' });
      const p = profiles?.[0];
      return p ? { full_name: p.full_name, phone: p.phone, email: p.email, avatar_url: p.avatar_url } : null;
    },
  });

  // 4) Linked services / promotions
  const { data: linkedServiceIds } = useQuery({
    queryKey: ['public-branch-services', branch?.id],
    enabled: Boolean(branch?.id),
    queryFn: async () => (await listBranchServiceIds(branch!.id)).data ?? [],
  });

  const { data: linkedPromotionIds } = useQuery({
    queryKey: ['public-branch-promotions', branch?.id],
    enabled: Boolean(branch?.id),
    queryFn: async () => (await listBranchPromotionIds(branch!.id)).data ?? [],
  });

  const { data: services } = useQuery({
    queryKey: ['branch-services-cards', branch?.id, branch?.business_id, linkedServiceIds?.length],
    enabled: Boolean(branch?.business_id),
    queryFn: async () => {
      // If branch has explicit links → show only those. Else show all active business services.
      const { data } = await listServicesByBusiness<ServiceCard>({
        businessId: branch!.business_id,
        select: 'id, name_ar, name_en, price_from, currency_code, is_active',
        activeOnly: true,
      });
      const all = (data ?? []) as ServiceCard[];
      const linked = linkedServiceIds ?? [];
      const filtered = linked.length > 0 ? all.filter(s => linked.includes(s.id)) : all;
      return filtered.slice(0, 24);
    },
  });

  const { data: promotions } = useQuery({
    queryKey: ['branch-promotions-cards', branch?.id, branch?.business_id, linkedPromotionIds?.length],
    enabled: Boolean(branch?.business_id),
    queryFn: async () => {
      const base = supabase
        .from('promotions')
        .select('id, title_ar, title_en, image_url, offer_price, original_price, currency_code, is_active')
        .eq('business_id', branch!.business_id)
        .eq('is_active', true);
      const q = (linkedPromotionIds?.length ?? 0) > 0 ? base.in('id', linkedPromotionIds!) : base;
      const { data } = await q.limit(12);
      return (data ?? []) as PromotionCard[];
    },
  });

  const branchName = branch ? (isRTL ? branch.name_ar : (branch.name_en || branch.name_ar)) : '';
  const businessName = business ? (isRTL ? (business.name_ar || business.name_en || '') : (business.name_en || business.name_ar || '')) : '';

  const locationLabel = branch
    ? [branch.region, branch.district].filter(Boolean).join('، ')
    : '';
  const seoDescription = branch
    ? (
        (isRTL ? branch.description_ar : (branch.description_en || branch.description_ar)) ||
        (isRTL
          ? `فرع ${branchName} التابع لـ${businessName}${locationLabel ? ` في ${locationLabel}` : ''} — العنوان، أرقام التواصل، الخدمات والتقييمات على قِطاعات.`
          : `${branchName} branch of ${businessName}${locationLabel ? ` in ${locationLabel}` : ''} — address, contact numbers, services and reviews on Qitaat.`)
      )
    : undefined;
  usePageMeta({
    title: branch
      ? (isRTL
          ? `${branchName} — ${businessName}${locationLabel ? ` · ${locationLabel}` : ''} | قِطاعات`
          : `${branchName} — ${businessName}${locationLabel ? ` · ${locationLabel}` : ''} | Qitaat`)
      : t(isRTL, 'فرع | قِطاعات', 'Branch | Qitaat'),
    description: seoDescription,
    ogTitle: branch ? `${branchName} — ${businessName}${locationLabel ? ` · ${locationLabel}` : ''}` : undefined,
    ogDescription: seoDescription,
    ogImage: business?.logo_url || undefined,
    ogType: 'business.business',
    canonical: branch?.slug && business?.username
      ? `https://qitaat.com/${business.username}/${branch.slug}`
      : (branch?.slug ? `https://qitaat.com/branch/${branch.slug}` : undefined),
  });

  // Aggregate review stats for SEO (AggregateRating in JSON-LD).
  const { data: reviewStats } = useQuery({
    queryKey: ['branch-review-stats', branch?.id],
    enabled: Boolean(branch?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('rating')
        .eq('branch_id', branch!.id);
      const rows = (data ?? []) as Array<{ rating: number }>;
      const count = rows.length;
      const avg = count > 0 ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
      return { count, avg };
    },
  });

  // JSON-LD LocalBusiness with AggregateRating + breadcrumbs
  const jsonLd = useMemo(() => {
    if (!branch || !business) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: `${branchName} — ${businessName}`,
      image: business.logo_url ?? undefined,
      address: (branch.address || branch.region || branch.district) ? {
        '@type': 'PostalAddress',
        streetAddress: branch.address ?? undefined,
        addressLocality: branch.district ?? undefined,
        addressRegion: branch.region ?? undefined,
        addressCountry: 'SA',
      } : undefined,
      telephone: branch.phone || branch.mobile || undefined,
      email: branch.email || undefined,
      url: branch.slug && business.username
        ? `https://qitaat.com/${business.username}/${branch.slug}`
        : (branch.slug ? `https://qitaat.com/branch/${branch.slug}` : undefined),
      geo: branch.latitude && branch.longitude ? {
        '@type': 'GeoCoordinates',
        latitude: branch.latitude, longitude: branch.longitude,
      } : undefined,
      aggregateRating: (reviewStats && reviewStats.count > 0) ? {
        '@type': 'AggregateRating',
        ratingValue: Number(reviewStats.avg.toFixed(1)),
        reviewCount: reviewStats.count,
      } : undefined,
    };
  }, [branch, business, branchName, businessName, reviewStats]);
  useJsonLd(jsonLd);

  // Sibling branches (other branches of same business) — strengthens internal linking & SEO.
  const { data: siblings } = useQuery({
    queryKey: ['public-branch-siblings', branch?.business_id, branch?.id],
    enabled: Boolean(branch?.business_id && branch?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from('business_branches_public' as 'business_branches')
        .select('id, name_ar, name_en, slug, region, district, is_main')
        .eq('business_id', branch!.business_id)
        .neq('id', branch!.id)
        .limit(6);
      return (data ?? []) as Array<{
        id: string; name_ar: string; name_en: string | null; slug: string | null;
        region: string | null; district: string | null; is_main: boolean;
      }>;
    },
  });

  // BreadcrumbList JSON-LD (separate from LocalBusiness graph).
  const breadcrumbJsonLd = useMemo(() => {
    if (!branch) return null;
    const items = [
      { name: t(isRTL, 'الرئيسية', 'Home'), url: 'https://qitaat.com/' },
      business?.username ? { name: businessName, url: `https://qitaat.com/${business.username}` } : null,
      { name: branchName, url: branch.slug && business?.username
          ? `https://qitaat.com/${business.username}/${branch.slug}`
          : (branch.slug ? `https://qitaat.com/branch/${branch.slug}` : undefined) },
    ].filter(Boolean) as Array<{ name: string; url?: string }>;
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        item: it.url,
      })),
    };
  }, [branch, business, businessName, branchName, isRTL]);
  useJsonLd(breadcrumbJsonLd);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <Building2 className="w-16 h-16 text-muted-foreground/30" />
        <h1 className="text-xl font-semibold">{t(isRTL, 'الفرع غير موجود', 'Branch not found')}</h1>
        <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t(isRTL, 'رجوع', 'Back')}
        </Button>
      </div>
    );
  }

  const socials: Array<{ url: string; Icon: React.ComponentType<{ className?: string }>; label: string }> = [
    branch.social_instagram && { url: branch.social_instagram, Icon: Instagram, label: 'Instagram' },
    branch.social_facebook && { url: branch.social_facebook, Icon: Facebook, label: 'Facebook' },
    branch.social_linkedin && { url: branch.social_linkedin, Icon: Linkedin, label: 'LinkedIn' },
    branch.social_youtube && { url: branch.social_youtube, Icon: Youtube, label: 'YouTube' },
    branch.social_x && { url: branch.social_x, Icon: Globe, label: 'X' },
    branch.social_tiktok && { url: branch.social_tiktok, Icon: Globe, label: 'TikTok' },
    branch.social_snapchat && { url: branch.social_snapchat, Icon: Globe, label: 'Snapchat' },
  ].filter(Boolean) as Array<{ url: string; Icon: React.ComponentType<{ className?: string }>; label: string }>;

  const shareUrl = branch.slug && business?.username
    ? `https://qitaat.com/${business.username}/${branch.slug}`
    : (branch.slug ? `https://qitaat.com/branch/${branch.slug}` : window.location.href);
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${branchName} — ${businessName}`, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success(t(isRTL, 'تم نسخ الرابط', 'Link copied'));
        setTimeout(() => setCopied(false), 1800);
      }
    } catch { /* user cancelled */ }
  };

  const sectionNav = [
    { id: 'contact',   label: t(isRTL, 'التواصل',  'Contact') },
    salesManager && { id: 'manager',  label: t(isRTL, 'مدير المبيعات', 'Sales manager') },
    (services?.length ?? 0) > 0    && { id: 'services',  label: t(isRTL, 'الخدمات',  'Services') },
    (promotions?.length ?? 0) > 0  && { id: 'promotions',label: t(isRTL, 'العروض',   'Offers') },
    { id: 'reviews',   label: t(isRTL, 'التقييمات','Reviews') },
    (siblings?.length ?? 0) > 0    && { id: 'siblings',  label: t(isRTL, 'فروع أخرى','Other branches') },
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — matches BusinessProfile visual language (cover band + overlapping card) */}
      <header className="relative">
        <div className="relative h-28 overflow-hidden bg-primary sm:h-52 md:h-64">
          <div
            aria-hidden
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, hsl(var(--accent) / 0.4) 0%, transparent 60%)' }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.3) 0%, transparent 50%)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        <div className="container max-w-6xl mx-auto relative z-10 -mt-10 px-3 sm:-mt-20 sm:px-4">
          <nav className="flex items-center gap-2 text-xs text-primary-foreground/90 mb-3 px-1" aria-label="breadcrumb">
            <Link to="/" className="hover:text-accent">{t(isRTL, 'الرئيسية', 'Home')}</Link>
            <span className="opacity-60">/</span>
            {business?.username && (
              <>
                <Link to={`/${business.username}`} className="hover:text-accent truncate max-w-[200px]">{businessName}</Link>
                <span className="opacity-60">/</span>
              </>
            )}
            <span className="text-primary-foreground truncate">{branchName}</span>
          </nav>

          <div className="rounded-2xl border border-border/50 bg-card/95 p-4 shadow-xl backdrop-blur-xl dark:border-border/30 dark:bg-card/80 sm:rounded-[1.75rem] sm:p-6">
            <div className="flex flex-row items-start gap-3 sm:gap-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-accent/20 bg-background shadow-lg dark:border-accent/30 sm:h-24 sm:w-24 sm:rounded-3xl">
                {business?.logo_url ? (
                  
                  <img src={business.logo_url} alt={businessName} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="font-heading text-2xl font-black text-accent sm:text-4xl">
                    {(branchName || businessName || 'ق').charAt(0)}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="font-heading text-xl sm:text-3xl font-bold tracking-tight leading-tight" dir="auto">
                  {branchName}
                </h1>
                {businessName && business?.username && (
                  <Link
                    to={`/${business.username}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm sm:text-base text-muted-foreground hover:text-primary transition"
                    dir="auto"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    {t(isRTL, 'فرع تابع لـ', 'A branch of')}
                    <span className="font-semibold text-foreground">{businessName}</span>
                  </Link>
                )}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {branch.is_main && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      {t(isRTL, 'الفرع الرئيسي', 'Main branch')}
                    </Badge>
                  )}
                  {locationLabel && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="w-3 h-3" />
                      <span dir="auto">{locationLabel}</span>
                    </Badge>
                  )}
                </div>
                {(branch.description_ar || branch.description_en) && (
                  <p className="mt-3 text-sm text-muted-foreground max-w-2xl line-clamp-2" dir="auto">
                    {isRTL ? (branch.description_ar || branch.description_en) : (branch.description_en || branch.description_ar)}
                  </p>
                )}
              </div>
            </div>

            {/* CTA row */}
            <div className="mt-5 flex items-center gap-2 flex-wrap">
                {business?.username && (
                  <Button asChild size="sm" variant="outline" className="gap-2 rounded-xl">
                    <Link to={`/${business.username}`}>
                      <Building2 className="w-3.5 h-3.5" />
                      {t(isRTL, 'صفحة الشركة', 'Company page')}
                    </Link>
                  </Button>
                )}
                {(branch.phone || branch.mobile) && (
                  <Button asChild size="sm" className="gap-2 rounded-xl">
                    <a href={`tel:${branch.phone || branch.mobile}`}>
                      <Phone className="w-3.5 h-3.5" />
                      {t(isRTL, 'اتصل بالفرع', 'Call branch')}
                    </a>
                  </Button>
                )}
                {branch.whatsapp && (
                  <Button asChild size="sm" variant="outline" className="gap-2 rounded-xl">
                    <a href={`https://wa.me/${branch.whatsapp.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </Button>
                )}
                {(branch.latitude && branch.longitude) && (
                  <Button asChild size="sm" variant="outline" className="gap-2 rounded-xl">
                    <a href={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`} target="_blank" rel="noopener noreferrer">
                      <Navigation className="w-3.5 h-3.5" />
                      {t(isRTL, 'الاتجاهات', 'Directions')}
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={handleShare} className="gap-2 rounded-xl">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  {t(isRTL, 'مشاركة', 'Share')}
                </Button>
            </div>
          </div>
        </div>
      </header>

      {/* KPI strip + Section nav */}
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground me-2">
            {reviewStats && reviewStats.count > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Star className="w-3 h-3 fill-current" />
                <span className="tech-content font-semibold">{reviewStats.avg.toFixed(1)}</span>
                <span className="tech-content opacity-70">({reviewStats.count})</span>
              </span>
            )}
            {(services?.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Boxes className="w-3 h-3" />
                <span className="tech-content">{services!.length}</span>
                <span>{t(isRTL, 'خدمة', 'services')}</span>
              </span>
            )}
            {(promotions?.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <Tag className="w-3 h-3" />
                <span className="tech-content">{promotions!.length}</span>
                <span>{t(isRTL, 'عرض', 'offers')}</span>
              </span>
            )}
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar ms-auto" aria-label={t(isRTL,'أقسام الصفحة','Page sections')}>
            {sectionNav.map(s => (
              <a key={s.id} href={`#${s.id}`} className="text-xs px-3 py-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition whitespace-nowrap">
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Body */}
      <section className="container max-w-6xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-3">
        {/* Contact card */}
        <Card id="contact" className="lg:col-span-1 lg:sticky lg:top-32 h-fit scroll-mt-32">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              {t(isRTL, 'بيانات الاتصال بالفرع', 'Branch contact details')}
            </h2>
            <Separator />
            <ContactRow icon={Phone}    label={t(isRTL,'هاتف ثابت','Phone')}        value={branch.phone}        href={branch.phone ? `tel:${branch.phone}` : null} />
            <ContactRow icon={Phone}    label={t(isRTL,'جوال','Mobile')}             value={branch.mobile}       href={branch.mobile ? `tel:${branch.mobile}` : null} />
            <ContactRow icon={MessageCircle} label="WhatsApp"                         value={branch.whatsapp}     href={branch.whatsapp ? `https://wa.me/${branch.whatsapp.replace(/[^0-9]/g,'')}` : null} />
            <ContactRow icon={Phone}    label={t(isRTL,'خدمة العملاء','Customer service')} value={branch.customer_service_phone} href={branch.customer_service_phone ? `tel:${branch.customer_service_phone}` : null} />
            <ContactRow icon={Mail}     label={t(isRTL,'البريد','Email')}            value={branch.email}        href={branch.email ? `mailto:${branch.email}` : null} />
            <ContactRow icon={Globe}    label={t(isRTL,'الموقع','Website')}          value={branch.website}      href={branch.website} external />
            {branch.address && (
              <ContactRow icon={MapPin} label={t(isRTL,'العنوان','Address')} value={[branch.region, branch.district, branch.address].filter(Boolean).join('، ')} />
            )}

            {(branch.latitude && branch.longitude) && (
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/20">
                  <iframe
                    title={t(isRTL, 'موقع الفرع على الخريطة', 'Branch map')}
                    src={`https://maps.google.com/maps?q=${branch.latitude},${branch.longitude}&z=15&output=embed`}
                    className="w-full h-48 border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <Button asChild variant="outline" size="sm" className="w-full gap-2 rounded-xl">
                  <a
                    href={`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="w-4 h-4" />
                    {t(isRTL, 'افتح في خرائط Google', 'Open in Google Maps')}
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </Button>
              </div>
            )}

            {socials.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-2 flex-wrap">
                  {socials.map(({ url, Icon, label }) => (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition"
                      aria-label={label}>
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {salesManager && (
            <Card id="manager" className="scroll-mt-32">
              <CardContent className="p-6 space-y-3">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-primary" />
                  {t(isRTL, 'مدير المبيعات', 'Sales manager')}
                </h2>
                <Separator />
                <div className="flex items-center gap-4">
                  {salesManager.avatar_url ? (
                     
                    <img src={salesManager.avatar_url} alt="" loading="lazy" className="w-14 h-14 rounded-full object-cover border" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {(salesManager.full_name ?? '?').slice(0,1)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" dir="auto">{salesManager.full_name ?? t(isRTL, 'غير متوفر', 'N/A')}</p>
                    {salesManager.phone && (
                      <a href={`tel:${salesManager.phone}`} className="text-sm text-muted-foreground hover:text-primary tech-content inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />{salesManager.phone}
                      </a>
                    )}
                  </div>
                  {salesManager.phone && (
                    <Button asChild size="sm" variant="outline" className="gap-2">
                      <a href={`tel:${salesManager.phone}`}>
                        <Phone className="w-3.5 h-3.5" />
                        {t(isRTL, 'اتصل', 'Call')}
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(services?.length ?? 0) > 0 && (
            <Card id="services" className="scroll-mt-32">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-primary" />
                  {t(isRTL, 'المنتجات والخدمات', 'Products & Services')}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {services!.map(s => (
                    <div key={s.id} className="p-4 rounded-xl border border-border/60 hover-lift">
                      <p className="font-medium" dir="auto">{isRTL ? s.name_ar : (s.name_en || s.name_ar)}</p>
                      {s.price_from != null && (
                        <p className="text-sm text-muted-foreground tech-content mt-1">
                          {t(isRTL, 'من', 'From')} {s.price_from} {s.currency_code}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(promotions?.length ?? 0) > 0 && (
            <Card id="promotions" className="scroll-mt-32">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  {t(isRTL, 'العروض الخاصة', 'Special offers')}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {promotions!.map(p => (
                    <div key={p.id} className="p-4 rounded-xl border border-border/60 hover-lift">
                      {p.image_url && (
                         
                        <img src={p.image_url} alt="" loading="lazy" className="w-full aspect-video object-cover rounded-lg mb-3" />
                      )}
                      <p className="font-medium" dir="auto">{isRTL ? p.title_ar : (p.title_en || p.title_ar)}</p>
                      {p.offer_price != null && (
                        <p className="text-sm tech-content mt-1">
                          <span className="text-primary font-semibold">{p.offer_price} {p.currency_code}</span>
                          {p.original_price != null && (
                            <span className="text-muted-foreground line-through ms-2">{p.original_price}</span>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div id="reviews" className="scroll-mt-32">
            <BranchReviews branchId={branch.id} businessId={branch.business_id} />
          </div>

          {(siblings?.length ?? 0) > 0 && (
            <Card id="siblings" className="scroll-mt-32">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {t(isRTL, 'فروع أخرى للشركة', 'Other branches of this company')}
                  </h2>
                  {business?.username && (
                    <Button asChild size="sm" variant="ghost" className="gap-1">
                      <Link to={`/${business.username}#branches`}>
                        {t(isRTL, 'عرض الكل', 'View all')}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {siblings!.map(s => {
                    const name = isRTL ? s.name_ar : (s.name_en || s.name_ar);
                    const loc  = [s.region, s.district].filter(Boolean).join('، ');
                    return (
                      <Link
                        key={s.id}
                        to={s.slug && business?.username ? `/${business.username}/${s.slug}` : (s.slug ? `/branch/${s.slug}` : '#')}
                        className="group p-4 rounded-xl border border-border/60 hover-lift hover:border-primary/40 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium leading-tight group-hover:text-primary transition" dir="auto">{name}</p>
                          {s.is_main && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 shrink-0">
                              <Star className="w-2.5 h-2.5 fill-current" />
                            </Badge>
                          )}
                        </div>
                        {loc && (
                          <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1" dir="auto">
                            <MapPin className="w-3 h-3" />{loc}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

const ContactRow: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  href?: string | null;
  external?: boolean;
}> = ({ icon: Icon, label, value, href, external }) => {
  if (!value) return null;
  const body = (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium tech-content truncate" dir="ltr">{value}</p>
      </div>
      {external && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
    </div>
  );
  return href ? (
    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
       className="block hover:bg-muted/30 rounded-lg px-2 py-1 -mx-2 transition">
      {body}
    </a>
  ) : <div className="px-2 py-1 -mx-2">{body}</div>;
};

export default BranchDetail;