import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Layers, ArrowLeft, ArrowRight, Thermometer, Volume2, Shield,
  Ruler, Eye, Star, Building2, FileText, Image, MessageSquare,
  CheckCircle2, Palette, Zap, Info, Share2, Heart, Download,
  ChevronLeft, ChevronRight, X, Maximize2, Award, TrendingUp,
  BarChart3, Clock, MapPin, ExternalLink, Printer,
} from 'lucide-react';

// ─── Constants ───
const recommendationLabels: Record<string, { ar: string; en: string; color: string; icon: React.ElementType }> = {
  premium: { ar: 'احترافي', en: 'Premium', color: 'bg-gold text-primary-foreground', icon: Award },
  recommended: { ar: 'موصى به', en: 'Recommended', color: 'bg-green-500/10 text-green-600 dark:text-green-400', icon: TrendingUp },
  standard: { ar: 'قياسي', en: 'Standard', color: 'bg-muted text-muted-foreground', icon: BarChart3 },
};

// ─── Sub-components ───
const AnimatedRatingBar = ({ value, max = 10, label, icon: Icon }: { value: number; max?: number; label: string; icon: React.ElementType }) => {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setAnimated(true); obs.disconnect(); } }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const pct = (value / max) * 100;
  const getColor = () => {
    if (pct >= 80) return 'from-green-400 to-green-500';
    if (pct >= 60) return 'from-gold/70 to-gold';
    if (pct >= 40) return 'from-yellow-400 to-orange-400';
    return 'from-orange-400 to-red-400';
  };

  return (
    <div ref={ref} className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-gold" />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="font-heading font-bold text-lg">{value}<span className="text-xs text-muted-foreground">/{max}</span></span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColor()} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: animated ? `${pct}%` : '0%' }}
        />
      </div>
    </div>
  );
};

