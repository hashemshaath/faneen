import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Star, MapPin, Phone, Mail, Globe, Shield, ArrowRight, ArrowLeft,
  Share2, Image, Video, ChevronLeft, ChevronRight, BadgeCheck, Clock,
  MessageSquare, ExternalLink, Loader2,
} from 'lucide-react';

// ---------- Data hooks ----------

const useBusinessByUsername = (username: string) =>
  useQuery({
    queryKey: ['business', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*, categories(*), cities(*), countries(*)')
        .eq('username', username)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });

const usePortfolio = (businessId: string | undefined) =>
  useQuery({
    queryKey: ['portfolio', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('business_id', businessId!)
        .order('is_featured', { ascending: false })
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!businessId,
  });

const useServices = (businessId: string | undefined) =>
  useQuery({
    queryKey: ['services', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_services')
        .select('*')
        .eq('business_id', businessId!)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!businessId,
  });

const useReviews = (businessId: string | undefined) =>
  useQuery({
    queryKey: ['reviews', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles(full_name, avatar_url)')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!businessId,
  });

// ---------- Sub-components ----------

const Stars: React.FC<{ rating: number; size?: string }> = ({ rating, size = 'w-4 h-4' }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        className={`${size} ${i <= rating ? 'text-gold fill-gold' : 'text-muted-foreground/30'}`}
      />
    ))}
  </div>
);

const ProfileHeader: React.FC<{ business: any; onContact: () => void; isContacting: boolean }> = ({ business, onContact, isContacting }) => {
  const { t, language, isRTL } = useLanguage();
  const name = language === 'ar' ? business.name_ar : (business.name_en || business.name_ar);
  const desc = language === 'ar' ? business.description_ar : (business.description_en || business.description_ar);
  const cityName = business.cities ? (language === 'ar' ? business.cities.name_ar : business.cities.name_en) : '';
  const categoryName = business.categories ? (language === 'ar' ? business.categories.name_ar : business.categories.name_en) : '';
  const memberDate = new Date(business.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long' });

  return (
    <div className="relative">
      {/* Cover */}
      <div className="h-48 md:h-64 bg-gradient-navy relative overflow-hidden">
        {business.cover_url ? (
          <img src={business.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(42 85% 55% / 0.4) 0%, transparent 60%)" }} />
        )}
      </div>

      {/* Info */}
      <div className="container relative -mt-16 z-10">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Logo */}
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl border-4 border-background bg-card shadow-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {business.logo_url ? (
              <img src={business.logo_url} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-heading font-black text-4xl text-gold">{name.charAt(0)}</span>
            )}
          </div>

          <div className="flex-1 pt-2 md:pt-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground">{name}</h1>
                  {business.is_verified && (
                    <Badge className="bg-gold/10 text-gold border-gold/30 gap-1">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      {t('profile.verified')}
                    </Badge>
                  )}
                </div>

                {categoryName && (
                  <span className="text-sm text-gold font-body font-medium">{categoryName}</span>
                )}

                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground font-body">
                  {cityName && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gold" />
                      <span>{cityName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-gold fill-gold" />
                    <span className="font-semibold text-foreground">{Number(business.rating_avg).toFixed(1)}</span>
                    <span>({business.rating_count} {t('profile.reviews_count')})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{t('profile.member_since')} {memberDate}</span>
                  </div>
                </div>

                {desc && (
                  <p className="mt-4 text-muted-foreground font-body leading-relaxed max-w-2xl">{desc}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="hero" className="gap-2" onClick={onContact} disabled={isContacting}>
                  {isContacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  {language === 'ar' ? 'تواصل مع المزود' : 'Contact Provider'}
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ServicesTab: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { t, language } = useLanguage();
  const { data: services, isLoading } = useServices(businessId);

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  if (!services?.length) return <p className="text-muted-foreground font-body text-center py-12">{t('common.no_results')}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map(service => {
        const name = language === 'ar' ? service.name_ar : (service.name_en || service.name_ar);
        const desc = language === 'ar' ? service.description_ar : (service.description_en || service.description_ar);
        return (
          <div key={service.id} className="p-6 rounded-xl bg-card border border-border hover:border-gold/30 transition-colors">
            <h3 className="font-heading font-bold text-foreground mb-2">{name}</h3>
            {desc && <p className="text-sm text-muted-foreground font-body mb-3">{desc}</p>}
            {(service.price_from || service.price_to) && (
              <div className="flex items-center gap-2 text-sm font-body">
                {service.price_from && (
                  <span className="text-gold font-semibold">{t('profile.price_from')} {service.price_from} {t('profile.sar')}</span>
                )}
                {service.price_to && (
                  <span className="text-gold font-semibold">{t('profile.price_to')} {service.price_to} {t('profile.sar')}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const PortfolioTab: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { t, language } = useLanguage();
  const { data: items, isLoading } = usePortfolio(businessId);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div>;
  if (!items?.length) return <p className="text-muted-foreground font-body text-center py-12">{t('common.no_results')}</p>;

  const filtered = filter === 'all' ? items : items.filter(i => i.media_type === filter);

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'image', 'video'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-body transition-colors ${
              filter === f ? 'bg-gold text-secondary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f === 'all' ? t('profile.all') : f === 'image' ? t('profile.images') : t('profile.videos')}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((item, idx) => {
          const title = language === 'ar' ? item.title_ar : (item.title_en || item.title_ar);
          return (
            <div
              key={item.id}
              className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-border hover:border-gold/40 transition-all"
              onClick={() => setSelectedIndex(idx)}
            >
              {item.media_type === 'image' ? (
                <img src={item.media_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Video className="w-10 h-10 text-gold" />
                </div>
              )}
              {item.is_featured && (
                <div className="absolute top-2 start-2 px-2 py-0.5 rounded-full bg-gold text-xs font-body text-secondary-foreground">
                  {t('profile.featured')}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white font-body truncate">{title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedIndex(null)}>
          <button className="absolute top-4 end-4 text-white/70 hover:text-white text-2xl font-bold">✕</button>
          <button className="absolute start-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setSelectedIndex(Math.max(0, selectedIndex - 1)); }}>
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button className="absolute end-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setSelectedIndex(Math.min(filtered.length - 1, selectedIndex + 1)); }}>
            <ChevronRight className="w-8 h-8" />
          </button>
          <img src={filtered[selectedIndex]?.media_url} alt="" className="max-w-full max-h-[85vh] rounded-lg object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

const ReviewsTab: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { t, language } = useLanguage();
  const { data: reviews, isLoading } = useReviews(businessId);

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (!reviews?.length) return (
    <div className="text-center py-12">
      <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground font-body">{t('common.no_results')}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {reviews.map(review => {
        const profile = review.profiles as any;
        const date = new Date(review.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        return (
          <div key={review.id} className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-gold">{(profile?.full_name || '?').charAt(0)}</span>
                  )}
                </div>
                <div>
                  <p className="font-heading font-semibold text-sm text-foreground">{profile?.full_name || (language === 'ar' ? 'مستخدم' : 'User')}</p>
                  <p className="text-xs text-muted-foreground">{date}</p>
                </div>
              </div>
              <Stars rating={review.rating} />
            </div>
            {review.title && <h4 className="font-heading font-semibold text-foreground mb-1">{review.title}</h4>}
            {review.content && <p className="text-sm text-muted-foreground font-body leading-relaxed">{review.content}</p>}
          </div>
        );
      })}
    </div>
  );
};

const ContactTab: React.FC<{ business: any }> = ({ business }) => {
  const { t, language } = useLanguage();
  const cityName = business.cities ? (language === 'ar' ? business.cities.name_ar : business.cities.name_en) : '';
  const countryName = business.countries ? (language === 'ar' ? business.countries.name_ar : business.countries.name_en) : '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Contact info */}
      <div className="space-y-4">
        {business.phone && (
          <a href={`tel:${business.phone}`} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-gold/30 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gradient-gold transition-all">
              <Phone className="w-5 h-5 text-gold group-hover:text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body">{t('common.call')}</p>
              <p className="font-body text-foreground font-medium" dir="ltr">{business.phone}</p>
            </div>
          </a>
        )}

        {business.email && (
          <a href={`mailto:${business.email}`} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-gold/30 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gradient-gold transition-all">
              <Mail className="w-5 h-5 text-gold group-hover:text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body">{t('profile.send_email')}</p>
              <p className="font-body text-foreground font-medium" dir="ltr">{business.email}</p>
            </div>
          </a>
        )}

        {business.website && (
          <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-gold/30 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gradient-gold transition-all">
              <Globe className="w-5 h-5 text-gold group-hover:text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body">{t('profile.visit_website')}</p>
              <p className="font-body text-foreground font-medium" dir="ltr">{business.website}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground ms-auto" />
          </a>
        )}
      </div>

      {/* Location */}
      <div className="p-6 rounded-xl bg-card border border-border">
        <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gold" />
          {t('profile.location')}
        </h3>
        <div className="space-y-2 font-body text-sm text-muted-foreground">
          {business.address && <p>{business.address}</p>}
          {(cityName || countryName) && <p>{[cityName, countryName].filter(Boolean).join('، ')}</p>}
        </div>
        {business.latitude && business.longitude && (
          <a
            href={`https://www.google.com/maps?q=${business.latitude},${business.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-gold hover:underline font-body"
          >
            <MapPin className="w-4 h-4" />
            {language === 'ar' ? 'عرض على الخريطة' : 'View on Map'}
          </a>
        )}
      </div>
    </div>
  );
};

// ---------- Main page ----------

const BusinessProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { t, isRTL } = useLanguage();
  const { data: business, isLoading, error } = useBusinessByUsername(username || '');
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-64 w-full" />
        <div className="container mt-8 space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!business || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gold/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-gold" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-foreground">{t('profile.not_found')}</h2>
          <p className="text-muted-foreground font-body">{t('profile.not_found_desc')}</p>
          <Link to="/">
            <Button variant="hero" className="gap-2">
              <BackArrow className="w-4 h-4" />
              {t('profile.back_home')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-gold/20">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 text-primary-foreground/80 hover:text-gold transition-colors font-body text-sm">
            <BackArrow className="w-4 h-4" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-gradient-gold flex items-center justify-center">
                <span className="font-heading font-black text-xs text-secondary-foreground">ف</span>
              </div>
              <span className="font-heading font-bold text-primary-foreground">فنيين</span>
            </div>
          </Link>
          <Button variant="hero" size="sm" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {t('profile.request_quote')}
          </Button>
        </div>
      </nav>

      <div className="pt-14">
        <ProfileHeader business={business} />

        {/* Tabs */}
        <div className="container mt-8 pb-16">
          <Tabs defaultValue="services" className="w-full">
            <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap">
              <TabsTrigger value="services" className="font-body rounded-lg data-[state=active]:bg-gold data-[state=active]:text-secondary-foreground px-6 py-2.5">
                {t('profile.services')}
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="font-body rounded-lg data-[state=active]:bg-gold data-[state=active]:text-secondary-foreground px-6 py-2.5">
                {t('profile.portfolio')}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="font-body rounded-lg data-[state=active]:bg-gold data-[state=active]:text-secondary-foreground px-6 py-2.5">
                {t('profile.reviews')} ({business.rating_count})
              </TabsTrigger>
              <TabsTrigger value="contact" className="font-body rounded-lg data-[state=active]:bg-gold data-[state=active]:text-secondary-foreground px-6 py-2.5">
                {t('profile.contact')}
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="services">
                <ServicesTab businessId={business.id} />
              </TabsContent>
              <TabsContent value="portfolio">
                <PortfolioTab businessId={business.id} />
              </TabsContent>
              <TabsContent value="reviews">
                <ReviewsTab businessId={business.id} />
              </TabsContent>
              <TabsContent value="contact">
                <ContactTab business={business} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfile;
