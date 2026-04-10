import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import {
  Star, MapPin, BadgeCheck, Phone, Building2, Crown, Globe,
} from 'lucide-react';

interface BusinessCardProps {
  business: any;
  viewMode: 'grid' | 'list';
}

const tierConfig: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  enterprise: { label: 'Enterprise', color: 'bg-accent text-accent-foreground', icon: Crown },
  premium: { label: 'Premium', color: 'bg-accent/80 text-accent-foreground', icon: Crown },
  basic: { label: 'Basic', color: 'bg-muted text-foreground', icon: Crown },
};

export const BusinessCard = ({ business: b, viewMode }: BusinessCardProps) => {
  const { language } = useLanguage();

  const name = language === 'ar' ? b.name_ar : (b.name_en || b.name_ar);
  const desc = language === 'ar' ? b.description_ar : (b.description_en || b.description_ar);
  const cityName = b.cities ? (language === 'ar' ? (b.cities as any).name_ar : (b.cities as any).name_en) : '';
  const catName = b.categories ? (language === 'ar' ? (b.categories as any).name_ar : (b.categories as any).name_en) : '';
  const tier = tierConfig[b.membership_tier];

  if (viewMode === 'list') {
    return (
      <Link
        to={`/${b.username}`}
        className="group flex items-center gap-5 p-5 rounded-2xl bg-card border border-border hover:border-accent/40 hover:shadow-lg transition-all duration-300"
      >
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-border group-hover:ring-accent/30 transition-all">
          {b.logo_url ? (
            <img src={b.logo_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Building2 className="w-8 h-8 text-accent" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-heading font-bold text-lg text-foreground group-hover:text-accent transition-colors truncate">
              {name}
            </h3>
            {b.is_verified && <BadgeCheck className="w-5 h-5 text-accent flex-shrink-0" />}
            {tier && (
              <Badge className={`${tier.color} text-[10px] px-2 py-0 h-5`}>
                <Crown className="w-3 h-3 me-1" />{tier.label}
              </Badge>
            )}
          </div>
          {catName && <span className="text-xs text-accent font-body font-medium">{catName}</span>}
          {desc && <p className="text-sm text-muted-foreground font-body mt-1 line-clamp-1">{desc}</p>}
        </div>

        {/* Stats */}
        <div className="hidden md:flex flex-col items-end gap-2 flex-shrink-0">
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
      </Link>
    );
  }

  // Grid view
  return (
    <Link
      to={`/${b.username}`}
      className="group relative p-5 rounded-2xl bg-card border border-border hover:border-accent/40 hover:shadow-xl transition-all duration-300 flex flex-col"
    >
      {/* Tier badge - absolute */}
      {tier && (
        <Badge className={`${tier.color} text-[10px] px-2 py-0 h-5 absolute top-3 end-3`}>
          <Crown className="w-3 h-3 me-1" />{tier.label}
        </Badge>
      )}

      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-border group-hover:ring-accent/30 transition-all">
          {b.logo_url ? (
            <img src={b.logo_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Building2 className="w-7 h-7 text-accent" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-heading font-bold text-foreground group-hover:text-accent transition-colors truncate">
              {name}
            </h3>
            {b.is_verified && <BadgeCheck className="w-4 h-4 text-accent flex-shrink-0" />}
          </div>
          {catName && <span className="text-xs text-accent font-body font-medium">{catName}</span>}
        </div>
      </div>

      {desc && <p className="text-sm text-muted-foreground font-body mt-3 line-clamp-2">{desc}</p>}

      {/* Footer meta */}
      <div className="flex flex-wrap items-center gap-3 mt-auto pt-4 text-xs text-muted-foreground font-body border-t border-border/50">
        <div className="flex items-center gap-1 bg-accent/10 px-2 py-1 rounded-lg">
          <Star className="w-3.5 h-3.5 text-accent fill-accent" />
          <span className="font-semibold text-foreground">{Number(b.rating_avg).toFixed(1)}</span>
          <span>({b.rating_count})</span>
        </div>
        {cityName && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /><span>{cityName}</span>
          </div>
        )}
        {b.phone && (
          <div className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" /><span dir="ltr">{b.phone}</span>
          </div>
        )}
        {b.website && (
          <div className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </Link>
  );
};
