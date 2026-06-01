import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * Shared homepage primitives extracted from HomeV2.tsx for PERF-1C
 * (HomeV2 section split). Behavior preserved 1:1.
 */

export const ROUTES = {
  quote: '/search?intent=quote',
  search: '/search',
  signupProvider: '/auth?mode=signup&role=provider',
  categories: '/categories',
} as const;

export const Section: React.FC<React.PropsWithChildren<{
  id?: string;
  className?: string;
  ariaLabelledBy?: string;
}>> = ({ id, className = '', ariaLabelledBy, children }) => (
  <section id={id} aria-labelledby={ariaLabelledBy} className={`py-14 sm:py-20 ${className}`}>
    <div className="container-app">{children}</div>
  </section>
);

export const SectionHead: React.FC<{ title: string; sub?: string; headingId?: string }> = ({
  title, sub, headingId,
}) => (
  <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-14">
    <h2 id={headingId} className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-foreground tracking-tight leading-tight scroll-mt-24">
      {title}
    </h2>
    {sub && <p className="font-body text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">{sub}</p>}
  </div>
);

export const SectionCover: React.FC<{
  eyebrow: string;
  title: string;
  sub?: string;
  tone?: 'primary' | 'secondary' | 'accent';
  align?: 'center' | 'start';
  icon?: React.ComponentType<{ className?: string }>;
  headingId?: string;
}> = ({ eyebrow, title, sub, tone = 'primary', align = 'center', icon: Icon, headingId }) => {
  const toneRing =
    tone === 'secondary' ? 'bg-secondary/10 text-secondary ring-secondary/20' :
    tone === 'accent'    ? 'bg-accent/10 text-accent ring-accent/20' :
                           'bg-primary/10 text-primary ring-primary/20';
  const toneBar =
    tone === 'secondary' ? 'from-secondary/0 via-secondary to-secondary/0' :
    tone === 'accent'    ? 'from-accent/0 via-accent to-accent/0' :
                           'from-primary/0 via-primary to-primary/0';
  const isCenter = align === 'center';
  return (
    <div className={`max-w-3xl ${isCenter ? 'mx-auto text-center' : ''} mb-10 sm:mb-14`}>
      <div className={`flex items-center gap-3 mb-5 ${isCenter ? 'justify-center' : ''}`}>
        <span className={`hidden sm:block h-px w-10 bg-gradient-to-r ${toneBar}`} aria-hidden="true" />
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider ring-1 ${toneRing}`}>
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {eyebrow}
        </span>
        <span className={`hidden sm:block h-px w-10 bg-gradient-to-r ${toneBar}`} aria-hidden="true" />
      </div>
      <h2 id={headingId} className="font-heading font-black text-3xl sm:text-4xl md:text-[2.75rem] text-foreground tracking-tight leading-[1.15] scroll-mt-24">
        {title}
      </h2>
      {sub && (
        <p className={`font-body text-sm sm:text-base md:text-lg text-muted-foreground mt-4 leading-relaxed ${isCenter ? 'max-w-2xl mx-auto' : ''}`}>
          {sub}
        </p>
      )}
    </div>
  );
};

export const PrimaryCTA: React.FC<{ to: string; label: string; onClick?: () => void }> = ({ to, label, onClick }) => {
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  return (
    <Link to={to} onClick={onClick}>
      <Button variant="primary" size="appLg" className="gap-2">
        {label}
        <Arrow className="w-4 h-4" />
      </Button>
    </Link>
  );
};

export const SecondaryCTA: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <Link to={to}>
    <Button variant="outline" size="appLg" className="gap-2">{label}</Button>
  </Link>
);

export const AudienceBlock: React.FC<{
  badge: string; title: string; body: string; bullets: string[];
  cta: { to: string; label: string }; small?: string; reverse?: boolean;
  tone?: 'primary' | 'secondary' | 'accent';
  image: string; imageAlt: string;
}> = ({ badge, title, body, bullets, cta, small, reverse, tone = 'primary', image, imageAlt }) => {
  const toneClass =
    tone === 'secondary' ? 'bg-secondary/10 text-secondary' :
    tone === 'accent' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary';
  return (
    <Section className="border-t border-border/40">
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${reverse ? 'lg:[&>div:first-child]:order-2' : ''}`}>
        <div>
          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 ${toneClass}`}>{badge}</span>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-foreground mb-4 leading-tight">{title}</h2>
          <p className="font-body text-base text-muted-foreground leading-relaxed mb-6">{body}</p>
          <ul className="space-y-2.5 mb-7">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <PrimaryCTA to={cta.to} label={cta.label} />
          {small && <p className="text-xs text-muted-foreground mt-3">{small}</p>}
        </div>
        <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-card aspect-[4/3] shadow-[var(--elev-1)]">
          <img
            src={image}
            alt={imageAlt}
            width={1280}
            height={960}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 via-transparent to-transparent" />
        </div>
      </div>
    </Section>
  );
};

export const HERO_CHIPS = [
  { ar: 'ألمنيوم', en: 'Aluminum', slug: 'aluminum' },
  { ar: 'حديد', en: 'Iron', slug: 'iron' },
  { ar: 'خشب', en: 'Wood', slug: 'wood' },
  { ar: 'زجاج', en: 'Glass', slug: 'glass' },
  { ar: 'ستانلس ستيل', en: 'Stainless Steel', slug: 'stainless' },
  { ar: 'تصنيع وتركيب', en: 'Fabrication & Install', slug: 'fabrication' },
];