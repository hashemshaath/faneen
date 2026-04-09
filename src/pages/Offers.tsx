import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Megaphone, Tag, Video, Star, ArrowRight, ArrowLeft, Play, Calendar, Eye } from 'lucide-react';

const Offers = () => {
  const { isRTL } = useLanguage();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;
  const [activeTab, setActiveTab] = useState<string>('all');

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['public-promotions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('promotions')
        .select('*, businesses(id, name_ar, name_en, username, logo_url, rating_avg)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
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
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-9 h-9 rounded-xl bg-gold flex items-center justify-center text-primary-foreground font-bold text-lg">ف</Link>
            <div>
              <h1 className="font-heading font-bold text-lg">{isRTL ? 'العروض والإعلانات' : 'Offers & Promotions'}</h1>
              <p className="text-xs text-muted-foreground">{isRTL ? 'أحدث العروض والفيديوهات من مزودي الخدمة' : 'Latest offers and videos from providers'}</p>
            </div>
          </div>
          <Link to="/search"><Button variant="outline" size="sm">{isRTL ? 'البحث' : 'Search'}</Button></Link>
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
                {filtered.map((p: any) => {
                  const biz = p.businesses;
                  const embed = p.video_url ? getVideoEmbed(p.video_url) : null;
                  return (
                    <Card key={p.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                      {/* Media */}
                      {p.promotion_type === 'video' && embed ? (
                        <div className="aspect-video">
                          <iframe src={embed} className="w-full h-full" allowFullScreen frameBorder="0" />
                        </div>
                      ) : p.image_url ? (
                        <div className="h-48 overflow-hidden">
                          <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                          {p.promotion_type === 'video' ? <Play className="w-12 h-12 text-gold/50" /> : <Tag className="w-12 h-12 text-gold/50" />}
                        </div>
                      )}

                      <CardContent className="p-4 space-y-3">
                        {/* Provider */}
                        {biz && (
                          <Link to={`/${biz.username}`} className="flex items-center gap-2 hover:text-gold transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-muted overflow-hidden">
                              {biz.logo_url ? <img src={biz.logo_url} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-[10px] font-bold">{biz.name_ar[0]}</span>}
                            </div>
                            <span className="text-sm font-medium">{isRTL ? biz.name_ar : (biz.name_en || biz.name_ar)}</span>
                            <Star className="w-3 h-3 fill-gold text-gold ms-auto" />
                            <span className="text-xs">{Number(biz.rating_avg).toFixed(1)}</span>
                          </Link>
                        )}

                        <h3 className="font-medium">{isRTL ? p.title_ar : (p.title_en || p.title_ar)}</h3>
                        {p.description_ar && <p className="text-sm text-muted-foreground line-clamp-2">{isRTL ? p.description_ar : (p.description_en || p.description_ar)}</p>}

                        {/* Pricing */}
                        {p.promotion_type === 'offer' && p.original_price && (
                          <div className="flex items-center gap-2">
                            <span className="line-through text-muted-foreground text-sm">{Number(p.original_price).toLocaleString()}</span>
                            <span className="text-lg font-bold text-green-600">{Number(p.offer_price).toLocaleString()} {p.currency_code}</span>
                            {p.discount_percentage && <Badge className="bg-red-500 text-white text-xs">-{p.discount_percentage}%</Badge>}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.start_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
                          {biz && (
                            <Link to={`/${biz.username}`}>
                              <Button size="sm" variant="ghost" className="text-xs h-7"><ArrowIcon className="w-3 h-3" /></Button>
                            </Link>
                          )}
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
    </div>
  );
};

export default Offers;
