import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import {
  Star, MapPin, BadgeCheck, Phone, Building2, Crown, Globe, ChevronRight, ChevronLeft,
  Briefcase, CreditCard,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export const BusinessCard = ({ business: b, viewMode }: BusinessCardProps) => {
  const { language, isRTL } = useLanguage();
  const [pressed, setPressed] = useState(false);
  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  const name = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
  const desc = language === 'ar' ? b.description_ar : (b.description_en || b.description_ar);
  const cityName = b.cities ? (language === 'ar' ? (b.cities as any).name_ar : (b.cities as any).name_en) : '';
  const catName = b.categories ? (language === 'ar' ? (b.categories as any).name_ar : (b.categories as any).name_en) : '';
  const tier = tierConfig[b.membership_tier];
  const serviceCount = Array.isArray((b as any).business_services) ? (b as any).business_services.filter((s: any) => s.is_active).length : 0;
  const rating = Number(b.rating_avg) || 0;
  const initial = name?.charAt(0) || 'ف';
  const hasBnpl = Array.isArray((b as any).business_bnpl_providers) && (b as any).business_bnpl_providers.length > 0;

  const touchHandlers = {
    onTouchStart: () => setPressed(true),
    onTouchEnd: () => setPressed(false),
    onTouchCancel: () => setPressed(false),
  };

  if (viewMode === 'list') {
    return (
      <Link
        to={`/${b.username}`}
        {...touchHandlers}
        className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-card dark:bg-card/80 border border-border/30 dark:border-border/15 hover:border-accent/30 transition-all duration-300 active:scale-[0.98] ${pressed ? 'scale-[0.98] shadow-lg' : 'hover:shadow-md dark:hover:shadow-accent/5'}`}
      >
        {/* Logo */}
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/20 dark:border-border/10 group-hover:border-accent/20 transition-all ${b.logo_url ? '' : `bg-gradient-to-br ${getPlaceholderGradient(name)}`}`}>
          {b.logo_url ? (
            <img src={b.logo_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-xl font-heading font-bold text-accent/60">{initial}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-accent transition-colors truncate">{name}</h3>
            {b.is_verified && <BadgeCheck className="w-4 h-4 text-accent flex-shrink-0" />}
            {tier && tier.label !== 'Basic' && (
              <Badge className={`${tier.color} text-[9px] px-1.5 py-0 h-4 gap-0.5`}>
                <Crown className="w-2.5 h-2.5" />{language === 'ar' ? tier.labelAr : tier.label}
              </Badge>
            )}
          </div>
          {catName && <p className="text-[10px] sm:text-xs text-accent/70 font-body">{catName}</p>}
          {desc && <p className="text-xs text-muted-foreground font-body mt-0.5 line-clamp-1">{desc}</p>}
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

        <Arrow className={`w-4 h-4 text-muted-foreground/30 group-hover:text-accent shrink-0 transition-all ${pressed ? 'text-accent' : ''}`} />
      </Link>
    );
  }

  // Grid view
  return (
    <Link
      to={`/${b.username}`}
      {...touchHandlers}
      className={`group relative rounded-2xl bg-card dark:bg-card/80 border border-border/30 dark:border-border/15 hover:border-accent/25 transition-all duration-300 flex flex-col overflow-hidden active:scale-[0.97] ${pressed ? 'scale-[0.97] shadow-xl' : 'hover:shadow-lg hover:shadow-accent/5 dark:hover:shadow-accent/5'}`}
    >
      {/* Cover area */}
      <div className="relative h-24 sm:h-28 bg-gradient-to-br from-accent/8 via-muted/40 to-accent/5 dark:from-accent/5 dark:via-muted/20 dark:to-accent/8 overflow-hidden">
        {b.cover_url ? (
          <img src={b.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" loading="lazy" />
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
        <div className="flex items-center gap-1.5 mb-0.5">
          <h3 className="font-heading font-bold text-sm sm:text-[15px] text-foreground group-hover:text-accent transition-colors truncate">{name}</h3>
          {b.is_verified && <BadgeCheck className="w-4 h-4 text-accent flex-shrink-0" />}
        </div>
        {catName && <span className="text-[10px] sm:text-xs text-accent/70 font-body">{catName}</span>}

        {desc && <p className="text-xs text-muted-foreground font-body mt-2 line-clamp-2 leading-relaxed">{desc}</p>}

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
    </Link>
  );
};
