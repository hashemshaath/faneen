import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { usePageMeta, useJsonLd } from '@/hooks/usePageMeta';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Tag, Video, Star, Play, Calendar, Eye, ArrowUpRight, Clock, Flame, Search, ArrowLeft, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollToTop } from '@/components/ScrollToTop';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { track } from '@/lib/analytics-events';
import { getMembershipTierLabel } from '@/modules/memberships';

const Offers = () => {
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: language === 'ar' ? 'العروض والتخفيضات - خصومات على خدمات الألمنيوم والحديد | قِطاعات' : 'Offers & Deals - Aluminum & Iron Discounts | Qitaat',
    description: language === 'ar' ? 'اكتشف أحدث العروض والتخفيضات من مزودي خدمات الألمنيوم والحديد والزجاج والخشب.' : 'Discover the latest offers and deals from aluminum, iron, glass and wood service providers.',
    canonical: 'https://qitaat.com/offers',
  });

  useJsonLd(useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'قِطاعات', item: 'https://qitaat.com' },
      { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'العروض' : 'Offers', item: 'https://qitaat.com/offers' },
    ],
  }), [language]));

  const [activeTab, setActiveTab] = useState<string>('all');
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'ending' | 'discount'>('recent');

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['public-promotions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('promotions')
        .select('*, businesses!inner(id, name_ar, name_en, username, logo_url, rating_avg, is_verified, membership_tier, approval_status, is_active)')
        .eq('is_active', true)
        .eq('businesses.approval_status', 'approved')
        .eq('businesses.is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  // Track view for a single promotion (intersection observer based)
  const trackPromoView = useCallback(async (id: string) => {
    if (trackedIds.has(id)) return;
    setTrackedIds(prev => new Set(prev).add(id));
    const promo = promotions.find((p) => p.id === id);
    track.offerView({
      offer_slug: (promo as { slug?: string } | undefined)?.slug || id,
      business_slug: (promo as { businesses?: { username?: string } } | undefined)?.businesses?.username,
    });
    try {
      await supabase.rpc('track_content_interaction', {
        _content_type: 'promotion',
        _content_id: id,
        _event_type: 'view',
        _session_id: sessionStorage.getItem('qi_session_id') || crypto.randomUUID(),
        _metadata: {},
      });
    } catch (_e) { /* view tracking failed */ }
  }, [trackedIds, promotions]);

  // Intersection observer for view tracking
  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('data-promo-id');
        if (id) trackPromoView(id);
      }
    });
  }, [trackPromoView]);

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.5 });
    const cards = document.querySelectorAll('[data-promo-id]');
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [promotions, observerCallback, activeTab]);

  const filtered = useMemo(() => {
    let list = activeTab === 'all' ? promotions : promotions.filter((p) => p.promotion_type === activeTab);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const t = `${p.title_ar || ''} ${p.title_en || ''} ${p.description_ar || ''} ${p.description_en || ''} ${p.businesses?.name_ar || ''} ${p.businesses?.name_en || ''}`.toLowerCase();
        return t.includes(q);
      });
    }
    const sorted = [...list];
    if (sortBy === 'popular') sorted.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    else if (sortBy === 'discount') sorted.sort((a, b) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
    else if (sortBy === 'ending') sorted.sort((a, b) => {
      const ad = a.end_date ? new Date(a.end_date).getTime() : Infinity;
      const bd = b.end_date ? new Date(b.end_date).getTime() : Infinity;
      return ad - bd;
    });
    else sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted;
  }, [promotions, activeTab, searchQuery, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = promotions.length;
    const offers = promotions.filter((p) => p.promotion_type === 'offer').length;
    const ads = promotions.filter((p) => p.promotion_type === 'ad').length;
    const videos = promotions.filter((p) => p.promotion_type === 'video').length;
    const totalViews = promotions.reduce((s: number, p) => s + (p.views_count || 0), 0);
    return { total, offers, ads, videos, totalViews };
  }, [promotions]);

  const getVideoEmbed = (url: string) => {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vim = url.match(/vimeo\.com\/(\d+)/);
    if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
    return null;
  };

  const isNew = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // 7 days
  };

  const isExpiringSoon = (endDate: string | null) => {
    if (!endDate) return false;
    const diff = new Date(endDate).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // 3 days
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <ScrollToTop />

      {/* Hero Cover */}
      <section className="bg-primary pt-24 sm:pt-28 pb-12 sm:pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(var(--accent) / 0.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, hsl(var(--accent) / 0.2) 0%, transparent 40%)" }} />
        <div className="container-app relative z-10 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/30">
            <Megaphone className={`w-8 h-8 sm:w-10 sm:h-10 text-accent-foreground ${isRTL ? '-scale-x-100' : ''}`} />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-4xl text-surface-nav-foreground mb-3">
            {isRTL ? 'العروض والإعلانات' : 'Offers & Promotions'}
          </h1>
          <p className="text-surface-nav-foreground/60 font-body max-w-lg mx-auto text-sm sm:text-base">
            {isRTL ? 'تصفح أحدث العروض والخصومات والفيديوهات الترويجية من مزودي الخدمة المعتمدين' : 'Browse latest offers, discounts, and promotional videos from verified providers'}
          </p>

          {/* Stats Bar — direction-agnostic centered layout */}
          {!isLoading && (
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-6 sm:mt-8 max-w-2xl mx-auto">
              {[
                { icon: Megaphone, label: isRTL ? 'إجمالي العروض' : 'Total', value: stats.total, color: 'text-accent', bg: 'bg-accent/10', mirror: true },
                { icon: Tag, label: isRTL ? 'عروض خاصة' : 'Offers', value: stats.offers, color: 'text-success', bg: 'bg-success/15' },
                { icon: Video, label: isRTL ? 'فيديو' : 'Videos', value: stats.videos, color: 'text-info', bg: 'bg-info/15' },
                { icon: Eye, label: isRTL ? 'مشاهدة' : 'Views', value: stats.totalViews, color: 'text-secondary', bg: 'bg-secondary/15' },
              ].map((s, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center gap-1.5 bg-surface-nav-foreground/[0.06] backdrop-blur-sm border border-surface-nav-foreground/10 rounded-xl px-2 py-3 text-center"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                    <s.icon className={`w-4 h-4 ${s.color} ${s.mirror && isRTL ? '-scale-x-100' : ''}`} />
                  </div>
                  <div className="font-heading font-bold text-surface-nav-foreground text-sm sm:text-base leading-none tech-content">
                    {s.value.toLocaleString()}
                  </div>
                  <div className="text-surface-nav-foreground/55 text-[10px] leading-tight">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="container-app py-6 sm:py-8">
        {/* Search + Sort toolbar */}
        <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              dir="auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'ابحث في العروض، المزودين، الأوصاف…' : 'Search offers, providers, descriptions…'}
              aria-label={isRTL ? 'البحث في العروض' : 'Search offers'}
              className="ps-9 h-11 rounded-xl bg-card border-border/60 focus-visible:ring-accent"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="sm:w-52 h-11 rounded-xl bg-card border-border/60">
              <SlidersHorizontal className="w-4 h-4 me-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{isRTL ? 'الأحدث' : 'Most recent'}</SelectItem>
              <SelectItem value="popular">{isRTL ? 'الأكثر مشاهدة' : 'Most viewed'}</SelectItem>
              <SelectItem value="ending">{isRTL ? 'ينتهي قريباً' : 'Ending soon'}</SelectItem>
              <SelectItem value="discount">{isRTL ? 'أعلى خصم' : 'Highest discount'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Tabs */}
        <Tabs dir={isRTL ? 'rtl' : 'ltr'} value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="sticky top-[64px] z-10 -mx-4 px-4 py-2 bg-background/85 backdrop-blur-md border-y border-border/40 sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:py-0 sm:static sm:mx-0 sm:px-0 flex items-center justify-center overflow-x-auto no-scrollbar">
            <TabsList className="bg-muted/50 dark:bg-muted/30 rounded-xl p-1 inline-flex">
              <TabsTrigger value="all" className="rounded-lg px-4 py-2 text-xs sm:text-sm gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                {isRTL ? 'الكل' : 'All'}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ms-1">{stats.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="offer" className="rounded-lg px-4 py-2 text-xs sm:text-sm gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <Tag className="ic-xs" />
                {isRTL ? 'عروض' : 'Offers'}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ms-1">{stats.offers}</Badge>
              </TabsTrigger>
              <TabsTrigger value="ad" className="rounded-lg px-4 py-2 text-xs sm:text-sm gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <Megaphone className="ic-xs" />
                {isRTL ? 'إعلانات' : 'Ads'}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ms-1">{stats.ads}</Badge>
              </TabsTrigger>
              <TabsTrigger value="video" className="rounded-lg px-4 py-2 text-xs sm:text-sm gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <Video className="ic-xs" />
                {isRTL ? 'فيديو' : 'Videos'}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ms-1">{stats.videos}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-52 w-full rounded-none" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Megaphone className="w-10 h-10 opacity-30" />
                </div>
                <p className="text-lg font-heading font-bold mb-1 text-foreground">
                  {searchQuery ? (isRTL ? 'لا توجد نتائج مطابقة' : 'No matching results') : (isRTL ? 'لا توجد عروض حالياً' : 'No promotions available')}
                </p>
                <p className="text-sm">
                  {searchQuery ? (isRTL ? 'جرّب كلمات مفتاحية مختلفة' : 'Try different keywords') : (isRTL ? 'تابعنا لمعرفة أحدث العروض والإعلانات' : 'Stay tuned for the latest offers')}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-heading text-accent hover:underline"
                  >
                    {isRTL ? 'مسح البحث' : 'Clear search'}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p, index: number) => {
                  const biz = p.businesses;
                  const embed = p.video_url ? getVideoEmbed(p.video_url) : null;
                  const expiringSoon = isExpiringSoon(p.end_date);
                  const isNewPromo = isNew(p.created_at);

                  return (
                    <Card
                      key={p.id}
                      data-promo-id={p.id}
                      className="overflow-hidden group hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1 hover:border-accent/40 transition-all duration-500 border-border/50 animate-card-slide-up"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      {/* Media */}
                      <div className="relative overflow-hidden">
                        {p.promotion_type === 'video' && embed ? (
                          <div className="aspect-video">
                            <iframe src={embed} className="w-full h-full" allowFullScreen frameBorder="0" loading="lazy" />
                          </div>
                        ) : p.promotion_type === 'video' && p.video_url && !embed ? (
                          <div className="aspect-video bg-black">
                            <video src={p.video_url} controls className="w-full h-full object-contain" preload="metadata" />
                          </div>
                        ) : p.image_url ? (
                          <div className="h-52 overflow-hidden">
                            <img src={p.image_url} alt={isRTL ? p.title_ar : (p.title_en || p.title_ar)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                          </div>
                        ) : (
                          <div className="h-52 bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                            {p.promotion_type === 'video' ? (
                              <Play className="w-12 h-12 text-accent/40 transition-transform duration-500 group-hover:scale-125" />
                            ) : (
                              <Tag className="w-12 h-12 text-accent/40 transition-transform duration-500 group-hover:scale-125" />
                            )}
                          </div>
                        )}

                        {/* Hover overlay */}
                        {!(p.promotion_type === 'video' && (embed || p.video_url)) && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        )}

                        {/* Badges top-start */}
                        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
                          {p.promotion_type === 'offer' && p.discount_percentage && (
                            <Badge className="bg-destructive text-white text-xs shadow-lg">
                              -{p.discount_percentage}%
                            </Badge>
                          )}
                          {p.promotion_type !== 'offer' && (
                            <Badge className="bg-accent text-accent-foreground text-[10px] shadow-lg">
                              {p.promotion_type === 'video' ? (isRTL ? 'فيديو' : 'Video') : (isRTL ? 'إعلان' : 'Ad')}
                            </Badge>
                          )}
                          {isNewPromo && (
                            <Badge className="bg-success text-white text-[10px] shadow-lg flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" />
                              {isRTL ? 'جديد' : 'New'}
                            </Badge>
                          )}
                          {expiringSoon && (
                            <Badge className="bg-urgent text-white text-[10px] shadow-lg flex items-center gap-0.5 animate-pulse">
                              <Clock className="w-2.5 h-2.5" />
                              {isRTL ? 'ينتهي قريباً' : 'Ending soon'}
                            </Badge>
                          )}
                        </div>

                        {/* Views badge top-end */}
                        <div className="absolute top-3 end-3">
                          <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm text-white text-[10px] flex items-center gap-1 border-0">
                            <Eye className="ic-2xs" />
                            <span className="tech-content">{(p.views_count || 0).toLocaleString()}</span>
                          </Badge>
                        </div>

                        {/* Membership tier indicator */}
                        {biz?.membership_tier && biz.membership_tier !== 'free' && (
                          <div className="absolute bottom-3 end-3">
                            <Badge className={`text-[9px] border-0 shadow-lg ${
                              biz.membership_tier === 'enterprise' ? 'bg-secondary/90 text-white' :
                              biz.membership_tier === 'premium' ? 'bg-accent text-accent-foreground' :
                              'bg-info/90 text-white'
                            }`}>
                              {biz.membership_tier === 'enterprise' ? (isRTL ? 'مؤسسي' : 'Enterprise') :
                               biz.membership_tier === 'premium' ? (isRTL ? 'مميز' : 'Premium') :
                               (isRTL ? 'أساسي' : 'Basic')}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardContent className="card-pad-md space-y-3">
                        {/* Provider info */}
                        {biz && (
                          <Link to={`/${biz.username}`} className="flex items-center gap-2.5 group/biz">
                            <div className="w-9 h-9 rounded-full bg-muted overflow-hidden ring-2 ring-transparent transition-all duration-300 group-hover/biz:ring-accent/30 shrink-0">
                              {biz.logo_url ? (
                                <img src={biz.logo_url} alt={isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)} className="w-full h-full object-cover" />
                              ) : (
                                <span className="flex items-center justify-center w-full h-full text-xs font-bold bg-accent/10 text-accent">
                                  {biz.name_ar[0]}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-medium transition-colors duration-300 group-hover/biz:text-accent block truncate">
                                {isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}
                              </span>
                              <div className="flex items-center gap-1">
                                <Star className="ic-2xs fill-accent text-accent" />
                                <span className="text-[11px] text-muted-foreground tech-content">{Number(biz.rating_avg).toFixed(1)}</span>
                                {biz.is_verified && <VerifiedBadge size="xs" className="ms-1" />}
                              </div>
                            </div>
                            {isRTL
                              ? <ArrowUpRight className="ic-sm text-muted-foreground/40 group-hover/biz:text-accent transition-colors shrink-0 -scale-x-100" />
                              : <ArrowUpRight className="ic-sm text-muted-foreground/40 group-hover/biz:text-accent transition-colors shrink-0" />}
                          </Link>
                        )}

                        {/* Title */}
                        <h3 className="font-heading font-bold text-sm sm:text-base transition-colors duration-300 group-hover:text-accent line-clamp-2">
                          {isRTL ? p.title_ar : (p.title_en || p.title_ar)}
                        </h3>

                        {/* Description */}
                        {(p.description_ar || p.description_en) && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {isRTL ? p.description_ar : (p.description_en || p.description_ar)}
                          </p>
                        )}

                        {/* Price section */}
                        {p.promotion_type === 'offer' && p.original_price && (
                          <div className="flex items-center gap-2.5 bg-muted/50 dark:bg-muted/30 rounded-xl px-3 py-2.5 transition-colors duration-300 group-hover:bg-accent/10">
                            <span className="line-through text-muted-foreground text-xs tech-content">
                              {Number(p.original_price).toLocaleString()}
                            </span>
                            <span className="text-base sm:text-lg font-bold text-success dark:text-success tech-content">
                              {Number(p.offer_price).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{p.currency_code}</span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/30 transition-colors duration-300 group-hover:border-accent/20">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Calendar className="ic-2xs" />
                            <span className="tech-content truncate">
                              {new Date(p.start_date).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                            </span>
                            {p.end_date && (
                              <>
                                {isRTL
                                  ? <ArrowLeft className="w-3 h-3 opacity-60" />
                                  : <ArrowRight className="w-3 h-3 opacity-60" />}
                                <span className="tech-content truncate">
                                  {new Date(p.end_date).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US')}
                                </span>
                              </>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="ic-2xs" />
                            <span className="tech-content">{(p.views_count || 0).toLocaleString()}</span>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default Offers;
