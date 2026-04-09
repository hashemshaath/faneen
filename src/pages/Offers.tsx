import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Megaphone, Tag, Video, Star, Play, Calendar } from 'lucide-react';

const Offers = () => {
  const { isRTL, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('all');

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['public-promotions'],
    queryFn: async () => {
      const { data } = await supabase.from('promotions').select('*, businesses(id, name_ar, name_en, username, logo_url, rating_avg)').eq('is_active', true).order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (activeTab === 'all') return promotions;
    return promotions.filter((p: any) => p.promotion_type === activeTab);
  }, [promotions, activeTab]);

  const getVideoEmbed = (url: string) => {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vim = url.match(/vimeo\.com\/(\d+)/);
    if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
    return null;
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* Cover */}
      <div className="bg-primary pt-24 pb-10">
        <div className="container text-center">
          <Megaphone className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="font-heading font-bold text-3xl text-primary-foreground mb-2">
            {isRTL ? 'العروض والإعلانات' : 'Offers & Promotions'}
          </h1>
          <p className="text-primary-foreground/60 font-body">
            {isRTL ? 'أحدث العروض والفيديوهات من مزودي الخدمة' : 'Latest offers and videos from providers'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-4">
            <TabsTrigger value="all">{isRTL ? 'الكل' : 'All'}</TabsTrigger>
            <TabsTrigger value="offer" className="flex items-center gap-1"><Tag className="w-3 h-3" />{isRTL ? 'عروض' : 'Offers'}</TabsTrigger>
            <TabsTrigger value="ad" className="flex items-center gap-1"><Megaphone className="w-3 h-3" />{isRTL ? 'إعلانات' : 'Ads'}</TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-1"><Video className="w-3 h-3" />{isRTL ? 'فيديو' : 'Videos'}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1,2,3].map(i => <Card key={i}><CardContent className="p-0"><div className="h-52 bg-muted animate-pulse rounded-t-lg" /><div className="p-4 h-20 bg-muted/50" /></CardContent></Card>)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">{isRTL ? 'لا توجد عروض حالياً' : 'No promotions available'}</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p: any, index: number) => {
                  const biz = p.businesses;
                  const embed = p.video_url ? getVideoEmbed(p.video_url) : null;
                  return (
                    <Card
                      key={p.id}
                      className="overflow-hidden group hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-2 hover:border-accent/40 transition-all duration-500 border-border/50 animate-card-slide-up"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      {/* Media */}
                      <div className="relative overflow-hidden">
                        {p.promotion_type === 'video' && embed ? (
                          <div className="aspect-video"><iframe src={embed} className="w-full h-full" allowFullScreen frameBorder="0" /></div>
                        ) : p.image_url ? (
                          <div className="h-52 overflow-hidden">
                            <img src={p.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          </div>
                        ) : (
                          <div className="h-52 bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                            {p.promotion_type === 'video' ? <Play className="w-12 h-12 text-accent/40 transition-transform duration-500 group-hover:scale-125" /> : <Tag className="w-12 h-12 text-accent/40 transition-transform duration-500 group-hover:scale-125" />}
                          </div>
                        )}
                        {/* Hover gradient overlay (skip for video embeds) */}
                        {!(p.promotion_type === 'video' && embed) && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        )}
                        {/* Discount badge */}
                        {p.promotion_type === 'offer' && p.discount_percentage && (
                          <Badge className="absolute top-3 start-3 bg-red-500 text-white text-xs shadow-lg animate-pulse">
                            -{p.discount_percentage}%
                          </Badge>
                        )}
                        {/* Type badge */}
                        {p.promotion_type !== 'offer' && (
                          <Badge className="absolute top-3 start-3 bg-accent text-accent-foreground text-[10px] shadow-lg">
                            {p.promotion_type === 'video' ? (isRTL ? 'فيديو' : 'Video') : (isRTL ? 'إعلان' : 'Ad')}
                          </Badge>
                        )}
                      </div>

                      <CardContent className="p-5 space-y-3">
                        {biz && (
                          <Link to={`/${biz.username}`} className="flex items-center gap-2 group/biz">
                            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden ring-2 ring-transparent transition-all duration-300 group-hover/biz:ring-accent/30">
                              {biz.logo_url ? <img src={biz.logo_url} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-[10px] font-bold bg-accent/10 text-accent">{biz.name_ar[0]}</span>}
                            </div>
                            <span className="text-sm font-medium transition-colors duration-300 group-hover/biz:text-accent">{isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}</span>
                            <Star className="w-3.5 h-3.5 fill-accent text-accent ms-auto" />
                            <span className="text-xs font-medium">{Number(biz.rating_avg).toFixed(1)}</span>
                          </Link>
                        )}
                        <h3 className="font-heading font-bold transition-colors duration-300 group-hover:text-accent">
                          {isRTL ? p.title_ar : (p.title_en || p.title_ar)}
                        </h3>
                        {p.description_ar && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {isRTL ? p.description_ar : (p.description_en || p.description_ar)}
                          </p>
                        )}
                        {p.promotion_type === 'offer' && p.original_price && (
                          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 transition-colors duration-300 group-hover:bg-accent/10">
                            <span className="line-through text-muted-foreground text-sm">{Number(p.original_price).toLocaleString()}</span>
                            <span className="text-lg font-bold text-green-600">{Number(p.offer_price).toLocaleString()} {p.currency_code}</span>
                          </div>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground pt-2 border-t border-border/30 transition-colors duration-300 group-hover:border-accent/20">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(p.start_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
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
