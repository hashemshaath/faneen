/**
 * Qitaat Home v2 — restructured per the marketing brief (Apple/IKEA tone:
 * short sentences, one idea per section, no hype, no superlatives).
 */
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import {
  ArrowLeft, ArrowRight, Search, ShieldCheck, Activity, MapPin,
  Play, Pause, Sparkles,
} from 'lucide-react';
import { getSearchHistory, addToSearchHistory } from '@/services/search/useSearch';
import { useAbVariant, trackAbClick } from '@/lib/abTesting';
import heroSlide1 from '@/assets/home/hero-slide-1.webp';
import heroSlide2 from '@/assets/home/hero-slide-2.webp';
import heroSlide3 from '@/assets/home/hero-slide-3.webp';
import heroSlide4 from '@/assets/home/hero-slide-4.webp';

/**
 * HomeV2 hosts the eager, above-the-fold HeroV2 component (LCP image owner).
 * All other home sections were split into ./sections/* during PERF-1C so they
 * can be code-split via React.lazy from src/pages/Index.tsx. Do not re-add
 * below-the-fold sections here — that would defeat the bundle split.
 */
const ROUTES = {
  quote: '/search?intent=quote',
  search: '/search',
  signupProvider: '/auth?mode=signup&role=provider',
  categories: '/categories',
};

