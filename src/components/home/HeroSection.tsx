import { Link, useNavigate } from "react-router-dom";
import { Search, Star, Shield, Building2, ChevronLeft, ChevronRight, Clock, TrendingUp, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useEffect, useRef, useState, useCallback, memo, useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getSearchHistory,
  addToSearchHistory,
} from "@/services/search/useSearch";
// HeroParticles is purely decorative — defer it past LCP to keep the main
// thread free during the initial paint (improves INP/TBT on mobile).
const HeroParticles = lazy(() =>
  import("./HeroParticles").then((m) => ({ default: m.HeroParticles })),
);
// First slide is served from /public so we can <link rel="preload"> it from
// index.html — that preload only matches if the URL is identical here.
const heroBg1 = "/hero-bg.webp";
import heroBg2 from "@/assets/hero-slide-2.webp";
import heroBg3 from "@/assets/hero-slide-3.webp";

const slidesData = [
  {
    image: heroBg1,
    titleKey1: 'hero.title1',
    titleKey2: 'hero.title2',
    descKey: 'hero.desc',
  },
  {
    image: heroBg2,
    title1Ar: 'واجهات زجاجية وألمنيوم',
    title1En: 'Glass & Aluminum Facades',
    title2Ar: 'بأعلى المعايير العالمية',
    title2En: 'With Global Standards',
    descAr: 'نوافذ، أبواب، واجهات معمارية بأحدث التقنيات وأفضل الخامات العالمية',
    descEn: 'Windows, doors, and architectural facades with the latest technologies',
  },
  {
    image: heroBg3,
    title1Ar: 'أعمال خشبية وحديدية',
    title1En: 'Wood & Iron Works',
    title2Ar: 'بلمسات احترافية مميزة',
    title2En: 'With Professional Touch',
    descAr: 'مطابخ فاخرة، خزائن، درابزين حديد، وأبواب بتصاميم عصرية',
    descEn: 'Luxury kitchens, cabinets, iron railings, and modern door designs',
  },
];
const slides = slidesData;

// Preload next slide images in background
const preloadImage = (src: string) => {
  const img = new Image();
  img.src = src;
};

/* Industry defaults reused from /search autocomplete for parity. */
const HERO_SUGGESTIONS = [
  { ar: 'مصانع ألمنيوم في الرياض', en: 'Aluminum factories in Riyadh', icon: '🪟' },
  { ar: 'تركيب نوافذ ألمنيوم', en: 'Aluminum window installation', icon: '🪟' },
  { ar: 'بوابات حديدية', en: 'Iron gates', icon: '⚙️' },
  { ar: 'مطابخ خشبية', en: 'Wooden kitchens', icon: '🪵' },
  { ar: 'واجهات زجاجية', en: 'Glass facades', icon: '🔷' },
  { ar: 'مظلات ألمنيوم', en: 'Aluminum canopies', icon: '🌂' },
  { ar: 'درابزين حديد', en: 'Iron railings', icon: '⚙️' },
  { ar: 'أبواب خشبية داخلية', en: 'Interior wooden doors', icon: '🚪' },
];

