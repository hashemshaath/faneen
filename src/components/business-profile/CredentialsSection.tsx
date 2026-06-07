import { Award as AwardIcon, ShieldCheck, ExternalLink, Trophy, Medal, Star } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/integrations/supabase/types';

type CertificationRow = Database['public']['Tables']['business_certifications']['Row'];
type AwardRow = Database['public']['Tables']['business_awards']['Row'];

interface CredentialsSectionProps {
  certifications: CertificationRow[];
  awards: AwardRow[];
}

const pickLocale = (ar: string | null, en: string | null, isRTL: boolean): string =>
  isRTL ? ar || en || '' : en || ar || '';

const rankMeta: Record<
  NonNullable<AwardRow['rank']>,
  { ar: string; en: string; icon: typeof Trophy; tone: string }
> = {
  winner: { ar: 'الفائز', en: 'Winner', icon: Trophy, tone: 'text-amber-500' },
  runner_up: { ar: 'الوصيف', en: 'Runner-up', icon: Medal, tone: 'text-slate-400' },
  third_place: { ar: 'المركز الثالث', en: 'Third place', icon: Medal, tone: 'text-orange-500' },
  finalist: { ar: 'مرشّح نهائي', en: 'Finalist', icon: Star, tone: 'text-primary' },
  honorable_mention: { ar: 'تقدير', en: 'Honorable mention', icon: Star, tone: 'text-muted-foreground' },
};

/**
 * Public, read-only display of a business's verified credentials.
 * Renders nothing when both lists are empty — no layout shift.
 * RTL-aware via `useLanguage().isRTL`; uses logical Tailwind tokens.
 */
export const CredentialsSection = ({ certifications, awards }: CredentialsSectionProps) => {
  const { isRTL } = useLanguage();

  if (certifications.length === 0 && awards.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-border/60 bg-card/80 p-4 sm:p-5 shadow-sm"
      aria-label={isRTL ? 'الشهادات والجوائز' : 'Credentials & Awards'}
    >
      {certifications.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            <h3 className="font-heading text-sm font-bold text-foreground sm:text-base">
              {isRTL ? 'الشهادات والاعتمادات' : 'Certifications & accreditations'}
            </h3>
            <Badge variant="secondary" className="ms-auto text-[10px] px-1.5 py-0 h-4">
              {certifications.length}
            </Badge>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {certifications.map((c) => {
              const name = pickLocale(c.name_ar, c.name_en, isRTL);
              const issuer = pickLocale(c.issuer_ar, c.issuer_en, isRTL);
              const expired = !!c.expires_at && new Date(c.expires_at).getTime() < Date.now();
              return (
                <li
                  key={c.id}
                  className="group relative flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3 transition-colors hover:border-accent/50"
                >
                  {c.logo_url ? (
                    <img
                      src={c.logo_url}
                      alt={issuer}
                      loading="lazy"
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded-lg object-contain bg-white p-0.5"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 grid place-items-center rounded-lg bg-accent/10 text-accent">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">{name}</p>
                      {c.verified_by_admin && (
                        <ShieldCheck
                          className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                          aria-label={isRTL ? 'موثّقة' : 'Verified'}
                        />
                      )}
                    </div>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{issuer}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      {c.credential_number && (
                        <span className="tech-content rounded bg-muted px-1.5 py-0.5">
                          #{c.credential_number}
                        </span>
                      )}
                      {c.issued_at && (
                        <span className="tech-content">
                          {new Date(c.issued_at).getFullYear()}
                        </span>
                      )}
                      {expired && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">
                          {isRTL ? 'منتهية' : 'Expired'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {c.credential_url && (
                    <a
                      href={c.credential_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="absolute end-2 top-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={isRTL ? 'فتح رابط الشهادة' : 'Open credential link'}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {awards.length > 0 && (
        <div className={certifications.length > 0 ? 'mt-5 border-t border-border/40 pt-4' : ''}>
          <div className="mb-3 flex items-center gap-2">
            <AwardIcon className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <h3 className="font-heading text-sm font-bold text-foreground sm:text-base">
              {isRTL ? 'الجوائز والتكريمات' : 'Awards & recognitions'}
            </h3>
            <Badge variant="secondary" className="ms-auto text-[10px] px-1.5 py-0 h-4">
              {awards.length}
            </Badge>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {awards.map((a) => {
              const title = pickLocale(a.title_ar, a.title_en, isRTL);
              const issuer = pickLocale(a.issuer_ar, a.issuer_en, isRTL);
              const meta = a.rank ? rankMeta[a.rank] : null;
              const RankIcon = meta?.icon ?? AwardIcon;
              return (
                <li
                  key={a.id}
                  className="group relative flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3 transition-colors hover:border-amber-500/40"
                >
                  <div
                    className={`h-10 w-10 shrink-0 grid place-items-center rounded-lg bg-amber-500/10 ${meta?.tone ?? 'text-amber-500'}`}
                  >
                    <RankIcon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">{title}</p>
                      {a.verified_by_admin && (
                        <ShieldCheck
                          className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                          aria-label={isRTL ? 'موثّقة' : 'Verified'}
                        />
                      )}
                    </div>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{issuer}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="tech-content rounded bg-muted px-1.5 py-0.5">
                        {a.awarded_year}
                      </span>
                      {meta && (
                        <span className={`font-medium ${meta.tone}`}>
                          {isRTL ? meta.ar : meta.en}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default CredentialsSection;