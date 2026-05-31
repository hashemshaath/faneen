import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Star, MapPin, Building2 } from 'lucide-react';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';

interface Tech {
  id: string;
  username: string;
  name_ar: string;
  name_en: string | null;
  logo_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_verified: boolean | null;
  cities: { name_ar: string; name_en: string | null } | null;
}

interface Props {
  sectorName: string;
  technicians: Tech[];
  /** Optional selected-city label — when set, the heading switches to the city-scoped variant. */
  cityName?: string | null;
}

/** Highlights top 4 verified, highest-rated providers as the "featured technicians" strip. */
export const SectorTopTechnicians: React.FC<Props> = ({ sectorName, technicians, cityName }) => {
  const { isRTL, language } = useLanguage();
  if (!technicians.length) return null;

  return (
    <section className="container px-4 pt-10" aria-labelledby="sector-tech-heading">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-gold" />
        <h2 id="sector-tech-heading" className="font-heading text-lg sm:text-xl font-bold">
          {cityName
            ? (isRTL ? `أفضل فنيي ${sectorName} في ${cityName}` : `Top ${sectorName} technicians in ${cityName}`)
            : (isRTL ? `أفضل فنيي ${sectorName}` : `Top ${sectorName} technicians`)}
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {technicians.map((b) => (
          <Link key={b.id} to={`/${b.username}`} className="block">
            <Card className="hover-lift h-full border-gold/20 hover:border-gold/50">
              <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-gold/30">
                  {b.logo_url ? (
                    <img
                      src={b.logo_url}
                      alt={b.name_ar}
                      className="w-full h-full object-cover"
                      width={64}
                      height={64}
                      decoding="async"
                      {...{ fetchpriority: 'high' }}
                    />
                  ) : (
                    <Building2 className="w-7 h-7 text-muted-foreground/40" />
                  )}
                </div>
                <h3 className="font-heading font-bold text-sm text-foreground line-clamp-1">
                  {language === 'ar' ? b.name_ar : (b.name_en || b.name_ar)}
                </h3>
                <div className="flex items-center gap-1 tech-content">
                  <Star className="w-3 h-3 fill-gold text-gold" />
                  <span className="text-xs text-gold font-medium">{Number(b.rating_avg ?? 0).toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground">({b.rating_count ?? 0})</span>
                </div>
                {b.cities && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {language === 'ar' ? b.cities.name_ar : (b.cities.name_en || b.cities.name_ar)}
                  </p>
                )}
                {b.is_verified && <VerifiedBadge size="xs" />}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default SectorTopTechnicians;