const PrimaryCTA: React.FC<{ to: string; label: string; onClick?: () => void }> = ({ to, label, onClick }) => {
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

export const HeroV2 = () => {
  const bi = useBi();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const SLIDES = [
    {
      img: heroSlide1,
      tagAr: 'الصناعات الخفيفة', tagEn: 'Light industries',
      titleAr: 'مزودو الألمنيوم والحديد والخشب والزجاج في مكان واحد',
      titleEn: 'Aluminum, iron, wood and glass providers — in one place',
      subAr: 'ابحث عن ورش ومصانع للألمنيوم، الحديد، الزجاج، الخشب، المطابخ، الواجهات والبوابات — واطلب عرض سعر في خطوات بسيطة.',
      subEn: 'Find workshops and factories for aluminum, iron, glass, wood, kitchens, facades and gates — and request a quote in a few simple steps.',
    },
    {
      img: heroSlide2,
      tagAr: 'حديد وستانلس', tagEn: 'Iron & stainless',
      titleAr: 'تصنيع معدني بدقّة وموثوقية',
      titleEn: 'Metal fabrication, done with precision',
      subAr: 'ورش ومصانع تنفّذ أعمال الحديد والستانلس وفق مواصفات واضحة.',
      subEn: 'Workshops and factories delivering steel work to clear specifications.',
    },
    {
      img: heroSlide3,
      tagAr: 'نجارة وخشب', tagEn: 'Carpentry & wood',
      titleAr: 'نجارة احترافية بتفاصيل تصنع الفرق',
      titleEn: 'Professional carpentry with details that make the difference',
      subAr: 'احصل على عرض سعر من نجّارين موثوقين بقربك.',
      subEn: 'Get a quote from trusted carpenters near you.',
    },
    {
      img: heroSlide4,
      tagAr: 'مصانع وتوريد', tagEn: 'Factories & supply',
      titleAr: 'مصانع جاهزة لتنفيذ مشاريعك بكفاءة',
      titleEn: 'Factories ready to deliver your projects efficiently',
      subAr: 'مصانع متخصّصة بقدرة تنفيذ كبيرة وتسليم منضبط.',
      subEn: 'Specialized factories with high capacity and on-time delivery.',
    },
  ];

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState('');
  const reducedRef = useRef(false);
  // Reactive state mirrors the media query so render-time decisions
  // (Ken-Burns animation, cross-fade duration) update if the user
  // toggles the OS setting while the page is open.
  const [reducedMotion, setReducedMotion] = useState(false);

  // Lazy-mount slides: only render <img> for slides we've actually shown.
  // Slide 0 is always mounted (LCP); others mount on-demand to save bandwidth.
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]));

  // Autocomplete state
  const [acOpen, setAcOpen] = useState(false);
  const [acIndex, setAcIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const acContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Slide content group — focus target when the user changes slides via keyboard.
  const slideContentRef = useRef<HTMLDivElement>(null);
  // When true, the upcoming slide change was triggered by keyboard; we move
  // focus to the slide content and SKIP the live-region announcement so the
  // user doesn't hear the same slide twice (focus name + live region).
  const [keyboardSlideChange, setKeyboardSlideChange] = useState(false);
  // Throttled/debounced live-region message. Updated only after a slide has
  // settled (~450ms) AND the message would actually change AND the page is
  // visible. Prevents `role=status` re-announcements when:
  //   1) the same slide re-renders (e.g. language toggle, parent re-render)
  //   2) the user scrubs rapidly through dots (only the final slide speaks)
  //   3) the tab is hidden (no point announcing)
  const initialLiveMessage = bi(
    `الشريحة 1 من ${SLIDES.length}: ${SLIDES[0].titleAr}`,
    `Slide 1 of ${SLIDES.length}: ${SLIDES[0].titleEn}`,
  );
  const [liveMessage, setLiveMessage] = useState(initialLiveMessage);
  const lastAnnouncedRef = useRef<string>(initialLiveMessage);
  // Timestamps of recent slide changes (`active` transitions). Used to
  // adapt the live-region debounce: when changes come in very close
  // together (rapid scrubbing, autoplay catching up after tab focus,
  // bursts of arrow keys) we extend the wait so we only announce the
  // final settled slide.
  // Hard-capped circular buffer (FIFO). Even under pathological bursts —
  // hundreds of synchronous `active` updates, runaway autoplay, or a
  // scripted attack — this list NEVER grows past MAX_SLIDE_TIMES entries.
  // The cap is enforced unconditionally before any filter, so memory stays
  // O(MAX_SLIDE_TIMES) regardless of the filter window or change rate.
  const slideChangeTimesRef = useRef<number[]>([]);

  // Top trending searches (manually curated based on industry priors)
  const TRENDING: { ar: string; en: string; cat?: string }[] = [
    { ar: 'مصانع ألمنيوم في الرياض', en: 'Aluminum factories in Riyadh', cat: 'aluminum' },
    { ar: 'تركيب نوافذ ألمنيوم',    en: 'Aluminum window installation',  cat: 'aluminum' },
    { ar: 'بوابات حديدية',           en: 'Iron gates',                    cat: 'iron' },
    { ar: 'مطابخ خشبية',             en: 'Wooden kitchens',               cat: 'wood' },
    { ar: 'واجهات زجاجية',           en: 'Glass facades',                 cat: 'glass' },
    { ar: 'درابزين ستانلس ستيل',     en: 'Stainless steel railings',      cat: 'stainless' },
    { ar: 'أبواب خشبية داخلية',      en: 'Interior wooden doors',         cat: 'wood' },
    { ar: 'مظلات ألمنيوم',           en: 'Aluminum canopies',             cat: 'aluminum' },
  ];

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      reducedRef.current = mq.matches;
      setReducedMotion(mq.matches);
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  // Preload the LCP hero image at the document level (highest priority).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = heroSlide1;
    link.setAttribute('fetchpriority', 'high');
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Mount the active slide + warm-prefetch the next one (low priority).
  useEffect(() => {
    setMounted((prev) => {
      const next = new Set(prev);
      next.add(active);
      next.add((active + 1) % SLIDES.length);
      return next;
    });
  }, [active, SLIDES.length]);

  // Click-outside to close autocomplete
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (acContainerRef.current && !acContainerRef.current.contains(e.target as Node)) {
        setAcOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Keep the active autocomplete option in view as the user navigates with arrow keys
  useEffect(() => {
    if (!acOpen || acIndex < 0) return;
    const el = document.getElementById(`hero-ac-opt-${acIndex}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [acIndex, acOpen]);

  useEffect(() => {
    if (paused || reducedRef.current) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [paused, SLIDES.length]);

  const goPrev = useCallback(
    () => setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length),
    [SLIDES.length],
  );
  const goNext = useCallback(
    () => setActive((i) => (i + 1) % SLIDES.length),
    [SLIDES.length],
  );

  // Keyboard activation of a dot/thumbnail (Enter/Space): jump to that slide
  // AND treat it as a keyboard-driven change so focus moves to the slide
  // group and the live region stays muted (mirrors arrow-key behavior).
  // Mouse clicks fall through to the regular onClick — focus stays on the
  // dot so sighted users can keep tabbing visually.
  const onDotKeyDown = useCallback(
    (i: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault(); // suppress the synthetic click that would re-fire setActive
      setKeyboardSlideChange(true);
      setActive(i);
    },
    [],
  );

  // Build the would-be announcement for the current slide; effect below
  // commits it to the DOM only when it stably differs from the last one.
  const pendingLiveMessage = keyboardSlideChange
    ? ''
    : bi(
        `الشريحة ${active + 1} من ${SLIDES.length}: ${SLIDES[active].titleAr}`,
        `Slide ${active + 1} of ${SLIDES.length}: ${SLIDES[active].titleEn}`,
      );

  useEffect(() => {
    // While a keyboard-driven change is in flight, the live region stays
    // muted (the focused slide group's aria-label carries the context).
    // The keyboard-focus effect below re-enables announcements as soon as
    // focus has settled, so this branch is purely transient.
    if (keyboardSlideChange) {
      setLiveMessage('');
      return;
    }
    // No announcement when page is hidden
    if (typeof document !== 'undefined' && document.hidden) return;
    // Identical message? Skip — prevents re-announcement on incidental re-renders.
    if (pendingLiveMessage === lastAnnouncedRef.current) return;

    // First announcement (mount) goes through immediately so initial users
    // hear slide 1; subsequent changes are debounced. Base delay is 450ms,
    // but we record the timing between recent slide changes and adapt:
    //   • 2 changes within the last 1s  → 700ms  (medium burst)
    //   • 3+ changes within the last 1s → 1000ms (rapid scrub) — capped so
    //     a settled slide always announces in <= ~1s.
    // Combined with `clearTimeout` on every change, this guarantees only
    // the FINAL slide of a fast burst is ever spoken aloud.
    const MAX_SLIDE_TIMES = 5;          // hard memory cap
    const BURST_WINDOW_MS = 1000;       // sliding window for adaptive delay
    const now = Date.now();
    // 1) Append + hard-cap FIRST (FIFO), so the buffer can never grow past
    //    MAX_SLIDE_TIMES even if filter() somehow returns the full array.
    const buf = slideChangeTimesRef.current;
    buf.push(now);
    if (buf.length > MAX_SLIDE_TIMES) buf.splice(0, buf.length - MAX_SLIDE_TIMES);
    // 2) Then drop entries older than the burst window (in place — same array).
    while (buf.length && now - buf[0] > BURST_WINDOW_MS) buf.shift();
    // Defensive: re-cap in the (impossible) case anything else mutated it.
    if (buf.length > MAX_SLIDE_TIMES) buf.splice(0, buf.length - MAX_SLIDE_TIMES);
    const recent = buf.length;
    let delay = 450;
    if (recent >= 3) delay = 1000;
    else if (recent === 2) delay = 700;
    if (lastAnnouncedRef.current === '') delay = 0;
    const t = window.setTimeout(() => {
      lastAnnouncedRef.current = pendingLiveMessage;
      setLiveMessage(pendingLiveMessage);
    }, delay);
    return () => window.clearTimeout(t);
  }, [pendingLiveMessage, keyboardSlideChange]);

  // Release the timing buffer on unmount so it cannot outlive the component
  // (defensive — refs are GC'd with the fiber, but explicit clearing makes
  // leak hunting via heap snapshots trivial).
  useEffect(() => {
    const buf = slideChangeTimesRef.current;
    return () => { buf.length = 0; };
  }, []);

  // After a keyboard-driven slide change, move focus to the new slide's
  // content group. Its aria-label ("N من M") + aria-roledescription="slide"
  // gives the screen reader equivalent context to the live region — which
  // is intentionally muted in the same render to avoid double announcements.
  // Once focus settles, we:
  //   1) Mark the current slide's text as "already announced" so the live
  //      region won't re-speak it on the very next render.
  //   2) Flip keyboardSlideChange OFF so any SUBSEQUENT slide change (from
  //      the same key, autoplay, or a dot click) is announced normally.
  useEffect(() => {
    if (!keyboardSlideChange) return;
    const el = slideContentRef.current;
    if (el) el.focus({ preventScroll: true });
    // Treat the focused slide as already announced — prevents the live
    // region from re-speaking it the moment we re-enable announcements.
    lastAnnouncedRef.current = bi(
      `الشريحة ${active + 1} من ${SLIDES.length}: ${SLIDES[active].titleAr}`,
      `Slide ${active + 1} of ${SLIDES.length}: ${SLIDES[active].titleEn}`,
    );
    // Re-enable announcements immediately after focus has moved.
    setKeyboardSlideChange(false);
  }, [active, keyboardSlideChange, bi, SLIDES]);

  const PrevIcon = isRTL ? ArrowRight : ArrowLeft;
  const NextIcon = isRTL ? ArrowLeft : ArrowRight;
  // A/B test: override slide 0 (LCP slide) with the assigned variant's content.
  const heroAb = useAbVariant<{
    titleAr?: string;
    titleEn?: string;
    subAr?: string;
    subEn?: string;
  }>('hero_headline');
  const baseSlide = SLIDES[active];
  const slide = active === 0 && heroAb?.content
    ? {
        ...baseSlide,
        titleAr: heroAb.content.titleAr || baseSlide.titleAr,
        titleEn: heroAb.content.titleEn || baseSlide.titleEn,
        subAr:   heroAb.content.subAr   || baseSlide.subAr,
        subEn:   heroAb.content.subEn   || baseSlide.subEn,
      }
    : baseSlide;

  // Build filtered suggestions
  const acItems = (() => {
    const q = query.trim().toLowerCase();
    type Item = { kind: 'history' | 'trending'; label: string; cat?: string };
    const items: Item[] = [];

    if (!q) {
      history.slice(0, 3).forEach((h) => items.push({ kind: 'history', label: h }));
      TRENDING.slice(0, 6).forEach((t) =>
        items.push({ kind: 'trending', label: bi(t.ar, t.en), cat: t.cat }),
      );
    } else {
      TRENDING.forEach((t) => {
        const ar = t.ar.toLowerCase();
        const en = t.en.toLowerCase();
        if (ar.includes(q) || en.includes(q)) {
          items.push({ kind: 'trending', label: bi(t.ar, t.en), cat: t.cat });
        }
      });
      history.forEach((h) => {
        if (h.toLowerCase().includes(q) && !items.find((i) => i.label === h)) {
          items.unshift({ kind: 'history', label: h });
        }
      });
    }
    return items.slice(0, 8);
  })();

  const submitSearch = useCallback(
    (q: string, cat?: string) => {
      const trimmed = q.trim();
      if (trimmed) addToSearchHistory(trimmed);
      const params = new URLSearchParams();
      if (trimmed) params.set('q', trimmed);
      if (cat) params.set('category', cat);
      const qs = params.toString();
      navigate(qs ? `/search?${qs}` : '/search');
      setAcOpen(false);
    },
    [navigate],
  );

  // Keyboard navigation on the carousel: arrow keys, space (play/pause), Home/End
  const onCarouselKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Don't hijack typing inside the search input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const fwd = isRTL ? 'ArrowLeft' : 'ArrowRight';
      const back = isRTL ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd) { e.preventDefault(); setKeyboardSlideChange(true); goNext(); }
      else if (e.key === back) { e.preventDefault(); setKeyboardSlideChange(true); goPrev(); }
      else if (e.key === 'Home') { e.preventDefault(); setKeyboardSlideChange(true); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setKeyboardSlideChange(true); setActive(SLIDES.length - 1); }
      // PageDown = next slide, PageUp = previous slide. Direction-agnostic
      // (same mapping in RTL and LTR) — matches common slider/carousel
      // conventions and reuses the same keyboard-mute logic for #hero-live-region.
      else if (e.key === 'PageDown') { e.preventDefault(); setKeyboardSlideChange(true); goNext(); }
      else if (e.key === 'PageUp') { e.preventDefault(); setKeyboardSlideChange(true); goPrev(); }
      else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        // Enter/Space on the carousel region (or its focused slide group)
        // toggles autoplay — matches the on-screen Pause/Play button. We
        // ignore it when the focused element is itself a button/link so we
        // don't hijack their native activation.
        const target = e.target as HTMLElement;
        const role = target.getAttribute('role');
        const isControl =
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          role === 'button' ||
          role === 'link';
        if (isControl) return;
        e.preventDefault();
        setPaused((p) => !p);
      }
    },
    [isRTL, goNext, goPrev, SLIDES.length],
  );

  // ---- RTL/LTR direction change: preserve keyboard focus -------------------
  // When the user flips language, the entire shell can re-render and React
  // may detach the focused button (different `dir`, swapped icon, reordered
  // arrow buttons). We snapshot the focused element's id BEFORE the swap and
  // restore focus to it (or to a graceful fallback) after the next paint.
  const lastFocusIdRef = useRef<string | null>(null);
  useEffect(() => {
    const section = document.getElementById('hero-carousel')?.parentElement;
    if (!section) return;
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !section.contains(el)) return;
      // Only memo elements we can re-find by id; fall back to slide group.
      lastFocusIdRef.current = el.id || null;
    };
    section.addEventListener('focusin', onFocusIn);
    return () => section.removeEventListener('focusin', onFocusIn);
  }, []);

  // Detect direction transitions and restore focus after the render flushes.
  const prevIsRTLRef = useRef(isRTL);
  useEffect(() => {
    if (prevIsRTLRef.current === isRTL) return;
    prevIsRTLRef.current = isRTL;
    const targetId = lastFocusIdRef.current;
    // rAF ensures the new tree is committed before we try to refocus.
    const raf = requestAnimationFrame(() => {
      const target = targetId ? document.getElementById(targetId) : null;
      if (target && typeof (target as HTMLElement).focus === 'function') {
        (target as HTMLElement).focus({ preventScroll: true });
        return;
      }
      // Fallback: keep focus inside the hero rather than letting it drop to <body>.
      slideContentRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [isRTL]);

  return (
    <section className="relative">
      {/* Skip link for keyboard users — jumps past the carousel to the chips */}
      <a
        href="#hero-sector-chips"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:start-3 focus:z-30 focus:px-3 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-lg"
      >
        {bi('تخطّي عرض الشرائح', 'Skip slideshow')}
      </a>

      <div
        id="hero-carousel"
        className="relative w-full overflow-hidden bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-inset"
        style={{ minHeight: 'clamp(560px, 88vh, 880px)' }}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={bi('شرائح القطاعات — استخدم الأسهم للتنقل والمسافة للإيقاف', 'Sector slides — use arrow keys to navigate, space to pause')}
        onKeyDown={onCarouselKeyDown}
        onFocus={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
          {/* Live region announcing the current slide for screen readers.
              Uses role="status" (implicit polite) without redundant aria-live to avoid
              double-announcements in NVDA/VoiceOver. */}
          <div id="hero-live-region" className="sr-only" role="status" aria-atomic="true">
            {liveMessage}
          </div>

          {/* Image stack with Ken-Burns */}
          <div aria-hidden="true" className="absolute inset-0">
            {SLIDES.map((s, i) =>
              mounted.has(i) ? (
                <img
                  key={i}
                  src={s.img}
                  alt=""
                  width={1920}
                  height={1080}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  {...{ fetchpriority: i === 0 ? 'high' : 'low' }}
                  className={`absolute inset-0 w-full h-full object-cover ease-out ${
                    reducedMotion ? '' : 'transition-opacity duration-[1100ms]'
                  } ${i === active ? 'opacity-100' : 'opacity-0'}`}
                  style={{
                    animation:
                      i === active && !reducedMotion
                        ? 'qitaat-hero-kenburns 9s ease-out forwards'
                        : 'none',
                  }}
                />
              ) : null,
            )}
            {/*
              Multi-layer overlay tuned for legibility on every screen size:
              1) Stronger bottom-up gradient for the search bar / subtitle area.
              2) Radial vignette behind the centered content to lift the H1.
              3) RTL/LTR side gradient to balance the composition.
              Mobile gets a denser base via the higher start value.
            */}
            <div
              className="absolute inset-0"
              style={{
                background: isRTL
                  ? 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%), linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.20) 100%), linear-gradient(to left, rgba(0,0,0,0.55), transparent 60%)'
                  : 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%), linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.20) 100%), linear-gradient(to right, rgba(0,0,0,0.55), transparent 60%)',
              }}
            />
          </div>

          {/* Top bar — tag + autoplay toggle */}
          <div className="absolute top-0 inset-x-0 p-5 sm:p-7 flex items-center justify-between z-10">
            <span
              key={`tag-${active}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-[11px] sm:text-xs font-semibold text-white animate-fade-in motion-reduce:animate-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {bi(slide.tagAr, slide.tagEn)}
              <span className="opacity-50">·</span>
              <span className="opacity-90">
                {String(active + 1).padStart(2, '0')}
                <span className="opacity-50"> / </span>
                {String(SLIDES.length).padStart(2, '0')}
              </span>
            </span>
            <button
              type="button"
              id="hero-toggle-autoplay"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? bi('تشغيل', 'Play') : bi('إيقاف', 'Pause')}
              aria-pressed={paused}
              className="w-11 h-11 rounded-full bg-white/12 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>

          {/* Centered content */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-5 sm:px-8 py-20 sm:py-28 min-h-[inherit]">
            {/*
              Slide content wrapper acts as the semantic "slide" element.
              The image stack above is aria-hidden (decorative), and #hero-live-region
              is the *only* live announcer — so this group provides static context
              (position + roledescription + current state) without duplicating speech.
            */}
            <div
              key={`txt-${active}`}
              id="hero-slide-content"
              ref={slideContentRef}
              tabIndex={-1}
              role="group"
              aria-roledescription={bi('شريحة', 'slide')}
              aria-label={bi(`${active + 1} من ${SLIDES.length}`, `${active + 1} of ${SLIDES.length}`)}
              aria-current="true"
              className="animate-fade-in motion-reduce:animate-none max-w-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 rounded-lg"
            >
              <h1
                className="font-heading font-black text-[2.1rem] sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.08] tracking-tight"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.55), 0 8px 28px rgba(0,0,0,0.45)' }}
              >
                {bi(slide.titleAr, slide.titleEn)}
              </h1>
              <p
                className="font-body text-base sm:text-lg md:text-xl text-white/95 mt-5 sm:mt-6 leading-relaxed max-w-2xl mx-auto"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.45)' }}
              >
                {bi(slide.subAr, slide.subEn)}
              </p>
            </div>

            {/* Search bar */}
            <div
              ref={acContainerRef}
              className="mt-7 sm:mt-8 w-full max-w-xl relative"
              onBlur={(e) => {
                // Close the autocomplete when focus leaves the entire combobox
                // (Tab / Shift+Tab to outside). Use relatedTarget so internal
                // focus moves between input ↔ options keep the panel open.
                const next = e.relatedTarget as Node | null;
                if (!next || !acContainerRef.current?.contains(next)) {
                  setAcOpen(false);
                  setAcIndex(-1);
                }
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (acIndex >= 0 && acItems[acIndex]) {
                    submitSearch(acItems[acIndex].label, acItems[acIndex].cat);
                  } else {
                    submitSearch(query);
                  }
                }}
                role="search"
              >
                <div className="flex items-center gap-2 h-14 sm:h-[60px] rounded-full bg-white/95 backdrop-blur-md border border-white/40 shadow-2xl ps-5 pe-2">
                  <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                  <input
                    type="search"
                    ref={searchInputRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setAcOpen(true);
                      setAcIndex(-1);
                    }}
                    onFocus={() => {
                      setHistory(getSearchHistory());
                      setAcOpen(true);
                      setPaused(true);
                    }}
                    onKeyDown={(e) => {
                      // ArrowDown opens the panel even when closed (WAI-ARIA combobox pattern)
                      if (e.key === 'ArrowDown' && !acOpen) {
                        if (acItems.length === 0) return;
                        e.preventDefault();
                        setAcOpen(true);
                        setAcIndex(0);
                        return;
                      }
                      if (!acOpen || acItems.length === 0) {
                        if (e.key === 'Escape') {
                          // Allow Escape to clear input on second press
                          if (query) { e.preventDefault(); setQuery(''); }
                        }
                        return;
                      }
                      switch (e.key) {
                        case 'ArrowDown': {
                          e.preventDefault();
                          setAcIndex((i) => (i + 1) % acItems.length);
                          break;
                        }
                        case 'ArrowUp': {
                          e.preventDefault();
                          setAcIndex((i) => (i <= 0 ? acItems.length - 1 : i - 1));
                          break;
                        }
                        case 'Home': {
                          e.preventDefault();
                          setAcIndex(0);
                          break;
                        }
                        case 'End': {
                          e.preventDefault();
                          setAcIndex(acItems.length - 1);
                          break;
                        }
                        case 'Escape': {
                          e.preventDefault();
                          setAcOpen(false);
                          setAcIndex(-1);
                          // Keep focus on the input so the user can keep typing
                          searchInputRef.current?.focus();
                          break;
                        }
                        case 'Tab': {
                          // Close panel on tab-out so focus moves cleanly
                          setAcOpen(false);
                          setAcIndex(-1);
                          break;
                        }
                        default:
                          break;
                      }
                    }}
                    dir="auto"
                    autoComplete="off"
                    placeholder={bi('ابحث: ألمنيوم، حديد، نجارة، زجاج…', 'Search: aluminum, iron, carpentry, glass…')}
                    className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground text-sm sm:text-base h-full focus-visible:outline-none"
                    aria-label={bi('ابحث', 'Search')}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={acOpen}
                    aria-controls="hero-ac-list"
                    aria-activedescendant={acIndex >= 0 ? `hero-ac-opt-${acIndex}` : undefined}
                  />
                  <button
                    type="submit"
                    className="h-11 sm:h-12 px-5 sm:px-6 rounded-full bg-primary text-primary-foreground font-semibold text-sm sm:text-base hover:bg-primary/90 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {bi('ابحث', 'Search')}
                  </button>
                </div>
              </form>

              {acOpen && acItems.length > 0 && (
                <div
                  id="hero-ac-list"
                  role="listbox"
                  className="absolute top-full inset-x-0 mt-2 bg-card/98 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-20 text-start animate-fade-in motion-reduce:animate-none"
                >
                  {!query.trim() && (
                    <div className="px-4 pt-3 pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {bi('الأكثر بحثاً', 'Most searched')}
                    </div>
                  )}
                  <ul className="py-1 max-h-[340px] overflow-y-auto">
                    {acItems.map((it, i) => {
                      const Icon = it.kind === 'history' ? Clock : TrendingUp;
                      const isActive = i === acIndex;
                      return (
                        <li key={`${it.kind}-${it.label}-${i}`} role="presentation">
                          <button
                            type="button"
                            id={`hero-ac-opt-${i}`}
                            role="option"
                            aria-selected={isActive}
                            tabIndex={-1}
                            onMouseEnter={() => setAcIndex(i)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              submitSearch(it.label, it.cat);
                              // Restore focus to the search input after selection
                              // (navigation usually unmounts, but this guards same-route cases)
                              searchInputRef.current?.focus();
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors ${
                              isActive ? 'bg-secondary/10' : 'hover:bg-muted/60'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                it.kind === 'history' ? 'text-muted-foreground' : 'text-secondary'
                              }`}
                            />
                            <span className="flex-1 truncate" dir="auto">{it.label}</span>
                            <ArrowLeft
                              className={`w-3.5 h-3.5 text-muted-foreground/60 ${isRTL ? '' : 'rotate-180'}`}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/*
                Combobox status live region — announces result count to screen readers
                without conflicting with #hero-live-region (which is paused while the
                user has focus inside the search container).
              */}
              <div
                id="hero-ac-status"
                role="status"
                aria-atomic="true"
                className="sr-only"
              >
                {acOpen
                  ? bi(
                      `${acItems.length} ${acItems.length === 1 ? 'اقتراح' : 'اقتراحات'} متاحة`,
                      `${acItems.length} suggestion${acItems.length === 1 ? '' : 's'} available`,
                    )
                  : ''}
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
              <PrimaryCTA
                to={ROUTES.quote}
                label={bi('اطلب عرض سعر', 'Request a quote')}
                onClick={() => trackAbClick('hero_headline')}
              />
              <Link to={ROUTES.signupProvider}>
                <Button
                  variant="outline"
                  size="appLg"
                  className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 hover:text-white"
                >
                  {bi('أضف منشأتك', 'Add your business')}
                </Button>
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] sm:text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> {bi('مزودون موثّقون', 'Verified providers')}</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-sky-300" /> {bi('تغطية المملكة', 'Saudi-wide coverage')}</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-amber-300" /> {bi('بدون عمولة على العميل', 'No fees for customers')}</span>
            </div>
          </div>

          {/* Bottom controls — thumbnails + arrows */}
          <div className="absolute bottom-0 inset-x-0 z-10 px-4 sm:px-6 pb-4 sm:pb-5">
            <div className="flex items-end justify-between gap-3">
              {/* Thumbnails (md+) */}
              <div className="hidden md:flex items-center gap-2">
                {SLIDES.map((s, i) => {
                  const isActive = i === active;
                  // Use the WAI-ARIA token form ("true") on active and OMIT on
                  // inactive — `aria-current="false"` is technically valid but
                  // some screen readers still announce "current" on it.
                  const ariaCurrent = isActive ? ('true' as const) : undefined;
                  const label = bi(
                    `الانتقال إلى ${s.tagAr} — الشريحة ${i + 1} من ${SLIDES.length}${isActive ? '، النشطة' : ''}`,
                    `Go to ${s.tagEn} — slide ${i + 1} of ${SLIDES.length}${isActive ? ', current' : ''}`,
                  );
                  return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    onKeyDown={onDotKeyDown(i)}
                    aria-label={label}
                    aria-current={ariaCurrent}
                    aria-controls="hero-carousel"
                    className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 ${
                      isActive
                        ? 'border-white scale-105 shadow-xl'
                        : 'border-white/30 opacity-60 hover:opacity-100 hover:border-white/60'
                    }`}
                  >
                    <img src={s.img} alt={(isRTL ? s.titleAr : s.titleEn) || ''} className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
                    {isActive && <div className="absolute inset-0 ring-2 ring-secondary/70 rounded-md pointer-events-none" />}
                  </button>
                  );
                })}
              </div>

              {/* Mobile dots */}
              <div className="flex md:hidden items-center gap-2">
                {SLIDES.map((s, i) => {
                  const isActive = i === active;
                  const ariaCurrent = isActive ? ('true' as const) : undefined;
                  const label = bi(
                    `الانتقال إلى الشريحة ${i + 1} من ${SLIDES.length} — ${s.tagAr}${isActive ? '، النشطة' : ''}`,
                    `Go to slide ${i + 1} of ${SLIDES.length} — ${s.tagEn}${isActive ? ', current' : ''}`,
                  );
                  return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    onKeyDown={onDotKeyDown(i)}
                    aria-label={label}
                    aria-current={ariaCurrent}
                    aria-controls="hero-carousel"
                    className={`min-h-11 min-w-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full`}
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-1.5 rounded-full transition-all duration-300 ${
                        isActive ? 'w-8 bg-white' : 'w-2 bg-white/50'
                      }`}
                    />
                  </button>
                  );
                })}
              </div>

              {/* Arrows */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="hero-prev"
                  onClick={goPrev}
                  aria-label={bi('الشريحة السابقة', 'Previous slide')}
                  aria-controls="hero-carousel"
                  className="w-11 h-11 rounded-full bg-white/12 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
                >
                  <PrevIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  id="hero-next"
                  onClick={goNext}
                  aria-label={bi('الشريحة التالية', 'Next slide')}
                  aria-controls="hero-carousel"
                  className="w-11 h-11 rounded-full bg-white/12 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
                >
                  <NextIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-[3px] w-full bg-white/15 rounded-full overflow-hidden">
              <div
                key={`bar-${active}-${paused}`}
                className="h-full bg-secondary"
                style={{
                  animation: paused || reducedRef.current ? 'none' : 'qitaat-hero-progress 6s linear forwards',
                }}
              />
            </div>
          </div>
        </div>

      <style>{`
        @keyframes qitaat-hero-progress { from { width: 0% } to { width: 100% } }
        @keyframes qitaat-hero-kenburns {
          from { transform: scale(1.05) translate3d(0,0,0); }
          to   { transform: scale(1.14) translate3d(-1%, -1%, 0); }
        }
      `}</style>
    </section>
  );
};
