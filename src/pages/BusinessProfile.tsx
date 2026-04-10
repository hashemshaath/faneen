import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Star, MapPin, Phone, Mail, Globe, Shield, ArrowRight, ArrowLeft,
  Share2, Video, ChevronLeft, ChevronRight, BadgeCheck, Clock,
  MessageSquare, ExternalLink, Loader2, Briefcase, Image as ImageIcon,
  Building2, Calendar, DollarSign, Award, Users, Bookmark, Eye,
  Wrench, FolderOpen, CheckCircle2,
} from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

// ══════════ Data hooks ══════════

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
      const { data } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('business_id', businessId!)
        .order('is_featured', { ascending: false })
        .order('sort_order');
      return data ?? [];
    },
    enabled: !!businessId,
  });

const useServices = (businessId: string | undefined) =>
  useQuery({
    queryKey: ['services', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_services')
        .select('*')
        .eq('business_id', businessId!)
        .eq('is_active', true)
        .order('sort_order');
      return data ?? [];
    },
    enabled: !!businessId,
  });

const useProjects = (businessId: string | undefined) =>
  useQuery({
    queryKey: ['business-projects', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*, categories(name_ar, name_en), cities(name_ar, name_en)')
        .eq('business_id', businessId!)
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!businessId,
  });

const useReviews = (businessId: string | undefined) =>
  useQuery({
    queryKey: ['reviews', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*, profiles(full_name, avatar_url)')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!businessId,
  });

// ══════════ Sub-components ══════════

const Stars: React.FC<{ rating: number; size?: string }> = ({ rating, size = 'w-4 h-4' }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} className={`${size} ${i <= rating ? 'text-accent fill-accent' : 'text-muted-foreground/30'}`} />
    ))}
  </div>
);

