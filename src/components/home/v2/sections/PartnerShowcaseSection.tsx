/**
 * PartnerShowcaseSection — "مواقع ذات صلة" / "Related Partners"
 *
 * Continuous CSS-marquee of partner logos. Settings + items are driven
 * by `partner_showcase_settings` (singleton) and `partner_showcase_items`
 * (active rows only via RLS). When too few logos are provided the list is
 * duplicated programmatically so the strip never shows an empty gap; the
 * duplicate set is marked `aria-hidden="true"` so SEO/AT see each logo
 * only once.
 *
 * Performance: no extra libraries. Pure CSS `transform: translateX`
 * keyframes from `src/index.css`. Honors `prefers-reduced-motion`.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';

type Settings = {
  id: string;
  is_enabled: boolean;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  display_mode: 'marquee' | 'grid' | 'static';
  speed: number;
  direction: 'ltr' | 'rtl';
  pause_on_hover: boolean;
  show_arrows: boolean;
  logo_size: 'sm' | 'md' | 'lg';
  gap_size: 'sm' | 'md' | 'lg';
  grayscale: boolean;
  open_in_new_tab: boolean;
  style_variant: 'default' | 'muted' | 'bordered' | 'glass';
};

type Item = {
  id: string;
  source_type: 'business' | 'external';
  business_id: string | null;
  name_ar: string;
  name_en: string;
  logo_url: string;
  target_url: string | null;
  sort_order: number;
};

const LOGO_SIZE: Record<Settings['logo_size'], { h: string; w: string }> = {
  sm: { h: 'h-10 sm:h-12', w: 'w-24 sm:w-28' },
  md: { h: 'h-12 sm:h-16', w: 'w-28 sm:w-36' },
  lg: { h: 'h-16 sm:h-20', w: 'w-36 sm:w-44' },
};
const GAP_SIZE: Record<Settings['gap_size'], string> = {
  sm: 'gap-4 sm:gap-6',
  md: 'gap-6 sm:gap-10',
  lg: 'gap-10 sm:gap-14',
};
const VARIANT_BG: Record<Settings['style_variant'], string> = {
  default: 'bg-background',
  muted: 'bg-muted/30',
  bordered: 'bg-background border-y border-border/60',
  glass: 'bg-gradient-to-b from-muted/10 to-background backdrop-blur',
};

/**
 * Duplicate a small list visually so the marquee can loop seamlessly.
 * We always render at least 12 logical items (2x base when base < 6, 3x
 * when base < 4) and an exact mirrored second copy so a -50% translate
 * lines up with the first copy.
 *
 * Returns `[primary, mirror]` — `primary` is the SEO/AT-visible copy.
 */
export function buildMarqueeSets(items: Item[]): { primary: Item[]; mirror: Item[] } {
  if (items.length === 0) return { primary: [], mirror: [] };
  let primary = items;
  // The marquee animates from translateX(0) to translateX(-50%), which
  // loops seamlessly only if BOTH the primary copy is wider than the
  // viewport AND mirror[0] visually equals primary[0]. With a small list
  // (1–5 logos) the primary copy was narrower than a 1440px desktop, so
  // the strip exposed empty space at -50% and logos visibly "disappeared".
  // Duplicating until we reach at least 16 logical items keeps the strip
  // wider than any realistic viewport while staying cheap (≤16 <img> in
  // each copy, lazy-loaded).
  while (primary.length < 16) {
    primary = [...primary, ...items];
  }
  return { primary, mirror: primary };
}

