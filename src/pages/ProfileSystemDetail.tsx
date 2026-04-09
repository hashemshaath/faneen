import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Layers, ArrowLeft, ArrowRight, Thermometer, Volume2, Shield,
  Ruler, Eye, Star, Building2, FileText, Image, MessageSquare,
  CheckCircle2, Palette, Zap, Info,
} from 'lucide-react';

const recommendationLabels: Record<string, { ar: string; en: string; color: string }> = {
  premium: { ar: 'احترافي', en: 'Premium', color: 'bg-gold text-primary-foreground' },
  recommended: { ar: 'موصى به', en: 'Recommended', color: 'bg-green-100 text-green-700' },
  standard: { ar: 'قياسي', en: 'Standard', color: 'bg-muted text-muted-foreground' },
};

const RatingBar = ({ value, max = 10, label, icon: Icon }: { value: number; max?: number; label: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2 w-28 shrink-0">
      <Icon className="w-4 h-4 text-gold" />
      <span className="text-sm font-medium">{label}</span>
    </div>
    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-gold/70 to-gold rounded-full transition-all" style={{ width: `${(value / max) * 100}%` }} />
    </div>
    <span className="font-heading font-bold text-sm w-10 text-end">{value}/{max}</span>
  </div>
);

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'fill-gold text-gold' : 'text-muted-foreground/30'}`} />
    ))}
  </div>
);

const ProfileSystemDetail = () => {
  const { slug } = useParams();
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

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
      const { data } = await supabase
        .from('profile_specifications')
        .select('*')
        .eq('profile_id', profile!.id)
        .order('sort_order');
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['profile-images', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profile_images')
        .select('*')
        .eq('profile_id', profile!.id)
        .order('sort_order');
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['profile-suppliers', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profile_suppliers')
        .select('*, businesses(username, name_ar, name_en, logo_url, city_id, rating_avg)')
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
    const { error } = await supabase.from('profile_reviews').upsert({
      profile_id: profile!.id, user_id: user.id, rating: reviewRating, content: reviewText,
    }, { onConflict: 'profile_id,user_id' });
    if (error) { toast.error(error.message); return; }
    toast.success(isRTL ? 'تم إضافة تقييمك' : 'Review submitted');
    setReviewText('');
    refetchReviews();
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) return <div className="min-h-screen flex justify-center items-center"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>;

  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
      <Layers className="w-16 h-16 text-muted-foreground/30 mb-4" />
      <h1 className="font-heading font-bold text-xl mb-2">{isRTL ? 'القطاع غير موجود' : 'Profile not found'}</h1>
      <Link to="/profile-systems"><Button variant="outline">{isRTL ? 'العودة للقطاعات' : 'Back to Profiles'}</Button></Link>
    </div>
  );

  const name = language === 'ar' ? profile.name_ar : (profile.name_en || profile.name_ar);
  const desc = language === 'ar' ? (profile.description_ar || '') : (profile.description_en || profile.description_ar || '');
  const apps = language === 'ar' ? (profile.applications_ar || '') : (profile.applications_en || profile.applications_ar || '');
  const features = language === 'ar' ? (profile.features_ar || []) : (profile.features_en?.length ? profile.features_en : (profile.features_ar || []));
  const rec = recommendationLabels[profile.recommendation_level] || recommendationLabels.standard;
  const avgRating = reviews.length ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <div className="relative">
        {profile.cover_image_url ? (
          <div className="h-64 md:h-80">
            <img src={profile.cover_image_url} alt={name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-b from-primary/10 to-background" />
        )}
        <div className="absolute bottom-0 inset-x-0">
          <div className="container mx-auto px-4 max-w-5xl pb-6">
            <Link to="/profile-systems" className="inline-flex mb-3">
              <Button variant="ghost" size="sm" className="bg-background/50 backdrop-blur-sm"><BackIcon className="w-4 h-4 me-1" />{isRTL ? 'القطاعات' : 'Profiles'}</Button>
            </Link>
            <div className="flex items-start gap-4">
              {profile.logo_url && <img src={profile.logo_url} alt="" className="w-16 h-16 rounded-xl object-contain bg-background/80 p-2 border border-border/50 shrink-0" />}
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="font-heading font-bold text-2xl md:text-3xl">{name}</h1>
                  <Badge className={`text-xs ${rec.color}`}>{language === 'ar' ? rec.ar : rec.en}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <span>{profile.profile_type === 'custom' ? (isRTL ? 'تصميم خاص' : 'Custom') : (isRTL ? 'قطاع سوق' : 'Market')}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{profile.views_count}</span>
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-gold text-gold" />{avgRating} ({reviews.length})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-5xl py-6">
        <Tabs defaultValue="overview">
          <TabsList className="bg-muted/50 rounded-xl p-1 flex-wrap h-auto mb-6">
            <TabsTrigger value="overview" className="font-body rounded-lg px-4 py-2 gap-1.5 text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Info className="w-3.5 h-3.5" />{isRTL ? 'نظرة عامة' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="specs" className="font-body rounded-lg px-4 py-2 gap-1.5 text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <FileText className="w-3.5 h-3.5" />{isRTL ? 'المواصفات' : 'Specs'} ({specs.length})
            </TabsTrigger>
            <TabsTrigger value="gallery" className="font-body rounded-lg px-4 py-2 gap-1.5 text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Image className="w-3.5 h-3.5" />{isRTL ? 'الصور' : 'Gallery'} ({images.length})
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="font-body rounded-lg px-4 py-2 gap-1.5 text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <Building2 className="w-3.5 h-3.5" />{isRTL ? 'الموردين' : 'Suppliers'} ({suppliers.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="font-body rounded-lg px-4 py-2 gap-1.5 text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <MessageSquare className="w-3.5 h-3.5" />{isRTL ? 'الآراء' : 'Reviews'} ({reviews.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                {desc && (
                  <Card className="border-border/50">
                    <CardContent className="p-5">
                      <h3 className="font-heading font-bold mb-2">{isRTL ? 'الوصف' : 'Description'}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                    </CardContent>
                  </Card>
                )}
                {features.length > 0 && (
                  <Card className="border-border/50">
                    <CardContent className="p-5">
                      <h3 className="font-heading font-bold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-gold" />{isRTL ? 'المميزات' : 'Features'}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {features.map((f: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {apps && (
                  <Card className="border-border/50">
                    <CardContent className="p-5">
                      <h3 className="font-heading font-bold mb-2">{isRTL ? 'الاستخدامات' : 'Applications'}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{apps}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                {/* Ratings */}
                <Card className="border-border/50">
                  <CardContent className="p-5 space-y-3">
                    <h3 className="font-heading font-bold mb-1">{isRTL ? 'التقييم الفني' : 'Technical Rating'}</h3>
                    <RatingBar value={profile.thermal_insulation_rating || 0} label={isRTL ? 'عزل حراري' : 'Thermal'} icon={Thermometer} />
                    <RatingBar value={profile.sound_insulation_rating || 0} label={isRTL ? 'عزل صوتي' : 'Sound'} icon={Volume2} />
                    <RatingBar value={profile.strength_rating || 0} label={isRTL ? 'التحمل' : 'Strength'} icon={Shield} />
                  </CardContent>
                </Card>

                {/* Dimensions */}
                {(profile.max_height_mm || profile.max_width_mm) && (
                  <Card className="border-border/50">
                    <CardContent className="p-5 space-y-2">
                      <h3 className="font-heading font-bold flex items-center gap-2"><Ruler className="w-4 h-4 text-gold" />{isRTL ? 'الأبعاد القصوى' : 'Max Dimensions'}</h3>
                      {profile.max_height_mm && <p className="text-sm"><span className="text-muted-foreground">{isRTL ? 'أقصى ارتفاع:' : 'Max Height:'}</span> <strong>{profile.max_height_mm} mm</strong></p>}
                      {profile.max_width_mm && <p className="text-sm"><span className="text-muted-foreground">{isRTL ? 'أقصى عرض:' : 'Max Width:'}</span> <strong>{profile.max_width_mm} mm</strong></p>}
                    </CardContent>
                  </Card>
                )}

                {/* Colors */}
                {profile.available_colors?.length > 0 && (
                  <Card className="border-border/50">
                    <CardContent className="p-5">
                      <h3 className="font-heading font-bold flex items-center gap-2 mb-3"><Palette className="w-4 h-4 text-gold" />{isRTL ? 'الألوان المتاحة' : 'Available Colors'}</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.available_colors.map((c: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Specifications */}
          <TabsContent value="specs">
            {specs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><FileText className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{isRTL ? 'لا توجد مواصفات' : 'No specifications'}</p></div>
            ) : (
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead><tr className="border-b border-border/50 bg-muted/30">
                      <th className="p-3 text-start text-sm font-heading">{isRTL ? 'المواصفة' : 'Specification'}</th>
                      <th className="p-3 text-start text-sm font-heading">{isRTL ? 'القيمة' : 'Value'}</th>
                      <th className="p-3 text-start text-sm font-heading">{isRTL ? 'الوحدة' : 'Unit'}</th>
                    </tr></thead>
                    <tbody>
                      {specs.map((s: any) => (
                        <tr key={s.id} className="border-b border-border/30 last:border-0">
                          <td className="p-3 text-sm font-medium">{language === 'ar' ? s.spec_name_ar : (s.spec_name_en || s.spec_name_ar)}</td>
                          <td className="p-3 text-sm">{s.spec_value}</td>
                          <td className="p-3 text-sm text-muted-foreground">{s.spec_unit || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Gallery */}
          <TabsContent value="gallery">
            {images.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Image className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{isRTL ? 'لا توجد صور' : 'No images'}</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((img: any) => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden bg-muted aspect-square">
                    <img src={img.image_url} alt={img.caption_ar || ''} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <div>
                        <Badge variant="outline" className="text-[10px] text-white border-white/30 mb-1">{img.image_type}</Badge>
                        {img.caption_ar && <p className="text-white text-xs">{language === 'ar' ? img.caption_ar : (img.caption_en || img.caption_ar)}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Suppliers */}
          <TabsContent value="suppliers">
            {suppliers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{isRTL ? 'لا يوجد موردين حالياً' : 'No suppliers available'}</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suppliers.map((s: any) => (
                  <Link key={s.id} to={`/${s.businesses?.username}`}>
                    <Card className="border-border/50 hover:border-gold/30 transition-colors">
                      <CardContent className="p-4 flex items-center gap-4">
                        {s.businesses?.logo_url ? (
                          <img src={s.businesses.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center"><Building2 className="w-6 h-6 text-gold" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-bold">{language === 'ar' ? s.businesses?.name_ar : (s.businesses?.name_en || s.businesses?.name_ar)}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{s.businesses?.rating_avg}</span>
                            {s.price_range_from && <span>{Number(s.price_range_from).toLocaleString()} - {Number(s.price_range_to).toLocaleString()} {s.currency_code}</span>}
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-[10px]">{isRTL ? 'متوفر' : 'Available'}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews">
            <div className="space-y-4">
              {/* Add review */}
              <Card className="border-border/50 border-gold/20">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-heading font-bold">{isRTL ? 'أضف تقييمك' : 'Add Your Review'}</h4>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} onClick={() => setReviewRating(i + 1)}>
                        <Star className={`w-6 h-6 cursor-pointer ${i < reviewRating ? 'fill-gold text-gold' : 'text-muted-foreground/30'}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder={isRTL ? 'شاركنا رأيك عن هذا القطاع...' : 'Share your experience with this profile...'} rows={3} />
                  <Button onClick={submitReview} variant="hero" size="sm">{isRTL ? 'إرسال التقييم' : 'Submit Review'}</Button>
                </CardContent>
              </Card>

              {reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{isRTL ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</p></div>
              ) : (
                reviews.map((r: any) => (
                  <Card key={r.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-sm">
                          {(r.profiles as any)?.full_name?.charAt(0) || '؟'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{(r.profiles as any)?.full_name || (isRTL ? 'مستخدم' : 'User')}</p>
                          <div className="flex items-center gap-2">
                            <StarRating rating={r.rating} />
                            <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      {r.content && <p className="text-sm text-muted-foreground">{r.content}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfileSystemDetail;
