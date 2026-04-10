import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import {
  Star, MapPin, BadgeCheck, Phone, Building2, Crown, Globe, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';

interface BusinessCardProps {
  business: any;
  viewMode: 'grid' | 'list';
}

const tierConfig: Record<string, { label: string; labelAr: string; color: string }> = {
  enterprise: { label: 'Enterprise', labelAr: 'مؤسسي', color: 'bg-accent text-accent-foreground' },
  premium: { label: 'Premium', labelAr: 'مميز', color: 'bg-accent/80 text-accent-foreground' },
  basic: { label: 'Basic', labelAr: 'أساسي', color: 'bg-muted text-foreground' },
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
        className={`group flex items-center gap-3 sm:gap-5 p-3 sm:p-5 rounded-2xl bg-card border border-border hover:border-accent/40 transition-all duration-300 active:scale-[0.98] ${pressed ? 'scale-[0.98] border-accent/40 shadow-lg shadow-accent/10' : ''}`}
      >
        {/* Logo */}
        <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-border group-hover:ring-accent/30 transition-all duration-300 ${pressed ? 'ring-accent/40' : ''}`}>
          {b.logo_url ? (
            <img src={b.logo_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
            <h3 className="font-heading font-bold text-sm sm:text-lg text-foreground group-hover:text-accent transition-colors truncate">
              {name}
            </h3>
            {b.is_verified && <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-accent flex-shrink-0" />}
            {tier && (
              <Badge className={`${tier.color} text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0 h-4 sm:h-5 gap-0.5`}>
                <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{language === 'ar' ? tier.labelAr : tier.label}
              </Badge>
            )}
          </div>
          {catName && <span className="text-[10px] sm:text-xs text-accent font-body font-medium">{catName}</span>}
          {desc && <p className="text-xs sm:text-sm text-muted-foreground font-body mt-0.5 sm:mt-1 line-clamp-1">{desc}</p>}

          {/* Mobile inline stats */}
          <div className="flex items-center gap-2 mt-1.5 sm:hidden">
            <div className="flex items-center gap-1 bg-accent/10 px-2 py-0.5 rounded-lg">
              <Star className="w-3 h-3 text-accent fill-accent" />
              <span className="font-heading font-bold text-xs text-foreground">{Number(b.rating_avg).toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">({b.rating_count})</span>
            </div>
            {cityName && (
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MapPin className="w-3 h-3" />{cityName}
              </div>
            )}
          </div>
        </div>

        {/* Desktop stats */}
        <div className="hidden sm:flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-accent/10 px-3 py-1.5 rounded-xl">
            <Star className="w-4 h-4 text-accent fill-accent" />
            <span className="font-heading font-bold text-foreground">{Number(b.rating_avg).toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({b.rating_count})</span>
          </div>
          {cityName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />{cityName}
            </div>
          )}
        </div>

        {/* Arrow indicator */}
        <Arrow className={`w-4 h-4 text-muted-foreground/40 group-hover:text-accent shrink-0 transition-all duration-300 ${pressed ? 'text-accent translate-x-0.5' : ''} sm:hidden`} />
      </Link>
    );
  }

  // Grid view
  return (
    <Link
      to={`/${b.username}`}
      {...touchHandlers}
      className={`group relative p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-accent/40 transition-all duration-300 flex flex-col active:scale-[0.97] ${pressed ? 'scale-[0.97] border-accent/40 shadow-xl shadow-accent/10' : 'hover:shadow-xl'}`}
    >
      {/* Tier badge */}
      {tier && (
        <Badge className={`${tier.color} text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0 h-4 sm:h-5 absolute top-2.5 end-2.5 sm:top-3 sm:end-3 gap-0.5`}>
          <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{language === 'ar' ? tier.labelAr : tier.label}
        </Badge>
      )}

      <div className="flex items-start gap-3 sm:gap-4">
        {/* Logo */}
        <div className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-border group-hover:ring-accent/30 transition-all duration-300 ${pressed ? 'ring-accent/40 scale-105' : ''}`}>
          {b.logo_url ? (
            <img src={b.logo_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-accent" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-accent transition-colors truncate">
              {name}
            </h3>
            {b.is_verified && <BadgeCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent flex-shrink-0" />}
          </div>
          {catName && <span className="text-[10px] sm:text-xs text-accent font-body font-medium">{catName}</span>}
        </div>
      </div>

      {desc && <p className="text-xs sm:text-sm text-muted-foreground font-body mt-2 sm:mt-3 line-clamp-2">{desc}</p>}

      {/* Footer meta */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-auto pt-3 sm:pt-4 text-[10px] sm:text-xs text-muted-foreground font-body border-t border-border/50">
        <div className="flex items-center gap-1 bg-accent/10 px-2 py-0.5 sm:py-1 rounded-lg">
          <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent fill-accent" />
          <span className="font-semibold text-foreground">{Number(b.rating_avg).toFixed(1)}</span>
          <span>({b.rating_count})</span>
        </div>
        {cityName && (
          <div className="flex items-center gap-0.5 sm:gap-1">
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span>{cityName}</span>
          </div>
        )}
        {b.phone && (
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span dir="ltr">{b.phone}</span>
          </div>
        )}
        {b.website && (
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        )}
      </div>

      {/* Touch ripple indicator */}
      <div className={`absolute inset-0 rounded-2xl bg-accent/5 pointer-events-none transition-opacity duration-200 ${pressed ? 'opacity-100' : 'opacity-0'}`} />
    </Link>
  );
};
