import React, { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ShieldCheck, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import aluminumImg from '@/assets/auth/auth-slide-aluminum.jpg';
import glassImg from '@/assets/auth/auth-slide-glass.jpg';
import steelImg from '@/assets/auth/auth-slide-steel.jpg';
import woodImg from '@/assets/auth/auth-slide-wood.jpg';

/**
 * Image-based slideshow showcase for the auth split layout.
 * Four bilingual motivational slides representing the platform's
 * industrial sectors (Aluminum, Glass, Steel, Wood).
 */
interface Slide {
  img: string;
  eyebrow: { ar: string; en: string };
  title: { ar: string; en: string };
  caption: { ar: string; en: string };
}

const SLIDES: Slide[] = [
  {
    img: aluminumImg,
    eyebrow: { ar: 'الألمنيوم', en: 'Aluminum' },
    title: { ar: 'واجهات ترتقي بمشاريعك', en: 'Facades that elevate your projects' },
    caption: {
      ar: 'تواصل مع مصانع وورش الألمنيوم الأكثر ثقةً في المملكة.',
      en: 'Connect with the most trusted aluminum factories and workshops in the Kingdom.',
    },
  },
  {
    img: glassImg,
    eyebrow: { ar: 'الزجاج', en: 'Glass' },
    title: { ar: 'شفافية الإبداع وأناقة التنفيذ', en: 'Transparent craft. Impeccable finish.' },
    caption: {
      ar: 'حلول زجاج معماري احترافية لمشاريع تجارية وسكنية متميّزة.',
      en: 'Professional architectural glass solutions for premium commercial and residential builds.',
    },
  },
  {
    img: steelImg,
    eyebrow: { ar: 'الحديد', en: 'Steel' },
    title: { ar: 'صناعة بقوة لا تنحني', en: 'Built with unbending strength' },
    caption: {
      ar: 'هياكل ومنشآت حديدية ينفّذها أمهر الحرفيين بضمان الجودة.',
      en: 'Steel structures crafted by master fabricators — quality guaranteed.',
    },
  },
  {
    img: woodImg,
    eyebrow: { ar: 'الأخشاب', en: 'Wood' },
    title: { ar: 'دفء الخشب بحرفية لا تُنسى', en: 'Warmth of wood. Mastery you remember.' },
    caption: {
      ar: 'ورش نجارة متخصصة في الديكور الفاخر والتفاصيل الدقيقة.',
      en: 'Carpentry studios specialized in luxury décor and fine detailing.',
    },
  },
];

const AUTO_ROTATE_MS = 5500;

export const AuthShowcase: React.FC = () => {
  const { isRTL } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length),
    [],
  );

  useEffect(() => {
    if (paused) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      AUTO_ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-slate-950 text-white select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label={t('عرض القطاعات الصناعية', 'Industrial sectors showcase')}
    >
      {/* Slides */}
      {SLIDES.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.img}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
              active ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={!active}
          >
            <img
              src={slide.img}
              alt=""
              width={1280}
              height={1600}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={i === 0 ? 'high' : 'auto'}
              className={`w-full h-full object-cover object-center will-change-transform transition-transform duration-[8000ms] ease-out ${
                active ? 'scale-105' : 'scale-100'
              }`}
            />
          </div>
        );
      })}

      {/* Cinematic overlays for legibility */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent mix-blend-overlay"
        aria-hidden
      />

      {/* Brand bar */}
      <div className="absolute top-0 inset-x-0 px-8 lg:px-12 pt-8 lg:pt-10 z-10 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center hover:opacity-90 transition-opacity">
          <BrandLogo variant="full" tone="light" size={44} priority alt="قِطاعات — Qitaat" />
        </Link>
        <div className="hidden lg:inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-white/75">
          <Sparkles className="w-3.5 h-3.5" />
          {t('منصة الصناعة الأولى', 'Industrial directory')}
        </div>
      </div>

      {/* Main content — anchored bottom for cinematic feel */}
      <div className="relative z-10 w-full h-full flex flex-col justify-end px-10 lg:px-14 xl:px-16 pb-14 lg:pb-20">
        <div className="relative max-w-xl min-h-[260px]">
          {SLIDES.map((slide, i) => {
            const active = i === index;
            return (
              <div
                key={slide.img}
                className={`absolute inset-0 transition-all duration-700 ${
                  active
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
                aria-hidden={!active}
              >
                <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/75 mb-4">
                  <span className="w-6 h-px bg-white/50" />
                  {t(slide.eyebrow.ar, slide.eyebrow.en)}
                </span>
                <h2 className="text-3xl lg:text-[2.5rem] xl:text-5xl font-bold leading-[1.15] mb-4 drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
                  {t(slide.title.ar, slide.title.en)}
                </h2>
                <p className="text-white/85 leading-relaxed text-base lg:text-lg max-w-lg">
                  {t(slide.caption.ar, slide.caption.en)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Controls row */}
        <div className="mt-6 flex items-center gap-4">
          <div
            className="flex items-center gap-2"
            role="tablist"
            aria-label={t('شرائح العرض', 'Slides')}
          >
            {SLIDES.map((s, i) => {
              const active = i === index;
              return (
                <button
                  key={s.img}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={t(s.eyebrow.ar, s.eyebrow.en)}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    active ? 'w-10 bg-white' : 'w-4 bg-white/35 hover:bg-white/60'
                  }`}
                />
              );
            })}
          </div>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(isRTL ? 1 : -1)}
              className="w-10 h-10 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/15 transition flex items-center justify-center"
              aria-label={t('السابق', 'Previous')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => go(isRTL ? -1 : 1)}
              className="w-10 h-10 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/15 transition flex items-center justify-center"
              aria-label={t('التالي', 'Next')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trust badge */}
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-white/75">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          {t(
            '+5,000 منشأة معتمدة · +10,000 مشروع منفّذ',
            '5,000+ verified providers · 10,000+ projects delivered',
          )}
        </div>
      </div>
    </div>
  );
};