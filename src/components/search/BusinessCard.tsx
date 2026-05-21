import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import {
  Star, MapPin, Phone, Crown, Globe, ChevronRight, ChevronLeft,
  Briefcase, CreditCard, Heart, TicketPercent, ShieldCheck, Layers,
} from 'lucide-react';
import { useBusinessFavorites } from '@/hooks/useBusinessFavorites';
import { useRecentlyViewedBusinesses } from '@/hooks/useRecentlyViewedBusinesses';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { toast } from 'sonner';

interface BusinessCardProps {
  business: any;
  viewMode: 'grid' | 'list';
}

const tierConfig: Record<string, { label: string; labelAr: string; color: string; icon: string }> = {
  enterprise: { label: 'Enterprise', labelAr: 'مؤسسي', color: 'bg-accent text-accent-foreground', icon: '🏢' },
  premium: { label: 'Premium', labelAr: 'مميز', color: 'bg-accent/80 text-accent-foreground', icon: '⭐' },
  basic: { label: 'Basic', labelAr: 'أساسي', color: 'bg-muted text-foreground', icon: '' },
};

const RatingStars = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'xs' }) => {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-3 h-3';
  return (
    <div className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`${cls} ${s <= Math.round(rating) ? 'text-accent fill-accent' : 'text-border dark:text-border/30'}`} />
      ))}
    </div>
  );
};

// Generate a consistent color for logo placeholder based on business name
const getPlaceholderGradient = (name: string) => {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const gradients = [
    'from-accent/20 to-accent/5',
    'from-primary/20 to-primary/5',
    'from-accent/15 via-muted to-accent/10',
    'from-muted to-accent/10',
  ];
  return gradients[hash % gradients.length];
};

export const BusinessCard = memo(({ business: b, viewMode }: BusinessCardProps) => {
  const { language, isRTL } = useLanguage();
  const [pressed, setPressed] = useState(false);
  const Arrow = isRTL ? ChevronLeft : ChevronRight;
  const { isFavorite, toggleFavorite } = useBusinessFavorites();
  const fav = isFavorite(b.id);
  const { track } = useRecentlyViewedBusinesses();
  const handleOpen = () => track(b.id);

  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowFav = toggleFavorite(b.id);
    toast.success(
      nowFav
        ? (isRTL ? 'تمت إضافته إلى المفضلة' : 'Added to favorites')
        : (isRTL ? 'تمت إزالته من المفضلة' : 'Removed from favorites'),
    );
  };

  const name = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
  const desc = language === 'ar' ? b.description_ar : (b.description_en || b.description_ar);
  const cityName = b.cities ? (language === 'ar' ? (b.cities as any).name_ar : (b.cities as any).name_en) : '';
  const catName = b.categories ? (language === 'ar' ? (b.categories as any).name_ar : (b.categories as any).name_en) : '';
  const tier = tierConfig[b.membership_tier];
  const serviceCount = Array.isArray((b as any).business_services) ? (b as any).business_services.filter((s) => s.is_active).length : 0;
  const rating = Number(b.rating_avg) || 0;
  const initial = name?.charAt(0) || 'ف';
  const hasBnpl = Array.isArray((b as any).business_bnpl_providers) && (b as any).business_bnpl_providers.length > 0;

  // Service tag chips (saqf-style) — show top 3 active service names + remainder count.
  const services: Array<Record<string, unknown>> = Array.isArray((b as any).business_services)
    ? (b as any).business_services.filter((s: Record<string, unknown>) => s.is_active)
    : [];
  const serviceTags: string[] = services
    .map((s) => (language === 'ar' ? (s.name_ar as string) : ((s.name_en as string) || (s.name_ar as string))))
    .filter((n): n is string => !!n);
  const visibleTags = serviceTags.slice(0, 3);
  const remainingTags = Math.max(0, serviceTags.length - visibleTags.length);

  // Service-category diversity — count distinct non-null category_id values
  // among active services. Only meaningful when > 1 (provider spans multiple
  // service categories).
  const distinctServiceCategoryCount = (() => {
    const set = new Set<string>();
    for (const s of services) {
      const cid = (s as { category_id?: string | null }).category_id;
      if (typeof cid === 'string' && cid.length > 0) set.add(cid);
    }
    return set.size;
  })();
  const diversityCount = distinctServiceCategoryCount > 1 ? distinctServiceCategoryCount : 0;

  // Reusable compact category badge (icon + name). Renders nothing when the
  // provider has no linked category (e.g. the 5 QA-NULL services).
  const CategoryBadge = ({ size = 'md' }: { size?: 'sm' | 'md' }) =>
    catName ? (
      <span
        className={`inline-flex items-center gap-1 rounded-md bg-accent/10 text-accent border border-accent/20 font-body ${
          size === 'sm' ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[10px] sm:text-[11px]'
        }`}
        title={catName}
      >
        <Layers className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate max-w-[120px]">{catName}</span>
      </span>
    ) : null;

  // Reusable "+N service categories" diversity pill.
  const DiversityPill = ({ hideOnXs = false }: { hideOnXs?: boolean }) =>
    diversityCount > 0 ? (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md bg-muted/70 text-muted-foreground border border-border/50 text-[10px] sm:text-[11px] font-body tech-content ${
          hideOnXs ? 'hidden xs:inline-flex' : ''
        }`}
        title={isRTL ? `${diversityCount} تخصصات` : `${diversityCount} service categories`}
      >
        {isRTL ? `+${diversityCount} تخصصات` : `+${diversityCount} service categories`}
      </span>
    ) : null;

  // Active promotion (coupon/offer) badge.
  const today = new Date().toISOString().slice(0, 10);
  const hasOffer = Array.isArray((b as any).promotions)
    && (b as any).promotions.some((p: Record<string, unknown>) =>
      p.is_active && (!p.end_date || (p.end_date as string) >= today),
    );

  const touchHandlers = {
    onTouchStart: () => setPressed(true),
    onTouchEnd: () => setPressed(false),
    onTouchCancel: () => setPressed(false),
  };

  if (viewMode === 'list') {
    return (
      <Link
        to={`/${b.username}`}
        onClick={handleOpen}
        {...touchHandlers}
        className={`card-ds card-interactive group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 ${pressed ? 'scale-[0.98] shadow-lg' : 'hover:shadow-md dark:hover:shadow-accent/5'}`}
      >
        <button
          type="button"
          onClick={handleFav}
          aria-pressed={fav}
          aria-label={isRTL ? (fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة') : (fav ? 'Remove from favorites' : 'Add to favorites')}
          className={`absolute top-2 end-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-sm border ${fav ? 'bg-destructive/15 border-destructive/40 text-destructive' : 'bg-card/70 border-border/40 text-muted-foreground hover:text-destructive hover:border-destructive/40'}`}
        >
          <Heart className={`w-4 h-4 ${fav ? 'fill-destructive' : ''}`} />
        </button>
        {/* Logo */}
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/20 dark:border-border/10 group-hover:border-accent/20 transition-all ${b.logo_url ? '' : `bg-gradient-to-br ${getPlaceholderGradient(name)}`}`}>
          {b.logo_url ? (
            <img src={b.logo_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-xl font-heading font-bold text-accent/60">{initial}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-accent transition-colors truncate">{name}</h3>
            {b.is_verified && <VerifiedBadge size="xs" />}
            {hasOffer && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0 h-4 rounded-md bg-destructive/10 text-destructive dark:text-destructive text-[9px] font-body font-semibold border border-destructive/20">
                <TicketPercent className="w-2.5 h-2.5" />
                {isRTL ? 'كوبون' : 'Coupon'}
              </span>
            )}
            {tier && tier.label !== 'Basic' && (
              <Badge className={`${tier.color} text-[9px] px-1.5 py-0 h-4 gap-0.5`}>
                <Crown className="w-2.5 h-2.5" />{language === 'ar' ? tier.labelAr : tier.label}
              </Badge>
            )}
          </div>
          {catName && (
            <div className="mt-0.5">
              <CategoryBadge size="sm" />
            </div>
          )}
          {desc && <p className="text-xs text-muted-foreground font-body mt-0.5 line-clamp-1">{desc}</p>}
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {visibleTags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/5 text-primary border border-primary/15 text-[9px] sm:text-[10px] font-body truncate max-w-[110px]">
                  {tag}
                </span>
              ))}
              {remainingTags > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[9px] sm:text-[10px] font-body tech-content">+{remainingTags}</span>
              )}
              <DiversityPill hideOnXs />
            </div>
          )}
          {visibleTags.length === 0 && diversityCount > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              <DiversityPill hideOnXs />
            </div>
          )}
          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1">
              <RatingStars rating={rating} size="xs" />
              <span className="font-bold text-xs text-foreground">{rating.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">({b.rating_count})</span>
            </div>
            {cityName && <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><MapPin className="w-3 h-3" />{cityName}</span>}
            {serviceCount > 0 && <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Briefcase className="w-3 h-3" />{serviceCount}</span>}
            {hasBnpl && <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 gap-0.5 bg-primary/10 text-primary"><CreditCard className="w-2.5 h-2.5" />{isRTL ? 'تقسيط' : 'BNPL'}</Badge>}
          </div>
        </div>

        <Arrow className={`w-4 h-4 text-muted-foreground/30 group-hover:text-accent shrink-0 transition-all ${pressed ? 'text-accent' : ''}`} />
      </Link>
    );
  }

  // Grid view
  return (
    <Link
      to={`/${b.username}`}
      onClick={handleOpen}
      {...touchHandlers}
      className={`card-ds card-interactive card-media group relative flex flex-col hover-lift ${pressed ? 'scale-[0.97] shadow-xl' : 'dark:hover:shadow-accent/5'}`}
    >
      {/* Favorite button */}
      <button
        type="button"
        onClick={handleFav}
        aria-pressed={fav}
        aria-label={isRTL ? (fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة') : (fav ? 'Remove from favorites' : 'Add to favorites')}
        className={`absolute top-3 start-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-md border shadow-sm ${fav ? 'bg-destructive/20 border-destructive/40 text-destructive' : 'bg-card/80 border-border/40 text-foreground/60 hover:text-destructive hover:border-destructive/40'}`}
      >
        <Heart className={`w-4 h-4 ${fav ? 'fill-destructive' : ''}`} />
      </button>

      {/* Cover area */}
      <div className="relative h-24 sm:h-28 bg-gradient-to-br from-accent/8 via-muted/40 to-accent/5 dark:from-accent/5 dark:via-muted/20 dark:to-accent/8 overflow-hidden">
        {b.cover_url ? (
          <img src={b.cover_url} alt={language === 'ar' ? b.name_ar : (b.name_en || b.name_ar)} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" loading="lazy" />
        ) : (
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        {/* Tier badge */}
        {tier && tier.label !== 'Basic' && (
          <Badge className={`${tier.color} text-[9px] sm:text-[10px] px-2 py-0 h-5 absolute top-3 end-3 gap-0.5 z-10 shadow-sm`}>
            <Crown className="w-3 h-3" />{language === 'ar' ? tier.labelAr : tier.label}
          </Badge>
        )}
      </div>

      {/* Logo overlapping cover */}
      <div className="px-4 sm:px-5 -mt-9 sm:-mt-10 relative z-10">
        <div className={`w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl border-[3px] border-card shadow-lg flex items-center justify-center overflow-hidden group-hover:shadow-xl transition-shadow ${b.logo_url ? 'bg-card' : `bg-gradient-to-br ${getPlaceholderGradient(name)}`}`}>
          {b.logo_url ? (
            <img src={b.logo_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-2xl font-heading font-bold text-accent/50">{initial}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-5 pt-2.5 sm:pt-3 pb-4 sm:pb-5 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <h3 className="font-heading font-bold text-sm sm:text-[15px] text-foreground group-hover:text-accent transition-colors truncate">{name}</h3>
          {b.is_verified && <VerifiedBadge size="sm" iconOnly />}
        </div>
        {catName && (
          <div className="mt-0.5">
            <CategoryBadge />
          </div>
        )}

        {/* saqf-style status badges */}
        {(b.is_verified || hasOffer) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {b.is_verified && <VerifiedBadge size="md" />}
            {hasOffer && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 text-destructive dark:text-destructive text-[10px] font-body font-semibold border border-destructive/20">
                <TicketPercent className="w-3 h-3" />
                {isRTL ? 'كوبون خصم' : 'Coupon'}
              </span>
            )}
          </div>
        )}

        {desc && <p className="text-xs text-muted-foreground font-body mt-2 line-clamp-2 leading-relaxed">{desc}</p>}

        {/* Service tag chips */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {visibleTags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 rounded-lg bg-primary/5 text-primary border border-primary/15 text-[10px] sm:text-[11px] font-body truncate max-w-[140px] hover:bg-primary/10 transition-colors"
              >
                {tag}
              </span>
            ))}
            {remainingTags > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-lg bg-muted text-muted-foreground text-[10px] sm:text-[11px] font-body tech-content">
                +{remainingTags}
              </span>
            )}
            <DiversityPill hideOnXs />
          </div>
        )}
        {visibleTags.length === 0 && diversityCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <DiversityPill hideOnXs />
          </div>
        )}

        {/* Rating */}
        <div className="flex items-center gap-2 mt-3">
          <RatingStars rating={rating} />
          <span className="font-heading font-bold text-sm text-foreground">{rating.toFixed(1)}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground">({b.rating_count} {isRTL ? 'تقييم' : 'reviews'})</span>
        </div>

        {/* Meta footer */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-3 text-[10px] sm:text-xs text-muted-foreground font-body border-t border-border/20 dark:border-border/10">
          {cityName && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-accent/50" />{cityName}</span>}
          {serviceCount > 0 && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-accent/50" />{serviceCount} {isRTL ? 'خدمة' : 'services'}</span>}
          {b.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-accent/50" /><span dir="ltr">{b.phone}</span></span>}
          {b.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-accent/50" /></span>}
          {hasBnpl && <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 gap-0.5 bg-primary/10 text-primary"><CreditCard className="w-2.5 h-2.5" />{isRTL ? 'تقسيط' : 'BNPL'}</Badge>}
        </div>
      </div>
    </Link>
  );
});

BusinessCard.displayName = 'BusinessCard';