// ── Profile Header ──
const ProfileHeader: React.FC<{ business: any; onContact: () => void; isContacting: boolean; projectCount: number; serviceCount: number }> = ({ business, onContact, isContacting, projectCount, serviceCount }) => {
  const { t, language, isRTL } = useLanguage();
  const name = language === 'ar' ? business.name_ar : (business.name_en || business.name_ar);
  const desc = language === 'ar' ? business.description_ar : (business.description_en || business.description_ar);
  const cityName = business.cities ? (language === 'ar' ? business.cities.name_ar : business.cities.name_en) : '';
  const categoryName = business.categories ? (language === 'ar' ? business.categories.name_ar : business.categories.name_en) : '';
  const memberDate = new Date(business.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long' });

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
      }
    } catch {}
  };

  return (
    <div className="relative">
      {/* Cover */}
      <div className="h-40 sm:h-56 md:h-72 bg-gradient-navy relative overflow-hidden">
        {business.cover_url ? (
          <img src={business.cover_url} alt="" className="w-full h-full object-cover" loading="eager" />
        ) : (
          <>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(var(--accent) / 0.4) 0%, transparent 60%)" }} />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.3) 0%, transparent 50%)" }} />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      {/* Info card */}
      <div className="container relative -mt-16 sm:-mt-24 z-10 px-3 sm:px-4">
        <div className="bg-card/90 dark:bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 dark:border-border/30 p-4 sm:p-6 shadow-xl dark:shadow-2xl dark:shadow-black/20">
          <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-6 items-start">
            {/* Logo */}
            <div className="w-18 h-18 sm:w-28 sm:h-28 rounded-2xl border-2 border-accent/20 dark:border-accent/30 bg-background shadow-lg flex items-center justify-center overflow-hidden shrink-0">
              {business.logo_url ? (
                <img src={business.logo_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-heading font-black text-3xl sm:text-4xl text-accent">{name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                    <h1 className="font-heading font-bold text-lg sm:text-2xl md:text-3xl text-foreground truncate">{name}</h1>
                    {business.is_verified && (
                      <Badge className="bg-accent/10 dark:bg-accent/20 text-accent border-accent/30 gap-1 shrink-0 text-[10px] sm:text-xs">
                        <BadgeCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {t('profile.verified')}
                      </Badge>
                    )}
                  </div>

                  {categoryName && (
                    <span className="text-xs sm:text-sm text-accent font-body font-medium">{categoryName}</span>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground font-body">
                    {cityName && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-accent" />
                        <span>{cityName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                      <span className="font-semibold text-foreground">{Number(business.rating_avg).toFixed(1)}</span>
                      <span>({business.rating_count})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{memberDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="hero" size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={onContact} disabled={isContacting}>
                    {isContacting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    {language === 'ar' ? 'تواصل' : 'Contact'}
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 dark:border-border/40" onClick={handleShare}>
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {desc && (
                <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-muted-foreground font-body leading-relaxed line-clamp-3 sm:line-clamp-none max-w-2xl">{desc}</p>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 pt-4 border-t border-border/30 dark:border-border/20">
            {[
              { icon: FolderOpen, value: projectCount, label: language === 'ar' ? 'مشروع' : 'Projects' },
              { icon: Wrench, value: serviceCount, label: language === 'ar' ? 'خدمة' : 'Services' },
              { icon: Star, value: business.rating_count, label: language === 'ar' ? 'تقييم' : 'Reviews' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3 justify-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
                  <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                </div>
                <div>
                  <div className="font-heading font-bold text-base sm:text-lg text-foreground">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Services Tab ──
const ServicesTab: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { t, language } = useLanguage();
  const { data: services, isLoading } = useServices(businessId);

  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  if (!services?.length) return <EmptyState icon={Wrench} text={language === 'ar' ? 'لا توجد خدمات بعد' : 'No services yet'} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {services.map((service, i) => {
        const name = language === 'ar' ? service.name_ar : (service.name_en || service.name_ar);
        const desc = language === 'ar' ? service.description_ar : (service.description_en || service.description_ar);
        return (
          <div key={service.id} className="p-4 sm:p-5 rounded-xl bg-card dark:bg-card/80 border border-border/50 dark:border-border/30 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5 dark:hover:shadow-black/20 group active:scale-[0.98] animate-fade-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <Wrench className="w-5 h-5 text-accent group-hover:text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground mb-1 truncate">{name}</h3>
                {desc && <p className="text-xs sm:text-sm text-muted-foreground font-body line-clamp-2 mb-2">{desc}</p>}
                {(service.price_from || service.price_to) && (
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-body">
                    <DollarSign className="w-3.5 h-3.5 text-accent" />
                    {service.price_from && <span className="text-accent font-semibold">{service.price_from.toLocaleString()}</span>}
                    {service.price_from && service.price_to && <span className="text-muted-foreground">-</span>}
                    {service.price_to && <span className="text-accent font-semibold">{service.price_to.toLocaleString()}</span>}
                    <span className="text-muted-foreground">{service.currency_code}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Projects Tab ──
const ProjectsTab: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { language, isRTL } = useLanguage();
  const { data: projects, isLoading } = useProjects(businessId);

  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>;
  if (!projects?.length) return <EmptyState icon={FolderOpen} text={language === 'ar' ? 'لا توجد مشاريع بعد' : 'No projects yet'} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
      {projects.map((project: any, i: number) => {
        const title = language === 'ar' ? project.title_ar : (project.title_en || project.title_ar);
        const desc = language === 'ar' ? project.description_ar : (project.description_en || project.description_ar);
        const cityName = project.cities ? (language === 'ar' ? project.cities.name_ar : project.cities.name_en) : '';
        const catName = project.categories ? (language === 'ar' ? project.categories.name_ar : project.categories.name_en) : '';

        return (
          <Link key={project.id} to={`/projects/${project.id}`} className="group block">
            <div className="rounded-xl overflow-hidden border border-border/50 dark:border-border/30 hover:border-accent/30 transition-all duration-500 hover:shadow-xl hover:shadow-accent/5 dark:hover:shadow-black/20 bg-card dark:bg-card/80 active:scale-[0.98] animate-fade-in" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
              <div className="relative aspect-video bg-muted overflow-hidden">
                {project.cover_image_url ? (
                  <img src={project.cover_image_url} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <Building2 className="w-10 h-10 text-muted-foreground/15" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {project.is_featured && (
                  <Badge className="absolute top-2 start-2 bg-accent text-accent-foreground text-[9px] sm:text-[10px] shadow-lg">
                    {isRTL ? '⭐ مميز' : '⭐ Featured'}
                  </Badge>
                )}
                {catName && (
                  <Badge variant="outline" className="absolute top-2 end-2 text-[9px] sm:text-[10px] bg-background/80 dark:bg-background/60 backdrop-blur-sm border-border/50">
                    {catName}
                  </Badge>
                )}
              </div>

              <div className="p-3 sm:p-4 space-y-2">
                <h3 className="font-heading font-bold text-xs sm:text-sm line-clamp-2 group-hover:text-accent transition-colors">{title}</h3>
                {desc && <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{desc}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-border/30 dark:border-border/20 text-[10px] sm:text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2 flex-wrap">
                    {cityName && (
                      <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{cityName}</span>
                    )}
                    {project.duration_days && (
                      <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{project.duration_days} {isRTL ? 'يوم' : 'days'}</span>
                    )}
                  </div>
                  {project.project_cost && (
                    <span className="font-semibold text-accent text-[11px] sm:text-xs">
                      {project.project_cost.toLocaleString()} {project.currency_code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

// ── Portfolio Tab ──
const PortfolioTab: React.FC<{ businessId: string }> = ({ businessId }) => {
  const { t, language } = useLanguage();
  const { data: items, isLoading } = usePortfolio(businessId);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (isLoading) return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div>;
  if (!items?.length) return <EmptyState icon={ImageIcon} text={language === 'ar' ? 'لا توجد أعمال بعد' : 'No portfolio items yet'} />;

  const filtered = filter === 'all' ? items : items.filter(i => i.media_type === filter);

  return (
    <div>
      <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
        {(['all', 'image', 'video'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-body transition-all active:scale-95 ${
              filter === f ? 'bg-accent text-accent-foreground shadow-md shadow-accent/20' : 'bg-muted dark:bg-muted/50 text-muted-foreground hover:bg-muted/80'
            }`}>
            {f === 'all' ? (language === 'ar' ? 'الكل' : 'All') : f === 'image' ? (language === 'ar' ? 'صور' : 'Images') : (language === 'ar' ? 'فيديو' : 'Videos')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
        {filtered.map((item, idx) => {
          const title = language === 'ar' ? item.title_ar : (item.title_en || item.title_ar);
          return (
            <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-border/50 dark:border-border/30 hover:border-accent/40 transition-all active:scale-[0.97] animate-fade-in" style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }} onClick={() => setSelectedIndex(idx)}>
              {item.media_type === 'image' ? (
                <img src={item.media_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-muted dark:bg-muted/50 flex items-center justify-center"><Video className="w-10 h-10 text-accent" /></div>
              )}
              {item.is_featured && (
                <div className="absolute top-2 start-2 px-2 py-0.5 rounded-full bg-accent text-[9px] sm:text-xs font-body text-accent-foreground">{language === 'ar' ? 'مميز' : 'Featured'}</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 sm:p-3 opacity-0 group-hover:opacity-100 sm:transition-opacity">
                <p className="text-[10px] sm:text-xs text-white font-body truncate">{title}</p>
              </div>
              {/* Mobile: always show title */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 sm:hidden">
                <p className="text-[9px] text-white/90 font-body truncate">{title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 sm:p-4" onClick={() => setSelectedIndex(null)}>
          <button className="absolute top-4 end-4 text-white/70 hover:text-white text-2xl font-bold z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">✕</button>
          <button className="absolute start-2 sm:start-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setSelectedIndex(Math.max(0, selectedIndex - 1)); }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button className="absolute end-2 sm:end-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setSelectedIndex(Math.min(filtered.length - 1, selectedIndex + 1)); }}>
            <ChevronRight className="w-6 h-6" />
          </button>
          <img src={filtered[selectedIndex]?.media_url} alt="" className="max-w-full max-h-[85vh] rounded-lg object-contain" onClick={e => e.stopPropagation()} />
          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
            {selectedIndex + 1} / {filtered.length}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Reviews Tab ──
const ReviewsTab: React.FC<{ business: any }> = ({ business }) => {
  const { language } = useLanguage();
  const { data: reviews, isLoading } = useReviews(business.id);

  const distribution = useMemo(() => {
    if (!reviews?.length) return [0,0,0,0,0];
    const counts = [0,0,0,0,0];
    reviews.forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
    return counts;
  }, [reviews]);

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (!reviews?.length) return <EmptyState icon={MessageSquare} text={language === 'ar' ? 'لا توجد تقييمات بعد' : 'No reviews yet'} />;

  const maxCount = Math.max(...distribution, 1);

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="p-4 sm:p-6 rounded-xl bg-card dark:bg-card/80 border border-border/50 dark:border-border/30">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
          <div className="text-center">
            <div className="font-heading font-black text-4xl sm:text-5xl text-foreground">{Number(business.rating_avg).toFixed(1)}</div>
            <Stars rating={Math.round(business.rating_avg)} size="w-4 h-4 sm:w-5 sm:h-5" />
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{business.rating_count} {language === 'ar' ? 'تقييم' : 'reviews'}</p>
          </div>
          <div className="flex-1 w-full space-y-1.5">
            {[5,4,3,2,1].map(star => (
              <div key={star} className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="w-3 text-muted-foreground">{star}</span>
                <Star className="w-3 h-3 text-accent fill-accent" />
                <div className="flex-1 h-2 bg-muted dark:bg-muted/50 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${(distribution[star-1] / maxCount) * 100}%` }} />
                </div>
                <span className="w-5 text-end text-muted-foreground text-[10px]">{distribution[star-1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-3 sm:space-y-4">
        {reviews.map((review: any) => {
          const profile = review.profiles as any;
          const date = new Date(review.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          return (
            <div key={review.id} className="p-4 sm:p-5 rounded-xl bg-card dark:bg-card/80 border border-border/50 dark:border-border/30 hover:border-accent/20 transition-colors">
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/10 dark:bg-accent/20 flex items-center justify-center shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs sm:text-sm font-bold text-accent">{(profile?.full_name || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-xs sm:text-sm text-foreground">{profile?.full_name || (language === 'ar' ? 'مستخدم' : 'User')}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{date}</p>
                  </div>
                </div>
                <Stars rating={review.rating} size="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
              {review.title && <h4 className="font-heading font-semibold text-sm text-foreground mb-1">{review.title}</h4>}
              {review.content && <p className="text-xs sm:text-sm text-muted-foreground font-body leading-relaxed">{review.content}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Contact Tab ──
const ContactTab: React.FC<{ business: any }> = ({ business }) => {
  const { t, language, isRTL } = useLanguage();
  const cityName = business.cities ? (language === 'ar' ? business.cities.name_ar : business.cities.name_en) : '';
  const countryName = business.countries ? (language === 'ar' ? business.countries.name_ar : business.countries.name_en) : '';

  const contactItems = [
    business.phone && { icon: Phone, label: language === 'ar' ? 'اتصل بنا' : 'Call us', value: business.phone, href: `tel:${business.phone}`, dir: 'ltr' as const },
    business.email && { icon: Mail, label: language === 'ar' ? 'راسلنا' : 'Email us', value: business.email, href: `mailto:${business.email}`, dir: 'ltr' as const },
    business.website && { icon: Globe, label: language === 'ar' ? 'الموقع' : 'Website', value: business.website.replace(/^https?:\/\//, ''), href: business.website, dir: 'ltr' as const, external: true },
  ].filter(Boolean) as any[];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <div className="space-y-3">
        {contactItems.map((item, i) => (
          <a key={i} href={item.href} {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-card dark:bg-card/80 border border-border/50 dark:border-border/30 hover:border-accent/30 transition-all group active:scale-[0.98]">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center group-hover:bg-accent transition-colors shrink-0">
              <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-accent group-hover:text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground font-body">{item.label}</p>
              <p className="font-body text-sm text-foreground font-medium truncate" dir={item.dir}>{item.value}</p>
            </div>
            {item.external && <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />}
          </a>
        ))}
      </div>

      <div className="p-4 sm:p-5 rounded-xl bg-card dark:bg-card/80 border border-border/50 dark:border-border/30">
        <h3 className="font-heading font-bold text-sm sm:text-base text-foreground mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
          {language === 'ar' ? 'الموقع' : 'Location'}
        </h3>
        <div className="space-y-2 font-body text-xs sm:text-sm text-muted-foreground mb-3">
          {business.address && <p>{business.address}</p>}
          {(cityName || countryName) && <p>{[cityName, countryName].filter(Boolean).join('، ')}</p>}
        </div>

        {business.latitude && business.longitude ? (
          <div className="space-y-2">
            <div className="rounded-xl overflow-hidden border border-border/50 dark:border-border/30 aspect-video sm:aspect-[16/9]">
              <iframe
                title={language === 'ar' ? 'موقع المزود' : 'Provider location'}
                width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(business.longitude) - 0.01},${Number(business.latitude) - 0.008},${Number(business.longitude) + 0.01},${Number(business.latitude) + 0.008}&layer=mapnik&marker=${business.latitude},${business.longitude}`}
              />
            </div>
            <a href={`https://www.google.com/maps?q=${business.latitude},${business.longitude}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-accent hover:underline font-body">
              <ExternalLink className="w-3.5 h-3.5" />
              {language === 'ar' ? 'فتح في خرائط Google' : 'Open in Google Maps'}
            </a>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground/60 font-body">{language === 'ar' ? 'لم يتم تحديد الموقع' : 'Location not set'}</p>
        )}
      </div>
    </div>
  );
};

// ── Empty State ──
const EmptyState: React.FC<{ icon: any; text: string }> = ({ icon: Icon, text }) => (
  <div className="text-center py-12 sm:py-16">
    <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 dark:bg-muted/30 flex items-center justify-center mb-3">
      <Icon className="w-8 h-8 text-muted-foreground/30" />
    </div>
    <p className="text-sm text-muted-foreground font-body">{text}</p>
  </div>
);

// ══════════ Main Page ══════════

const BusinessProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { t, isRTL, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: business, isLoading, error } = useBusinessByUsername(username || '');
  const { data: projects = [] } = useProjects(business?.id);
  const { data: services = [] } = useServices(business?.id);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const contactMutation = useMutation({
    mutationFn: async () => {
      if (!user) { navigate('/auth'); throw new Error('not_authenticated'); }
      if (!business) throw new Error('no_business');
      const providerId = business.user_id;
      if (providerId === user.id) throw new Error('self_contact');

      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${providerId}),and(participant_1.eq.${providerId},participant_2.eq.${user.id})`)
        .maybeSingle();

      if (existing) return { id: existing.id, isNew: false };

      const { data: created, error: err } = await supabase
        .from('conversations')
        .insert({ participant_1: user.id, participant_2: providerId })
        .select('id')
        .single();
      if (err) throw err;

      const businessName = language === 'ar' ? business.name_ar : (business.name_en || business.name_ar);
      const greeting = language === 'ar'
        ? `مرحباً، أود الاستفسار عن خدماتكم في ${businessName}`
        : `Hello, I'd like to inquire about your services at ${businessName}`;

      await supabase.from('messages').insert({
        conversation_id: created.id, sender_id: user.id, content: greeting, message_type: 'text',
      });

      return { id: created.id, isNew: true };
    },
    onSuccess: (result) => {
      if (result.isNew) toast.success(isRTL ? 'تم بدء المحادثة' : 'Conversation started');
      navigate('/dashboard/messages');
    },
    onError: (err: any) => {
      if (err.message === 'not_authenticated') return;
      if (err.message === 'self_contact') { toast.error(isRTL ? 'لا يمكنك مراسلة نفسك' : "You can't message yourself"); return; }
      toast.error(isRTL ? 'فشل بدء المحادثة' : 'Failed to start conversation');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="pt-14">
          <Skeleton className="h-40 sm:h-56 w-full" />
          <div className="container mt-8 space-y-4 px-3 sm:px-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!business || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center space-y-4 px-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
            <Shield className="w-10 h-10 text-accent" />
          </div>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground">{t('profile.not_found')}</h2>
          <p className="text-sm text-muted-foreground font-body">{t('profile.not_found_desc')}</p>
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

  const businessName = language === 'ar' ? business.name_ar : (business.name_en || business.name_ar);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ═══ Sticky Top Nav ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-primary/95 dark:bg-card/95 backdrop-blur-md border-b border-accent/20 dark:border-border/30">
        <div className="container flex items-center justify-between h-12 sm:h-14 px-3 sm:px-4">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 text-primary-foreground/80 dark:text-foreground/80 hover:text-accent transition-colors font-body text-xs sm:text-sm">
            <BackArrow className="w-4 h-4" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-gradient-gold flex items-center justify-center">
                <span className="font-heading font-black text-[10px] sm:text-xs text-secondary-foreground">ف</span>
              </div>
              <span className="font-heading font-bold text-sm text-primary-foreground dark:text-foreground hidden sm:inline">فنيين</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-heading font-semibold text-primary-foreground dark:text-foreground truncate max-w-[120px] sm:max-w-none">{businessName}</span>
            <Button variant="hero" size="sm" className="gap-1 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3" onClick={() => contactMutation.mutate()} disabled={contactMutation.isPending}>
              {contactMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
              <span className="hidden sm:inline">{language === 'ar' ? 'تواصل' : 'Contact'}</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-12 sm:pt-14">
        <ProfileHeader business={business} onContact={() => contactMutation.mutate()} isContacting={contactMutation.isPending} projectCount={projects.length} serviceCount={services.length} />

        {/* ═══ Tabs ═══ */}
        <div className="container mt-5 sm:mt-8 pb-10 sm:pb-16 px-3 sm:px-4">
          <Tabs defaultValue="services" className="w-full">
            <div className="overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="w-auto inline-flex justify-start bg-muted/50 dark:bg-muted/30 rounded-xl p-1 h-auto">
                <TabsTrigger value="services" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 text-xs sm:text-sm gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
                  <Wrench className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'الخدمات' : 'Services'}
                </TabsTrigger>
                <TabsTrigger value="projects" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 text-xs sm:text-sm gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
                  <FolderOpen className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'المشاريع' : 'Projects'}
                  {projects.length > 0 && <span className="text-[9px] bg-accent/20 px-1.5 rounded-full">{projects.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="portfolio" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 text-xs sm:text-sm gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'الأعمال' : 'Portfolio'}
                </TabsTrigger>
                <TabsTrigger value="reviews" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 text-xs sm:text-sm gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
                  <Star className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'التقييمات' : 'Reviews'}
                  <span className="text-[9px] bg-accent/20 px-1.5 rounded-full">{business.rating_count}</span>
                </TabsTrigger>
                <TabsTrigger value="contact" className="font-body rounded-lg data-[state=active]:bg-accent data-[state=active]:text-accent-foreground px-3 sm:px-5 py-2 text-xs sm:text-sm gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
                  <Phone className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'التواصل' : 'Contact'}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="mt-4 sm:mt-6">
              <TabsContent value="services"><ServicesTab businessId={business.id} /></TabsContent>
              <TabsContent value="projects"><ProjectsTab businessId={business.id} /></TabsContent>
              <TabsContent value="portfolio"><PortfolioTab businessId={business.id} /></TabsContent>
              <TabsContent value="reviews"><ReviewsTab business={business} /></TabsContent>
              <TabsContent value="contact"><ContactTab business={business} /></TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BusinessProfile;