const SearchBar = memo(({ categories, cities, language, isRTL, t, onSearch }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isAr = language === 'ar';

  useEffect(() => { if (focused) setHistory(getSearchHistory()); }, [focused]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const items = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list: { label: string; type: 'history' | 'industry' | 'category'; id: string; icon?: string }[] = [];
    if (!q) {
      history.slice(0, 4).forEach(h => list.push({ label: h, type: 'history', id: `h-${h}` }));
      HERO_SUGGESTIONS.slice(0, 6).forEach((s, i) => list.push({ label: isAr ? s.ar : s.en, type: 'industry', id: `i-${i}`, icon: s.icon }));
    } else {
      history.forEach(h => { if (h.toLowerCase().includes(q) && h !== searchQuery) list.push({ label: h, type: 'history', id: `h-${h}` }); });
      HERO_SUGGESTIONS.forEach((s, i) => {
        const label = isAr ? s.ar : s.en;
        if (label.toLowerCase().includes(q)) list.push({ label, type: 'industry', id: `i-${i}`, icon: s.icon });
      });
      (categories || []).forEach((c: any) => {
        const name = isAr ? c.name_ar : c.name_en;
        if (name?.toLowerCase().includes(q)) list.push({ label: name, type: 'category', id: c.id });
      });
    }
    return list.slice(0, 8);
  }, [searchQuery, history, isAr, categories]);

  useEffect(() => { setActiveIdx(-1); }, [items.length]);

  const submit = (term?: string) => {
    const q = (term ?? searchQuery).trim();
    if (q) addToSearchHistory(q);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedCity) params.set('city', selectedCity);
    onSearch(params.toString());
    setFocused(false);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); submit(); };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!focused || items.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(p => (p + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(p => (p <= 0 ? items.length - 1 : p - 1)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); submit(items[activeIdx].label); }
    else if (e.key === 'Escape') { setFocused(false); }
  };

  const showDropdown = focused && items.length > 0;

  return (
    <form onSubmit={handleSearch} className="mt-8 sm:mt-12 max-w-4xl mx-auto">
      <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-2xl shadow-black/30 ring-1 ring-inset ring-white/[0.05]">
        <div className="flex flex-col sm:flex-row gap-2">
          <div ref={wrapRef} className="flex-1 relative">
            <Search aria-hidden="true" className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/75" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setFocused(true); }}
              onFocus={() => setFocused(true)}
              onKeyDown={handleKey}
              placeholder={t('search.placeholder')}
              aria-label={isRTL ? 'كلمة البحث' : 'Search query'}
              role="combobox"
              aria-expanded={showDropdown}
              aria-autocomplete="list"
              className="w-full pe-11 ps-3 sm:pe-12 sm:ps-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white/[0.06] text-white placeholder:text-white/60 font-body text-sm border-0 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-nav focus:bg-white/[0.1] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveIdx(-1); }}
                aria-label={isAr ? 'مسح' : 'Clear'}
                className="absolute end-12 sm:end-14 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Autocomplete dropdown */}
            {showDropdown && (
              <div
                role="listbox"
                className="absolute top-full mt-2 inset-x-0 z-50 rounded-2xl bg-surface-nav/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden animate-fade-in max-h-[360px] overflow-y-auto"
              >
                {!searchQuery && history.length > 0 && (
                  <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5 text-[11px] text-white/55 font-body">
                    <Clock className="w-3 h-3" />
                    {isAr ? 'بحث سابق' : 'Recent'}
                  </div>
                )}
                {!searchQuery && history.length === 0 && (
                  <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5 text-[11px] text-white/55 font-body">
                    <TrendingUp className="w-3 h-3" />
                    {isAr ? 'الأكثر بحثاً' : 'Trending'}
                  </div>
                )}
                {items.map((item, i) => (
                  <button
                    type="button"
                    key={item.id}
                    role="option"
                    aria-selected={activeIdx === i}
                    onMouseDown={(e) => { e.preventDefault(); submit(item.label); }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 text-start transition-colors ${
                      activeIdx === i ? 'bg-white/10' : 'hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="w-6 flex items-center justify-center text-base">
                      {item.type === 'history' ? <Clock className="w-3.5 h-3.5 text-white/55" />
                        : item.type === 'category' ? <Building2 className="w-3.5 h-3.5 text-gold" />
                        : <span aria-hidden>{item.icon}</span>}
                    </span>
                    <span className="flex-1 text-[13px] text-white/90 font-body truncate">{item.label}</span>
                    {item.type === 'category' && (
                      <span className="text-[10px] text-gold/85 bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded-md">
                        {isAr ? 'قسم' : 'Category'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            aria-label={isRTL ? 'تصفية حسب القسم' : 'Filter by category'}
            className="sm:w-44 py-3.5 sm:py-4 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white/[0.06] text-white font-body text-sm border-0 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-nav appearance-none cursor-pointer"
          >
            <option value="" className="bg-surface-nav text-surface-nav-foreground">{isRTL ? 'جميع الأقسام' : 'All Categories'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-surface-nav text-surface-nav-foreground">
                {language === 'ar' ? c.name_ar : c.name_en}
              </option>
            ))}
          </select>
          <select
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            aria-label={isRTL ? 'تصفية حسب المدينة' : 'Filter by city'}
            className="sm:w-40 py-3.5 sm:py-4 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white/[0.06] text-white font-body text-sm border-0 outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-nav appearance-none cursor-pointer hidden sm:block"
          >
            <option value="" className="bg-surface-nav text-surface-nav-foreground">{isRTL ? 'جميع المدن' : 'All Cities'}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id} className="bg-surface-nav text-surface-nav-foreground">
                {language === 'ar' ? c.name_ar : c.name_en}
              </option>
            ))}
          </select>
          <Button type="submit" variant="hero" size="appLg" className="rounded-xl sm:rounded-2xl active:scale-95 transition-transform shadow-lg shadow-gold/25 text-sm sm:text-base font-semibold tracking-wide">
            <Search className="ic-sm sm:ic-md me-2" />
            {t('search.btn')}
          </Button>
        </div>
      </div>
    </form>
  );
});
SearchBar.displayName = 'SearchBar';

// Splits text into <span class="hero-word"> tokens with staggered delay.
// Adds non-breaking spaces between words to keep natural wrapping.
const WordFade = memo(({ text, baseDelay = 0, stepMs = 110, className = '' }: { text: string; baseDelay?: number; stepMs?: number; className?: string }) => {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={`${i}-${w}`} className="hero-word" style={{ animationDelay: `${baseDelay + i * stepMs}ms` }}>
          {w}
          {i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  );
});
WordFade.displayName = 'WordFade';

const HeroTitle = memo(({ slides, current, language, t }: { slides: typeof slidesData; current: number; language: string; t: (key: string) => string }) => {
  const slide = slides[current];
  const line1 = 'titleKey1' in slide && slide.titleKey1
    ? t(slide.titleKey1 as string)
    : (slide as Record<string, string>)[`title1${language === 'ar' ? 'Ar' : 'En'}`];
  const line2 = 'titleKey2' in slide && slide.titleKey2
    ? t(slide.titleKey2 as string)
    : (slide as Record<string, string>)[`title2${language === 'ar' ? 'Ar' : 'En'}`];
  const desc = 'descKey' in slide && slide.descKey
    ? t(slide.descKey as string)
    : (slide as Record<string, string>)[`desc${language === 'ar' ? 'Ar' : 'En'}`];

  const line1Words = line1.split(/\s+/).filter(Boolean).length;
  const stepMs = 130; // calm cadence
  const baseDelay = 200;
  const line2Delay = baseDelay + line1Words * stepMs + 250;
  const line2Words = line2.split(/\s+/).filter(Boolean).length;
  const descDelay = line2Delay + line2Words * stepMs + 200;

  // Re-trigger animation per slide via key
  const animKey = `${current}-${language}`;

  return (
    <div className="min-h-[130px] sm:min-h-[200px] flex flex-col items-center justify-center">
      <div key={animKey}>
        <h2 className="font-heading font-black text-[1.8rem] leading-[1.2] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.75rem] text-white sm:leading-[1.15] mb-3 sm:mb-6 tracking-tight">
          <WordFade text={line1} baseDelay={baseDelay} stepMs={stepMs} />
          <br />
          <WordFade text={line2} baseDelay={line2Delay} stepMs={stepMs} className="text-gradient-gold-shimmer" />
        </h2>
        <p
          className="font-body text-sm sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed px-2 hero-word"
          style={{ animationDelay: `${descDelay}ms`, animationDuration: '1.1s' }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
});
HeroTitle.displayName = 'HeroTitle';

export const HeroSection = () => {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  // Only the previous slide stays mounted briefly to crossfade out.
  // This caps DOM <img> count to 2 instead of `slides.length`.
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const parallaxY = useRef(0);
  const rafRef = useRef<number>();
  const imgRefs = useRef<Record<number, HTMLImageElement | null>>({});
  const sectionRef = useRef<HTMLElement | null>(null);
  const currentRef = useRef(0);

  const { data: categories = [] } = useQuery({
    queryKey: ['nav-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name_ar, name_en, slug').eq('is_active', true).order('sort_order').limit(6);
      return data || [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['nav-cities'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name_ar, name_en').eq('is_active', true).limit(10);
      return data || [];
    },
  });

  // Preload non-current slide images after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      slides.forEach((slide, i) => {
        if (i !== 0) preloadImage(slide.image);
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-play
  const autoplayPaused = useRef(false);
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoplayPaused.current) return;
    timerRef.current = setInterval(() => setCurrent(p => (p + 1) % slides.length), 6000);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    resetTimer();

    const onVisibility = () => {
      autoplayPaused.current = document.hidden ? true : false;
      resetTimer();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let io: IntersectionObserver | undefined;
    if (section) {
      io = new IntersectionObserver((entries) => {
        const inView = !!entries[0]?.isIntersecting;
        autoplayPaused.current = !inView || (typeof document !== 'undefined' && document.hidden);
        resetTimer();
      }, { threshold: 0 });
      io.observe(section);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
    };
  }, [resetTimer]);

  // Optimized parallax with rAF throttle
  useEffect(() => {
    // Skip parallax entirely for users that prefer reduced motion AND on
    // narrow viewports where it adds INP cost without visual benefit.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const section = sectionRef.current;
    if (!section) return;
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - parallaxY.current) > 2) {
          parallaxY.current = y;
          // Only transform the visible slide — skips two no-op writes per frame
          const img = imgRefs.current[currentRef.current];
          if (img) img.style.transform = `translateY(${y * 0.35}px) scale(1.15)`;
        }
        rafRef.current = undefined;
      });
    };
    // Only listen while hero is intersecting — saves work once user scrolls past
    let attached = false;
    const attach = () => {
      if (attached) return;
      window.addEventListener("scroll", handleScroll, { passive: true });
      attached = true;
    };
    const detach = () => {
      if (!attached) return;
      window.removeEventListener("scroll", handleScroll);
      attached = false;
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) attach();
        else detach();
      },
      { threshold: 0 },
    );
    io.observe(section);
    return () => {
      io.disconnect();
      detach();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const goTo = useCallback((idx: number) => { setCurrent(idx); resetTimer(); }, [resetTimer]);
  useEffect(() => {
    const p = currentRef.current;
    if (p !== current) setPrevIdx(p);
    currentRef.current = current;
    // Unmount the outgoing slide once the 1s opacity transition finishes.
    const t = setTimeout(() => setPrevIdx(null), 1100);
    return () => clearTimeout(t);
  }, [current]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo]);
  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo]);

  const handleSearch = useCallback((params: string) => {
    navigate(`/search?${params}`);
  }, [navigate]);

  return (
    <section ref={sectionRef} id="main-content" role="banner" aria-label={language === 'ar' ? 'القسم الرئيسي' : 'Hero section'} className="relative min-h-[85vh] sm:min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Slides — only the active slide (and the outgoing one for crossfade)
          are mounted. Caps DOM <img> count to ≤2 regardless of slides.length. */}
      {(prevIdx !== null && prevIdx !== current ? [prevIdx, current] : [current]).map((i) => (
        <img
          key={i}
          ref={(el) => {
            if (el) imgRefs.current[i] = el;
            else delete imgRefs.current[i];
          }}
          src={slides[i].image}
          alt={i === current ? (language === 'ar' ? 'خلفية قسم البحث الرئيسي' : 'Hero background') : ''}
          className={`absolute inset-0 w-full h-full object-cover will-change-transform scale-[1.15] transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          width={1920}
          height={1080}
          {...(i === 0 ? { fetchpriority: 'high' as const } : {})}
          decoding={i === 0 ? 'sync' : 'async'}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/85" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 25%, hsl(42 85% 55% / 0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 30%, transparent 20%, hsl(220 35% 6% / 0.7) 70%)" }} />

      {/* Particles — deferred past first paint, no fallback (purely decorative) */}
      <Suspense fallback={null}>
        <HeroParticles />
      </Suspense>

      {/* Content */}
      <div className="relative z-10 container text-center px-4 sm:px-6 pt-24 sm:pt-28 pb-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gold/25 bg-gold/[0.08] backdrop-blur-xl mb-6 sm:mb-8 animate-fade-in shadow-sm shadow-gold/10">
          <Star className="ic-xs sm:ic-sm text-gold fill-gold/30" />
          <span className="text-[11px] sm:text-sm font-body font-medium text-gold/90 tracking-wide">{t('hero.badge')}</span>
        </div>

        {/* Title with slide transition + typing animation */}
        <HeroTitle slides={slides} current={current} language={language} t={t} />

        {/* Memoized Search Bar */}
        <SearchBar
          categories={categories}
          cities={cities}
          language={language}
          isRTL={isRTL}
          t={t}
          onSearch={handleSearch}
        />

        {/* Quick tags — collapsed by default to save vertical space */}
        {categories.length > 0 && (() => {
          const visibleCount = tagsExpanded ? categories.length : 3;
          const visible = categories.slice(0, visibleCount);
          const remaining = categories.length - visibleCount;
          return (
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 mt-3 sm:mt-5">
              {visible.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => navigate(`/search?category=${cat.id}`)}
                  className="chip font-body text-white/85 bg-white/[0.06] border border-white/15 hover:bg-gold/10 hover:text-gold hover:border-gold/30 active:scale-95 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                >
                  {language === 'ar' ? cat.name_ar : cat.name_en}
                </button>
              ))}
              {(remaining > 0 || tagsExpanded) && (
                <button
                  type="button"
                  onClick={() => setTagsExpanded(v => !v)}
                  aria-expanded={tagsExpanded}
                  className="chip font-body text-gold bg-gold/10 border border-gold/30 hover:bg-gold/20 active:scale-95 backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none inline-flex items-center gap-1"
                >
                  {tagsExpanded ? (
                    <>
                      <Minus className="w-3 h-3" />
                      {isRTL ? 'إخفاء' : 'Less'}
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      {isRTL ? `+${remaining} المزيد` : `+${remaining} more`}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })()}

        {/* Slide controls */}
        <div className="flex items-center justify-center gap-3 mt-8 sm:mt-10">
          <button onClick={prev} aria-label={language === 'ar' ? 'الشريحة السابقة' : 'Previous slide'} className="btn-overlay-icon focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none">
            {isRTL ? <ChevronRight className="ic-sm" /> : <ChevronLeft className="ic-sm" />}
          </button>
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-500 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none ${i === current ? 'bg-gold w-8' : 'bg-white/25 w-1.5 hover:bg-white/40'}`}
                aria-label={`${language === 'ar' ? 'انتقل للشريحة' : 'Go to slide'} ${i + 1}`}
                aria-current={i === current ? 'true' : undefined}
              />
            ))}
          </div>
          <button onClick={next} aria-label={language === 'ar' ? 'الشريحة التالية' : 'Next slide'} className="btn-overlay-icon focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none">
            {isRTL ? <ChevronLeft className="ic-sm" /> : <ChevronRight className="ic-sm" />}
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-10 text-white/75 font-body text-[10px] sm:text-sm mt-6 sm:mt-10">
          <div className="flex items-center gap-1.5">
            <Building2 className="ic-xs sm:ic-sm text-gold/70" />
            <span>{t('hero.providers_count')}</span>
          </div>
          <div className="w-px h-3 bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <Star className="ic-xs sm:ic-sm text-gold/70" />
            <span>{t('hero.reviews_count')}</span>
          </div>
          <div className="w-px h-3 bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <Shield className="ic-xs sm:ic-sm text-gold/70" />
            <span>{t('hero.protection')}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