const PartnerLogo: React.FC<{
  item: Item;
  settings: Settings;
  ariaHidden?: boolean;
}> = ({ item, settings, ariaHidden }) => {
  const { isRTL } = useLanguage();
  const name = isRTL ? item.name_ar : item.name_en;
  const size = LOGO_SIZE[settings.logo_size];

  const img = (
    <img
      src={item.logo_url}
      alt={name}
      loading="lazy"
      decoding="async"
      width={160}
      height={64}
      className={[
        size.h,
        size.w,
        'object-contain',
        'transition-all duration-300',
        settings.grayscale
          ? 'grayscale opacity-70 hover:grayscale-0 hover:opacity-100'
          : 'opacity-90 hover:opacity-100',
      ].join(' ')}
    />
  );

  const wrapperClasses =
    'shrink-0 inline-flex items-center justify-center px-2 sm:px-3';

  if (item.target_url) {
    return (
      <a
        href={item.target_url}
        target={settings.open_in_new_tab ? '_blank' : '_self'}
        rel={settings.open_in_new_tab ? 'noopener noreferrer' : undefined}
        className={wrapperClasses}
        aria-label={name}
        aria-hidden={ariaHidden || undefined}
        tabIndex={ariaHidden ? -1 : 0}
      >
        {img}
      </a>
    );
  }

  return (
    <div
      className={wrapperClasses}
      aria-hidden={ariaHidden || undefined}
      role={ariaHidden ? 'presentation' : 'img'}
      aria-label={ariaHidden ? undefined : name}
    >
      {img}
    </div>
  );
};

const PartnerShowcaseSection: React.FC = () => {
  const bi = useBi();
  const { isRTL } = useLanguage();

  const { data: settings } = useQuery<Settings | null>({
    queryKey: ['partner-showcase-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_showcase_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ['partner-showcase-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_showcase_items')
        .select('id,source_type,business_id,name_ar,name_en,logo_url,target_url,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: settings?.is_enabled !== false,
  });

  const { primary, mirror } = useMemo(() => buildMarqueeSets(items), [items]);

  if (!settings || !settings.is_enabled || primary.length === 0) {
    return null;
  }

  // Animation duration: speed config (10–200) → seconds (slow = larger).
  const duration = `${Math.max(10, Math.min(200, settings.speed))}s`;
  const direction = settings.direction;

  return (
    <section
      aria-labelledby="partner-showcase-title"
      className={['w-full py-12 sm:py-16', VARIANT_BG[settings.style_variant]].join(' ')}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <header className="text-center mb-8 sm:mb-10 max-w-2xl mx-auto">
          <h2
            id="partner-showcase-title"
            className="text-2xl sm:text-3xl font-bold text-foreground"
          >
            {bi(settings.title_ar, settings.title_en)}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            {bi(settings.description_ar, settings.description_en)}
          </p>
        </header>

        <div className="relative partner-marquee-wrap">
          {settings.show_arrows && (
            <>
              <button
                type="button"
                aria-label={bi('السابق', 'Previous')}
                className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-background/80 border border-border shadow-sm hover:bg-background"
              >
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <button
                type="button"
                aria-label={bi('التالي', 'Next')}
                className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-background/80 border border-border shadow-sm hover:bg-background"
              >
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </>
          )}

          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-[1]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-[1]" />

          <div className="overflow-hidden">
            <div
              className="partner-marquee-track"
              data-direction={direction}
              data-pause-on-hover={settings.pause_on_hover ? 'true' : 'false'}
              style={{ animationDuration: duration }}
            >
              {/* Primary copy (SEO + AT visible) */}
              <ul
                role="list"
                className={['flex items-center', GAP_SIZE[settings.gap_size], 'pe-6 sm:pe-10'].join(' ')}
              >
                {primary.map((item, i) => (
                  <li key={`p-${item.id}-${i}`}>
                    <PartnerLogo item={item} settings={settings} />
                  </li>
                ))}
              </ul>
              {/* Mirrored copy (visual only — hidden from SEO/AT) */}
              <ul
                role="list"
                aria-hidden="true"
                className={['flex items-center', GAP_SIZE[settings.gap_size], 'pe-6 sm:pe-10'].join(' ')}
              >
                {mirror.map((item, i) => (
                  <li key={`m-${item.id}-${i}`}>
                    <PartnerLogo item={item} settings={settings} ariaHidden />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerShowcaseSection;