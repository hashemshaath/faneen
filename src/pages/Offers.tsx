import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { usePageMeta, useJsonLd } from '@/hooks/usePageMeta';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Megaphone, Tag, Video, Star, Play, Calendar, Eye, TrendingUp, ArrowUpRight, Clock, Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollToTop } from '@/components/ScrollToTop';

const Offers = () => {
  const { isRTL, language } = useLanguage();
  usePageMeta({
    title: language === 'ar' ? 'العروض والتخفيضات - خصومات على خدمات الألمنيوم والحديد | فنيين' : 'Offers & Deals - Aluminum & Iron Discounts | Faneen',
    description: language === 'ar' ? 'اكتشف أحدث العروض والتخفيضات من مزودي خدمات الألمنيوم والحديد والزجاج والخشب.' : 'Discover the latest offers and deals from aluminum, iron, glass and wood service providers.',
    canonical: 'https://faneen.com/offers',
  });

  useJsonLd(useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'فنيين', item: 'https://faneen.com' },
      { '@type': 'ListItem', position: 2, name: language === 'ar' ? 'العروض' : 'Offers', item: 'https://faneen.com/offers' },
    ],
  }), [language]));

  const [activeTab, setActiveTab] = useState<string>('all');
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['public-promotions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('promotions')
        .select('*, businesses(id, name_ar, name_en, username, logo_url, rating_avg, is_verified, membership_tier)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  // Track view for a single promotion (intersection observer based)
  const trackView = useCallback(async (id: string) => {
    if (trackedIds.has(id)) return;
    setTrackedIds(prev => new Set(prev).add(id));
    try {
      await supabase.rpc('increment_promotion_views', { _promotion_id: id });
    } catch {}
  }, [trackedIds]);

  // Intersection observer for view tracking
  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('data-promo-id');
        if (id) trackView(id);
      }
    });
  }, [trackView]);

  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, { threshold: 0.5 });
    const cards = document.querySelectorAll('[data-promo-id]');
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [promotions, observerCallback, activeTab]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return promotions;
    return promotions.filter((p: any) => p.promotion_type === activeTab);
  }, [promotions, activeTab]);

  // Stats
  const stats = useMemo(() => {
    const total = promotions.length;
    const offers = promotions.filter((p: any) => p.promotion_type === 'offer').length;
    const ads = promotions.filter((p: any) => p.promotion_type === 'ad').length;
    const videos = promotions.filter((p: any) => p.promotion_type === 'video').length;
    const totalViews = promotions.reduce((s: number, p: any) => s + (p.views_count || 0), 0);
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
      <section className="bg-gradient-navy pt-24 sm:pt-28 pb-12 sm:pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(42 85% 55% / 0.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, hsl(42 85% 55% / 0.2) 0%, transparent 40%)" }} />
        <div className="container relative z-10 text-center px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-gold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gold/30">
            <Megaphone className="w-8 h-8 sm:w-10 sm:h-10 text-secondary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-4xl text-surface-nav-foreground mb-3">
            {isRTL ? 'العروض والإعلانات' : 'Offers & Promotions'}
          </h1>
          <p className="text-surface-nav-foreground/60 font-body max-w-lg mx-auto text-sm sm:text-base">
            {isRTL ? 'تصفح أحدث العروض والخصومات والفيديوهات الترويجية من مزودي الخدمة المعتمدين' : 'Browse latest offers, discounts, and promotional videos from verified providers'}
          </p>

          {/* Stats Bar */}
          {!isLoading && (
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 sm:mt-8">
              {[
                { icon: Megaphone, label: isRTL ? 'إجمالي العروض' : 'Total', value: stats.total, color: 'text-gold' },
                { icon: Tag, label: isRTL ? 'عروض خاصة' : 'Offers', value: stats.offers, color: 'text-green-400' },
                { icon: Video, label: isRTL ? 'فيديو' : 'Videos', value: stats.videos, color: 'text-blue-400' },
                { icon: Eye, label: isRTL ? 'مشاهدة' : 'Views', value: stats.totalViews, color: 'text-purple-400' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface-nav-foreground/5 backdrop-blur-sm border border-surface-nav-foreground/10 rounded-xl px-3 sm:px-4 py-2">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="font-heading font-bold text-surface-nav-foreground text-sm sm:text-base" dir="ltr">{s.value.toLocaleString()}</span>
                  <span className="text-surface-nav-foreground/50 text-[10px] sm:text-xs">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-center">
            <TabsList className="bg-muted/50 dark:bg-muted/30 rounded-xl p-1 inline-flex">
              <TabsTrigger value="all" className="rounded-lg px-4 py-2 text-xs sm:text-sm gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                {isRTL ? 'الكل' : 'All'}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ms-1">{stats.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="offer" className="rounded-lg px-4 py-2 text-xs sm:text-sm gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <Tag className="w-3.5 h-3.5" />
                {isRTL ? 'عروض' : 'Offers'}
              </TabsTrigger>
              <TabsTrigger value="ad" className="rounded-lg px-4 py-2 text-xs sm:text-sm gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <Megaphone className="w-3.5 h-3.5" />
                {isRTL ? 'إعلانات' : 'Ads'}
              </TabsTrigger>
              <TabsTrigger value="video" className="rounded-lg px-4 py-2 text-xs sm:text-sm gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <Video className="w-3.5 h-3.5" />
                {isRTL ? 'فيديو' : 'Videos'}
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
                <p className="text-lg font-heading font-bold mb-1">{isRTL ? 'لا توجد عروض حالياً' : 'No promotions available'}</p>
                <p className="text-sm">{isRTL ? 'تابعنا لمعرفة أحدث العروض والإعلانات' : 'Stay tuned for the latest offers'}</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p: any, index: number) => {
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
                            <img src={p.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
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
                            <Badge className="bg-red-500 text-white text-xs shadow-lg">
                              -{p.discount_percentage}%
                            </Badge>
                          )}
                          {p.promotion_type !== 'offer' && (
                            <Badge className="bg-accent text-accent-foreground text-[10px] shadow-lg">
                              {p.promotion_type === 'video' ? (isRTL ? 'فيديو' : 'Video') : (isRTL ? 'إعلان' : 'Ad')}
                            </Badge>
                          )}
                          {isNewPromo && (
                            <Badge className="bg-green-500 text-white text-[10px] shadow-lg flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5" />
                              {isRTL ? 'جديد' : 'New'}
                            </Badge>
                          )}
                          {expiringSoon && (
                            <Badge className="bg-orange-500 text-white text-[10px] shadow-lg flex items-center gap-0.5 animate-pulse">
                              <Clock className="w-2.5 h-2.5" />
                              {isRTL ? 'ينتهي قريباً' : 'Ending soon'}
                            </Badge>
                          )}
                        </div>

                        {/* Views badge top-end */}
                        <div className="absolute top-3 end-3">
                          <Badge variant="secondary" className="bg-black/50 backdrop-blur-sm text-white text-[10px] flex items-center gap-1 border-0">
                            <Eye className="w-3 h-3" />
                            <span dir="ltr">{(p.views_count || 0).toLocaleString()}</span>
                          </Badge>
                        </div>

                        {/* Membership tier indicator */}
                        {biz?.membership_tier && biz.membership_tier !== 'free' && (
                          <div className="absolute bottom-3 end-3">
                            <Badge className={`text-[9px] border-0 shadow-lg ${
                              biz.membership_tier === 'enterprise' ? 'bg-purple-500/90 text-white' :
                              biz.membership_tier === 'premium' ? 'bg-gradient-gold text-secondary-foreground' :
                              'bg-blue-500/90 text-white'
                            }`}>
                              {biz.membership_tier === 'enterprise' ? (isRTL ? 'مؤسسي' : 'Enterprise') :
                               biz.membership_tier === 'premium' ? (isRTL ? 'مميز' : 'Premium') :
                               (isRTL ? 'أساسي' : 'Basic')}
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-4 sm:p-5 space-y-3">
                        {/* Provider info */}
                        {biz && (
                          <Link to={`/${biz.username}`} className="flex items-center gap-2.5 group/biz">
                            <div className="w-9 h-9 rounded-full bg-muted overflow-hidden ring-2 ring-transparent transition-all duration-300 group-hover/biz:ring-accent/30 shrink-0">
                              {biz.logo_url ? (
                                <img src={biz.logo_url} className="w-full h-full object-cover" alt="" />
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
                                <Star className="w-3 h-3 fill-accent text-accent" />
                                <span className="text-[11px] text-muted-foreground" dir="ltr">{Number(biz.rating_avg).toFixed(1)}</span>
                                {biz.is_verified && (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 ms-1">{isRTL ? 'موثق' : 'Verified'}</Badge>
                                )}
                              </div>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover/biz:text-accent transition-colors shrink-0" />
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
                            <span className="line-through text-muted-foreground text-xs" dir="ltr">
                              {Number(p.original_price).toLocaleString()}
                            </span>
                            <span className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400" dir="ltr">
                              {Number(p.offer_price).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{p.currency_code}</span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/30 transition-colors duration-300 group-hover:border-accent/20">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(p.start_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                            {p.end_date && (
                              <> → {new Date(p.end_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span dir="ltr">{(p.views_count || 0).toLocaleString()}</span>
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