const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => {
  const s = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${s} ${i < rating ? 'fill-gold text-gold' : 'text-muted-foreground/20'}`} />
      ))}
    </div>
  );
};

const InteractiveStarInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          onMouseEnter={() => setHover(i + 1)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i + 1)}
          className="transition-transform hover:scale-125"
        >
          <Star className={`w-7 h-7 cursor-pointer transition-colors ${i < (hover || value) ? 'fill-gold text-gold' : 'text-muted-foreground/30 hover:text-gold/50'}`} />
        </button>
      ))}
    </div>
  );
};

// ─── Lightbox ───
const Lightbox = ({ images, index, onClose, onNav, isRTL, language }: any) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNav(1);
      if (e.key === 'ArrowLeft') onNav(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onNav]);

  const img = images[index];
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 end-4 text-white/70 hover:text-white z-50 p-2"><X className="w-6 h-6" /></button>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onNav(-1); }} className="absolute start-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 rounded-full p-2 backdrop-blur-sm"><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={(e) => { e.stopPropagation(); onNav(1); }} className="absolute end-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 rounded-full p-2 backdrop-blur-sm"><ChevronRight className="w-6 h-6" /></button>
        </>
      )}
      <div className="max-w-4xl max-h-[85vh] p-4" onClick={(e) => e.stopPropagation()}>
        <img src={img?.image_url} alt="" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
        {img?.caption_ar && <p className="text-white/80 text-center text-sm mt-3">{language === 'ar' ? img.caption_ar : (img.caption_en || img.caption_ar)}</p>}
        <p className="text-white/40 text-center text-xs mt-1">{index + 1} / {images.length}</p>
      </div>
    </div>
  );
};

// ─── Quick Stat Card ───
const QuickStat = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-gold/30 transition-colors">
    <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-gold" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading font-bold text-sm">{value}</p>
    </div>
  </div>
);

// ─── Main Component ───
const ProfileSystemDetail = () => {
  const { slug } = useParams();
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isFav, setIsFav] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // ─── Queries ───
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-system', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_systems')
        .select('*')
        .eq('slug', slug!)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: specs = [] } = useQuery({
    queryKey: ['profile-specs', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profile_specifications').select('*').eq('profile_id', profile!.id).order('sort_order');
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['profile-images', profile?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profile_images').select('*').eq('profile_id', profile!.id).order('sort_order');
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['profile-suppliers', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profile_suppliers')
        .select('*, businesses(username, name_ar, name_en, logo_url, city_id, rating_avg, rating_count)')
        .eq('profile_id', profile!.id)
        .eq('is_available', true);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ['profile-reviews', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profile_reviews')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .eq('profile_id', profile!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const submitReview = async () => {
    if (!user) { toast.error(isRTL ? 'سجل دخولك أولاً' : 'Login first'); return; }
    if (!reviewText.trim()) { toast.error(isRTL ? 'اكتب تقييمك أولاً' : 'Write your review first'); return; }
    const { error } = await supabase.from('profile_reviews').upsert({
      profile_id: profile!.id, user_id: user.id, rating: reviewRating, content: reviewText,
    }, { onConflict: 'profile_id,user_id' });
    if (error) { toast.error(error.message); return; }
    toast.success(isRTL ? 'تم إضافة تقييمك بنجاح ✨' : 'Review submitted ✨');
    setReviewText('');
    refetchReviews();
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: name, url: window.location.href });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // ─── Loading ───
  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
      <Footer />
    </div>
  );

  // ─── Not Found ───
  if (!profile) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[60vh]" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Layers className="w-10 h-10 text-muted-foreground/30" />
        </div>
        <h1 className="font-heading font-bold text-2xl mb-2">{isRTL ? 'القطاع غير موجود' : 'Profile not found'}</h1>
        <p className="text-muted-foreground mb-6">{isRTL ? 'تحقق من الرابط وحاول مرة أخرى' : 'Check the URL and try again'}</p>
        <Link to="/profile-systems"><Button variant="outline" className="gap-2"><BackIcon className="w-4 h-4" />{isRTL ? 'العودة للقطاعات' : 'Back to Profiles'}</Button></Link>
      </div>
      <Footer />
    </div>
  );

  const name = language === 'ar' ? profile.name_ar : (profile.name_en || profile.name_ar);
  const desc = language === 'ar' ? (profile.description_ar || '') : (profile.description_en || profile.description_ar || '');
  const apps = language === 'ar' ? (profile.applications_ar || '') : (profile.applications_en || profile.applications_ar || '');
  const features = language === 'ar' ? (profile.features_ar || []) : (profile.features_en?.length ? profile.features_en : (profile.features_ar || []));
  const rec = recommendationLabels[profile.recommendation_level] || recommendationLabels.standard;
  const RecIcon = rec.icon;
  const avgRating = reviews.length ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) : 0;
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter((r: any) => r.rating === star).length,
    pct: reviews.length ? (reviews.filter((r: any) => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar />

      {/* ═══ Hero Section ═══ */}
      <section className="relative overflow-hidden">
        {profile.cover_image_url ? (
          <div className="h-72 md:h-96 relative">
            <img src={profile.cover_image_url} alt={name} className="w-full h-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/30 to-transparent" />
          </div>
        ) : (
          <div className="h-56 md:h-72 bg-gradient-to-br from-primary/10 via-gold/5 to-background relative">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4a853\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          </div>
        )}

        {/* Hero Content */}
        <div className="absolute bottom-0 inset-x-0">
          <div className="container mx-auto px-4 max-w-6xl pb-8">
            <Link to="/profile-systems" className="inline-flex mb-4">
              <Button variant="ghost" size="sm" className="bg-background/60 backdrop-blur-md border border-border/30 hover:bg-background/80">
                <BackIcon className="w-4 h-4 me-1.5" />{isRTL ? 'جميع القطاعات' : 'All Profiles'}
              </Button>
            </Link>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex items-start gap-4">
                {profile.logo_url && (
                  <div className="w-20 h-20 rounded-2xl bg-background/90 backdrop-blur-sm p-2.5 border border-border/50 shadow-lg shrink-0">
                    <img src={profile.logo_url} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h1 className="font-heading font-black text-3xl md:text-4xl">{name}</h1>
                    <Badge className={`text-xs gap-1 ${rec.color}`}><RecIcon className="w-3 h-3" />{language === 'ar' ? rec.ar : rec.en}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {profile.profile_type === 'custom' ? (isRTL ? 'تصميم خاص' : 'Custom Design') : (isRTL ? 'قطاع سوق' : 'Market Profile')}
                    </Badge>
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{profile.views_count.toLocaleString()} {isRTL ? 'مشاهدة' : 'views'}</span>
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-gold text-gold" />{avgRating.toFixed(1)} ({reviews.length} {isRTL ? 'تقييم' : 'reviews'})</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setIsFav(!isFav)}>
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isRTL ? 'حفظ في المفضلة' : 'Save to favorites'}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-xl" onClick={handleShare}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isRTL ? 'مشاركة' : 'Share'}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-xl" onClick={() => window.print()}>
                        <Printer className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isRTL ? 'طباعة' : 'Print'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {suppliers.length > 0 && (
                  <Button variant="hero" className="rounded-xl gap-2" onClick={() => setActiveTab('suppliers')}>
                    <Building2 className="w-4 h-4" />{isRTL ? 'اطلب عرض سعر' : 'Request Quote'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Quick Stats Bar ═══ */}
      <section className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 max-w-6xl py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickStat icon={Thermometer} label={isRTL ? 'العزل الحراري' : 'Thermal'} value={`${profile.thermal_insulation_rating || 0}/10`} />
            <QuickStat icon={Volume2} label={isRTL ? 'العزل الصوتي' : 'Sound'} value={`${profile.sound_insulation_rating || 0}/10`} />
            <QuickStat icon={Shield} label={isRTL ? 'المتانة' : 'Strength'} value={`${profile.strength_rating || 0}/10`} />
            <QuickStat icon={Building2} label={isRTL ? 'الموردين' : 'Suppliers'} value={suppliers.length} />
          </div>
        </div>
      </section>

      {/* ═══ Main Content ═══ */}
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border/50 rounded-2xl p-1.5 flex-wrap h-auto mb-8 shadow-sm">
            {[
              { val: 'overview', icon: Info, ar: 'نظرة عامة', en: 'Overview' },
              { val: 'specs', icon: FileText, ar: 'المواصفات', en: 'Specs', count: specs.length },
              { val: 'gallery', icon: Image, ar: 'المعرض', en: 'Gallery', count: images.length },
              { val: 'suppliers', icon: Building2, ar: 'الموردين', en: 'Suppliers', count: suppliers.length },
              { val: 'reviews', icon: MessageSquare, ar: 'التقييمات', en: 'Reviews', count: reviews.length },
            ].map(tab => (
              <TabsTrigger key={tab.val} value={tab.val} className="font-body rounded-xl px-5 py-2.5 gap-2 text-sm data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm transition-all">
                <tab.icon className="w-4 h-4" />
                {isRTL ? tab.ar : tab.en}
                {tab.count !== undefined && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 min-w-5 justify-center">{tab.count}</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                {desc && (
                  <Card className="border-border/50 overflow-hidden">
                    <div className="h-1 bg-gradient-gold" />
                    <CardContent className="p-6">
                      <h3 className="font-heading font-bold text-lg mb-3 flex items-center gap-2">
                        <Info className="w-5 h-5 text-gold" />{isRTL ? 'عن هذا القطاع' : 'About This Profile'}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{desc}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Features */}
                {features.length > 0 && (
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-gold" />{isRTL ? 'المميزات الرئيسية' : 'Key Features'}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {features.map((f: string, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            </div>
                            <span className="text-sm">{f}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Applications */}
                {apps && (
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <h3 className="font-heading font-bold text-lg mb-3 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-gold" />{isRTL ? 'مجالات الاستخدام' : 'Applications'}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{apps}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Gallery Preview */}
                {images.length > 0 && (
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                          <Image className="w-5 h-5 text-gold" />{isRTL ? 'من المعرض' : 'Gallery Preview'}
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab('gallery')} className="text-gold hover:text-gold/80">
                          {isRTL ? 'عرض الكل' : 'View All'} →
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {images.slice(0, 3).map((img: any, i: number) => (
                          <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-[4/3] cursor-pointer" onClick={() => setLightboxIdx(i)}>
                            <img src={img.image_url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {/* Technical Rating */}
                <Card className="border-border/50 overflow-hidden">
                  <div className="h-1 bg-gradient-gold" />
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-heading font-bold text-lg">{isRTL ? 'التقييم الفني' : 'Technical Rating'}</h3>
                    <AnimatedRatingBar value={profile.thermal_insulation_rating || 0} label={isRTL ? 'عزل حراري' : 'Thermal'} icon={Thermometer} />
                    <AnimatedRatingBar value={profile.sound_insulation_rating || 0} label={isRTL ? 'عزل صوتي' : 'Sound'} icon={Volume2} />
                    <AnimatedRatingBar value={profile.strength_rating || 0} label={isRTL ? 'المتانة' : 'Strength'} icon={Shield} />

                    {/* Overall score */}
                    <div className="pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{isRTL ? 'التقييم الإجمالي' : 'Overall Score'}</span>
                        <span className="font-heading font-black text-2xl text-gold">
                          {(((profile.thermal_insulation_rating || 0) + (profile.sound_insulation_rating || 0) + (profile.strength_rating || 0)) / 3).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dimensions */}
                {(profile.max_height_mm || profile.max_width_mm) && (
                  <Card className="border-border/50">
                    <CardContent className="p-6 space-y-3">
                      <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                        <Ruler className="w-5 h-5 text-gold" />{isRTL ? 'الأبعاد القصوى' : 'Max Dimensions'}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {profile.max_height_mm && (
                          <div className="p-3 rounded-xl bg-muted/30 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{isRTL ? 'الارتفاع' : 'Height'}</p>
                            <p className="font-heading font-bold text-lg">{profile.max_height_mm}<span className="text-xs text-muted-foreground ms-1">mm</span></p>
                          </div>
                        )}
                        {profile.max_width_mm && (
                          <div className="p-3 rounded-xl bg-muted/30 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{isRTL ? 'العرض' : 'Width'}</p>
                            <p className="font-heading font-bold text-lg">{profile.max_width_mm}<span className="text-xs text-muted-foreground ms-1">mm</span></p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Colors */}
                {profile.available_colors?.length > 0 && (
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <h3 className="font-heading font-bold text-lg flex items-center gap-2 mb-3">
                        <Palette className="w-5 h-5 text-gold" />{isRTL ? 'الألوان المتاحة' : 'Available Colors'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.available_colors.map((c: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs rounded-lg px-3 py-1">{c}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* User Reviews Summary */}
                {reviews.length > 0 && (
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <h3 className="font-heading font-bold text-lg mb-3">{isRTL ? 'تقييم المستخدمين' : 'User Rating'}</h3>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-center">
                          <p className="font-heading font-black text-4xl text-gold">{avgRating.toFixed(1)}</p>
                          <StarRating rating={Math.round(avgRating)} size="lg" />
                          <p className="text-xs text-muted-foreground mt-1">{reviews.length} {isRTL ? 'تقييم' : 'reviews'}</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {ratingDistribution.map(d => (
                            <div key={d.star} className="flex items-center gap-2 text-xs">
                              <span className="w-3">{d.star}</span>
                              <Star className="w-3 h-3 fill-gold text-gold" />
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                              </div>
                              <span className="text-muted-foreground w-6 text-end">{d.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setActiveTab('reviews')}>
                        {isRTL ? 'عرض جميع التقييمات' : 'View All Reviews'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Specifications ── */}
          <TabsContent value="specs" className="animate-fade-in">
            {specs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 opacity-30" />
                </div>
                <p className="font-heading font-bold mb-1">{isRTL ? 'لا توجد مواصفات' : 'No specifications'}</p>
                <p className="text-sm">{isRTL ? 'لم تُضف مواصفات لهذا القطاع بعد' : 'No specifications added yet'}</p>
              </div>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <div className="h-1 bg-gradient-gold" />
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="p-4 text-start text-sm font-heading font-bold">{isRTL ? 'المواصفة' : 'Specification'}</th>
                          <th className="p-4 text-start text-sm font-heading font-bold">{isRTL ? 'القيمة' : 'Value'}</th>
                          <th className="p-4 text-start text-sm font-heading font-bold">{isRTL ? 'الوحدة' : 'Unit'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {specs.map((s: any, i: number) => (
                          <tr key={s.id} className={`border-b border-border/30 last:border-0 transition-colors hover:bg-muted/20 ${i % 2 === 0 ? 'bg-muted/5' : ''}`}>
                            <td className="p-4 text-sm font-medium">{language === 'ar' ? s.spec_name_ar : (s.spec_name_en || s.spec_name_ar)}</td>
                            <td className="p-4 text-sm font-heading font-bold">{s.spec_value}</td>
                            <td className="p-4 text-sm text-muted-foreground">{s.spec_unit || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Gallery ── */}
          <TabsContent value="gallery" className="animate-fade-in">
            {images.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Image className="w-8 h-8 opacity-30" />
                </div>
                <p className="font-heading font-bold mb-1">{isRTL ? 'لا توجد صور' : 'No images'}</p>
                <p className="text-sm">{isRTL ? 'لم تُضف صور لهذا القطاع بعد' : 'No images added yet'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {images.map((img: any, i: number) => (
                  <div
                    key={img.id}
                    className="relative group rounded-2xl overflow-hidden bg-muted aspect-square cursor-pointer ring-1 ring-border/50 hover:ring-gold/30 transition-all"
                    onClick={() => setLightboxIdx(i)}
                  >
                    <img src={img.image_url} alt={img.caption_ar || ''} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                      <div>
                        <Badge variant="outline" className="text-[10px] text-white border-white/30 mb-1 backdrop-blur-sm">{img.image_type}</Badge>
                        {img.caption_ar && <p className="text-white text-xs">{language === 'ar' ? img.caption_ar : (img.caption_en || img.caption_ar)}</p>}
                      </div>
                    </div>
                    <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Suppliers ── */}
          <TabsContent value="suppliers" className="animate-fade-in">
            {suppliers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 opacity-30" />
                </div>
                <p className="font-heading font-bold mb-1">{isRTL ? 'لا يوجد موردين حالياً' : 'No suppliers available'}</p>
                <p className="text-sm">{isRTL ? 'لم يُسجل أي مورد لهذا القطاع بعد' : 'No suppliers registered yet'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suppliers.map((s: any) => (
                  <Link key={s.id} to={`/${s.businesses?.username}`}>
                    <Card className="border-border/50 hover:border-gold/30 hover:shadow-lg transition-all group overflow-hidden">
                      <CardContent className="p-5 flex items-center gap-4">
                        {s.businesses?.logo_url ? (
                          <img src={s.businesses.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover ring-1 ring-border/50" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center"><Building2 className="w-7 h-7 text-gold" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-bold group-hover:text-gold transition-colors">
                            {language === 'ar' ? s.businesses?.name_ar : (s.businesses?.name_en || s.businesses?.name_ar)}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{s.businesses?.rating_avg} ({s.businesses?.rating_count || 0})</span>
                            {s.price_range_from && <span className="font-heading">{Number(s.price_range_from).toLocaleString()} - {Number(s.price_range_to).toLocaleString()} {s.currency_code}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 text-[10px]">{isRTL ? 'متوفر' : 'Available'}</Badge>
                          <ExternalLink className="w-4 h-4 text-muted-foreground/30 group-hover:text-gold transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Reviews ── */}
          <TabsContent value="reviews" className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Review Form + List */}
              <div className="lg:col-span-2 space-y-4">
                {/* Add review */}
                <Card className="border-gold/20 overflow-hidden">
                  <div className="h-1 bg-gradient-gold" />
                  <CardContent className="p-6 space-y-4">
                    <h4 className="font-heading font-bold text-lg">{isRTL ? 'شاركنا تجربتك' : 'Share Your Experience'}</h4>
                    <InteractiveStarInput value={reviewRating} onChange={setReviewRating} />
                    <Textarea
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      placeholder={isRTL ? 'أخبرنا عن تجربتك مع هذا القطاع... ما هي مميزاته وعيوبه؟' : 'Tell us about your experience...'}
                      rows={4}
                      className="rounded-xl resize-none"
                    />
                    <Button onClick={submitReview} variant="hero" className="rounded-xl gap-2">
                      <MessageSquare className="w-4 h-4" />{isRTL ? 'إرسال التقييم' : 'Submit Review'}
                    </Button>
                  </CardContent>
                </Card>

                {reviews.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-heading font-bold">{isRTL ? 'كن أول من يقيّم!' : 'Be the first to review!'}</p>
                  </div>
                ) : (
                  reviews.map((r: any) => (
                    <Card key={r.id} className="border-border/50 hover:border-border transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold shrink-0">
                            {(r.profiles as any)?.avatar_url ? (
                              <img src={(r.profiles as any).avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              (r.profiles as any)?.full_name?.charAt(0) || '؟'
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-heading font-bold text-sm">{(r.profiles as any)?.full_name || (isRTL ? 'مستخدم' : 'User')}</p>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />{new Date(r.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                              </span>
                            </div>
                            <StarRating rating={r.rating} />
                            {r.content && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.content}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Rating Summary Sidebar */}
              <div>
                <Card className="border-border/50 sticky top-24">
                  <CardContent className="p-6">
                    <h3 className="font-heading font-bold text-lg mb-4 text-center">{isRTL ? 'ملخص التقييمات' : 'Rating Summary'}</h3>
                    <div className="text-center mb-4">
                      <p className="font-heading font-black text-5xl text-gold">{avgRating.toFixed(1)}</p>
                      <StarRating rating={Math.round(avgRating)} size="lg" />
                      <p className="text-sm text-muted-foreground mt-2">{isRTL ? `من ${reviews.length} تقييم` : `from ${reviews.length} reviews`}</p>
                    </div>
                    <div className="space-y-2">
                      {ratingDistribution.map(d => (
                        <div key={d.star} className="flex items-center gap-2 text-sm">
                          <span className="w-4 font-heading font-bold">{d.star}</span>
                          <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${d.pct}%` }} />
                          </div>
                          <span className="text-muted-foreground w-8 text-end text-xs">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══ Lightbox ═══ */}
      {lightboxIdx !== null && (
        <Lightbox
          images={images}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNav={(dir: number) => setLightboxIdx((prev: number) => (prev! + dir + images.length) % images.length)}
          isRTL={isRTL}
          language={language}
        />
      )}

      <Footer />
    </div>
  );
};

export default ProfileSystemDetail;
