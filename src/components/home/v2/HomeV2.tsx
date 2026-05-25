/**
 * Qitaat Home v2 — restructured per the marketing brief (Apple/IKEA tone:
 * short sentences, one idea per section, no hype, no superlatives).
 */
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef, type ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import {
  ArrowLeft, ArrowRight, Search, FileText, Building2, Users, HardHat, Compass,
  Layers, Hammer, Plus, Minus, ShieldCheck, Image as ImageIcon,
  CheckCircle2, Activity, MapPin, Send, Scale, Boxes, DoorClosed, Square, Wrench,
  Play, Pause, Sparkles, TrendingUp, Clock,
} from 'lucide-react';
import { getSearchHistory, addToSearchHistory } from '@/services/search/useSearch';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useAbVariant, trackAbClick } from '@/lib/abTesting';
import heroSlide1 from '@/assets/home/hero-slide-1.webp';
import heroSlide2 from '@/assets/home/hero-slide-2.webp';
import heroSlide3 from '@/assets/home/hero-slide-3.webp';
import heroSlide4 from '@/assets/home/hero-slide-4.webp';
import imgClients from '@/assets/home/audience-clients.webp';
import imgContractors from '@/assets/home/audience-contractors.webp';
import imgProviders from '@/assets/home/audience-providers.webp';
import sectorAluminum from '@/assets/home/sector-aluminum.webp';
import sectorIron from '@/assets/home/sector-iron.webp';
import sectorWood from '@/assets/home/sector-wood.webp';
import sectorGlass from '@/assets/home/sector-glass.webp';
import sectorStainless from '@/assets/home/sector-stainless.webp';
import sectorFabrication from '@/assets/home/sector-fabrication.webp';
import solSearch from '@/assets/home/sol-search.webp';
import solCity from '@/assets/home/sol-city.webp';
import solRequest from '@/assets/home/sol-request.webp';
import solCompare from '@/assets/home/sol-compare.webp';
import probScattered from '@/assets/home/prob-scattered.webp';
import probUnclear from '@/assets/home/prob-unclear.webp';
import probCompare from '@/assets/home/prob-compare.webp';
import whoIndividuals from '@/assets/home/who-individuals.webp';
import whoContractors from '@/assets/home/who-contractors.webp';
import whoEngineers from '@/assets/home/who-engineers.webp';
import whoProviders from '@/assets/home/who-providers.webp';

const ROUTES = {
  quote: '/search?intent=quote',
  search: '/search',
  signupProvider: '/auth?mode=signup&role=provider',
  categories: '/categories',
};

const Section: React.FC<React.PropsWithChildren<{ id?: string; className?: string; ariaLabelledBy?: string }>> = ({
  id, className = '', ariaLabelledBy, children,
}) => (
  <section id={id} aria-labelledby={ariaLabelledBy} className={`py-14 sm:py-20 ${className}`}>
    <div className="container-app">{children}</div>
  </section>
);

const SectionHead: React.FC<{ title: string; sub?: string; headingId?: string }> = ({ title, sub, headingId }) => (
  <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-14">
    <h2 id={headingId} className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-foreground tracking-tight leading-tight scroll-mt-24">
      {title}
    </h2>
    {sub && <p className="font-body text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">{sub}</p>}
  </div>
);

/**
 * Premium section header — eyebrow chip, gradient accent line, large title, supportive subtitle.
 * Use to give important sections a polished, branded cover.
 */
const SectionCover: React.FC<{
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

const SecondaryCTA: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <Link to={to}>
    <Button variant="outline" size="appLg" className="gap-2">{label}</Button>
  </Link>
);

const HERO_CHIPS = [
  { ar: 'ألمنيوم', en: 'Aluminum', slug: 'aluminum', icon: Square },
  { ar: 'حديد', en: 'Iron', slug: 'iron', icon: Wrench },
  { ar: 'خشب', en: 'Wood', slug: 'wood', icon: DoorClosed },
  { ar: 'زجاج', en: 'Glass', slug: 'glass', icon: Layers },
  { ar: 'ستانلس ستيل', en: 'Stainless Steel', slug: 'stainless', icon: Boxes },
  { ar: 'تصنيع وتركيب', en: 'Fabrication & Install', slug: 'fabrication', icon: Hammer },
];

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
                  fetchPriority={i === 0 ? 'high' : 'low'}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
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
                    <img src={s.img} alt={(isRTL ? s.title_ar : s.title_en) || ''} className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
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

const QUICK_SECTORS = [
  ...HERO_CHIPS,
  { ar: 'واجهات ومحلات', en: 'Facades & Shops', slug: 'facades', icon: Building2 },
  { ar: 'تجهيزات مشاريع', en: 'Project Supplies', slug: 'projects', icon: Boxes },
];

export const SectorChipsBar = () => {
  const bi = useBi();
  return (
    <section className="py-10 sm:py-14 border-y border-border/60 bg-gradient-to-b from-card/60 via-background to-card/30">
      <div className="container-app">
        <div className="text-center mb-6 sm:mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wide uppercase mb-3">
            {bi('القطاعات', 'Sectors')}
          </span>
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
            {bi('اختر القطاع وابدأ', 'Pick a sector to start')}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            {bi(
              'قطاعات تساعدك على الوصول إلى مزودين حسب نوع الخدمة والمدينة.',
              'Qitaat helps you reach providers by service type and city.',
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {QUICK_SECTORS.map(({ ar, en, slug, icon: Icon }) => (
            <Link
              key={slug}
              to={`/search?category=${slug}`}
              aria-label={bi(`تصفح قطاع ${ar}`, `Browse ${en} sector`)}
              className="group inline-flex items-center gap-2 ps-3.5 pe-4 h-11 rounded-full bg-card border border-border/70 shadow-sm hover:shadow-md hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-foreground hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="w-3.5 h-3.5" />
              </span>
              {bi(ar, en)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ProblemSection = () => {
  const bi = useBi();
  const cards = [
    { image: probScattered, titleAr: 'بحث متفرق', titleEn: 'Scattered search',
      bodyAr: 'تتنقل بين حسابات، أرقام، وتوصيات غير مكتملة.',
      bodyEn: 'You jump between accounts, numbers and incomplete tips.' },
    { image: probUnclear, titleAr: 'معلومات غير واضحة', titleEn: 'Unclear information',
      bodyAr: 'لا تعرف دائمًا نوع الخدمة، المدينة، أو الأعمال السابقة.',
      bodyEn: 'You rarely see the service type, city or past work upfront.' },
    { image: probCompare, titleAr: 'مقارنة صعبة', titleEn: 'Hard to compare',
      bodyAr: 'العروض والردود تأتي بطرق مختلفة، فتأخذ وقتًا أطول لاتخاذ القرار.',
      bodyEn: 'Quotes arrive in different formats, slowing your decision.' },
  ];
  return (
    <Section id="problem" ariaLabelledBy="problem-heading">
      <SectionHead
        headingId="problem-heading"
        title={bi('اختيار المزوّد المناسب يبدأ من هنا', 'Choosing the right provider starts here')}
        sub={bi(
          'عادةً يبدأ البحث بسؤال المعارف، أو تصفح خرائط جوجل، أو مراسلات واتساب متفرقة. النتيجة غالبًا: وقت أطول، معلومات أقل، ومقارنة أصعب.',
          'Most searches start with friends, Google Maps and scattered WhatsApp chats — and end with more time spent and less to compare.',
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((c) => (
          <div key={c.titleEn} className="group rounded-xl border border-border/60 bg-card overflow-hidden hover-lift">
            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={c.image}
                alt={bi(c.titleAr, c.titleEn)}
                width={1024}
                height={640}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
            </div>
            <div className="p-5 sm:p-6">
              <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{bi(c.titleAr, c.titleEn)}</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">{bi(c.bodyAr, c.bodyEn)}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

export const SolutionSection = () => {
  const bi = useBi();
  const items = [
    { image: solSearch, icon: Search, titleAr: 'ابحث حسب القطاع', titleEn: 'Search by sector',
      bodyAr: 'ألمنيوم، حديد، خشب، زجاج، ستانلس، وغيرها.', bodyEn: 'Aluminum, iron, wood, glass, stainless and more.' },
    { image: solCity, icon: MapPin, titleAr: 'اختر المدينة', titleEn: 'Choose your city',
      bodyAr: 'ابدأ من المزودين الأقرب أو الأنسب لموقع مشروعك.', bodyEn: 'Start with providers nearest or best suited to your project.' },
    { image: solRequest, icon: Send, titleAr: 'أرسل طلبًا واضحًا', titleEn: 'Send a clear request',
      bodyAr: 'أضف التفاصيل والصور والمقاسات إن وجدت.', bodyEn: 'Add details, images and measurements if you have them.' },
    { image: solCompare, icon: Scale, titleAr: 'قارن قبل القرار', titleEn: 'Compare before deciding',
      bodyAr: 'راجع الخيارات وتواصل مع المزود الأنسب.', bodyEn: 'Review options and contact the best fit.' },
  ];
  return (
    <Section id="solution" ariaLabelledBy="solution-heading" className="bg-gradient-to-b from-card/60 via-background to-background">
      <SectionCover
        headingId="solution-heading"
        tone="primary"
        icon={Sparkles}
        eyebrow={bi('كيف نساعدك', 'How we help')}
        title={bi('قطاعات تجعل البداية أوضح', 'Qitaat makes the start clearer')}
        sub={bi(
          'منصة واحدة تساعدك على البحث عن مزودي الخدمة، فهم خياراتك، وطلب عروض سعر بطريقة منظمة.',
          'One place to search for providers, understand your options, and request quotes in an organized way.',
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {items.map(({ image, icon: Icon, titleAr, titleEn, bodyAr, bodyEn }, idx) => (
          <div
            key={titleEn}
            className="group relative rounded-2xl border border-border/60 bg-card hover-lift overflow-hidden"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={image}
                alt={bi(titleAr, titleEn)}
                width={1024}
                height={640}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
              <span className="absolute top-3 end-3 text-[11px] font-semibold text-white/85 tech-content bg-black/30 backdrop-blur-md rounded-full px-2 py-0.5">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="absolute bottom-3 start-3 w-10 h-10 rounded-xl bg-white/95 border border-white/40 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <h3 className="font-heading font-bold text-lg text-foreground mb-2 leading-snug">{bi(titleAr, titleEn)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{bi(bodyAr, bodyEn)}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
      <div className="text-center mt-12">
        <PrimaryCTA to={ROUTES.quote} label={bi('ابدأ طلبك الآن', 'Start your request')} />
      </div>
    </Section>
  );
};

export const HowItWorksV2 = () => {
  const bi = useBi();
  const steps = [
    { n: '01', titleAr: 'حدد ما تحتاجه', titleEn: 'Define what you need',
      bodyAr: 'اختر القطاع، المدينة، ونوع الخدمة.', bodyEn: 'Pick a sector, city and service type.' },
    { n: '02', titleAr: 'أرسل تفاصيل الطلب', titleEn: 'Send your request',
      bodyAr: 'أضف وصف المشروع والصور أو المقاسات إن وجدت.', bodyEn: 'Add a project description, photos or measurements.' },
    { n: '03', titleAr: 'استقبل الخيارات وقارن', titleEn: 'Receive and compare',
      bodyAr: 'راجع الردود وتواصل مع المزود المناسب.', bodyEn: 'Review responses and contact the right provider.' },
  ];
  return (
    <Section id="how-it-works" ariaLabelledBy="how-heading">
      <SectionHead headingId="how-heading" title={bi('3 خطوات تكفي لتبدأ', 'Three steps to get started')} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {steps.map((s) => (
          <div key={s.n} className="relative rounded-2xl border border-border/60 bg-card p-6 sm:p-8 hover-lift">
            <div className="font-heading font-black text-5xl sm:text-6xl text-primary/15 leading-none mb-4 tech-content">
              {s.n}
            </div>
            <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{bi(s.titleAr, s.titleEn)}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{bi(s.bodyAr, s.bodyEn)}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-10">
        <PrimaryCTA to={ROUTES.quote} label={bi('اطلب عرض سعر', 'Request a quote')} />
      </div>
    </Section>
  );
};

export const WhoIsItForSection = () => {
  const bi = useBi();
  const items = [
    { image: whoIndividuals, icon: Users, titleAr: 'الأفراد', titleEn: 'Individuals',
      bodyAr: 'لمن يحتاج تنفيذ أعمال ألمنيوم، زجاج، حديد، خشب أو ستانلس.',
      bodyEn: 'For anyone needing aluminum, glass, iron, wood or stainless work.' },
    { image: whoContractors, icon: HardHat, titleAr: 'المقاولون', titleEn: 'Contractors',
      bodyAr: 'لمن يبحث عن ورش، مصانع، ومزودي تنفيذ لمشاريعه.',
      bodyEn: 'For those sourcing workshops, factories and execution partners.' },
    { image: whoEngineers, icon: Compass, titleAr: 'المكاتب الهندسية', titleEn: 'Engineering offices',
      bodyAr: 'لمن يريد ربط التصميم بمزودي تنفيذ مناسبين.',
      bodyEn: 'To connect designs with the right execution partners.' },
    { image: whoProviders, icon: Building2, titleAr: 'مزودو الخدمة', titleEn: 'Service providers',
      bodyAr: 'للورش والمصانع والمعارض التي تريد ظهورًا أوضح وفرصًا أكثر.',
      bodyEn: 'For workshops, factories and showrooms seeking clearer visibility.' },
  ];
  return (
    <Section id="who" ariaLabelledBy="who-heading" className="bg-card/40">
      <SectionCover
        headingId="who-heading"
        tone="secondary"
        icon={Users}
        eyebrow={bi('لمن قطاعات', 'Who it’s for')}
        title={bi('مصممة لمن يبحث… ولمن يقدم الخدمة', 'Built for buyers — and for providers')}
        sub={bi(
          'سواء تبحث عن خدمة لمشروعك أو تقدمها، تجد ما يناسبك بطريقة منظمة.',
          'Whether you are looking for a service or providing it, find what fits — in an organized way.',
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {items.map(({ image, icon: Icon, titleAr, titleEn, bodyAr, bodyEn }) => (
          <div
            key={titleEn}
            className="group relative rounded-2xl border border-border/60 bg-background hover-lift overflow-hidden"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={image}
                alt={bi(titleAr, titleEn)}
                width={1024}
                height={640}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 start-3 w-10 h-10 rounded-xl bg-white/95 border border-white/40 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5 text-secondary" />
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <h3 className="font-heading font-bold text-lg text-foreground mb-2 leading-snug">{bi(titleAr, titleEn)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{bi(bodyAr, bodyEn)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center mt-12">
        <SecondaryCTA to="/about" label={bi('اختر المسار المناسب لك', 'Choose your path')} />
      </div>
    </Section>
  );
};

type SectorItem = {
  slug: string;
  icon: ComponentType<{ className?: string }>;
  image: string;
  accent: string;
  dot: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

const SectorCard = ({ s, idx }: { s: SectorItem; idx: number }) => {
  const bi = useBi();
  const { ref, isVisible } = useScrollAnimation<HTMLAnchorElement>(0.15);
  return (
    <Link
      ref={ref}
      to={`/search?category=${s.slug}`}
      style={{ transitionDelay: isVisible ? `${Math.min(idx * 70, 280)}ms` : '0ms' }}
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card hover-lift block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 will-change-transform transform-gpu transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {/* Cover image */}
      <div className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={s.image}
          alt={bi(`صورة قطاع ${s.titleAr}`, `${s.titleEn} sector cover`)}
          width={1280}
          height={800}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />
        <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none`} />
        <div className="absolute top-2.5 start-2.5 sm:top-3 sm:start-3 inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[10px] font-semibold uppercase tracking-wider text-white max-w-[60%] truncate">
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
          {bi('قطاع', 'Sector')}
        </div>
        <div className="absolute top-2.5 end-2.5 sm:top-3 sm:end-3 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 border border-white/40 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <s.icon className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
        </div>
        <h3 className="absolute bottom-3 start-3 end-3 sm:start-4 sm:end-4 font-heading font-bold text-lg sm:text-xl md:text-2xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-tight line-clamp-2">
          {bi(s.titleAr, s.titleEn)}
        </h3>
      </div>
      <div className="relative p-4 sm:p-5 md:p-6">
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{bi(s.bodyAr, s.bodyEn)}</p>
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/40 inline-flex items-center gap-1.5 text-xs font-semibold text-primary translate-x-0 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform w-full">
          {bi('استعرض المزودين', 'Browse providers')}
          <ArrowLeft className="w-3 h-3 rtl:block ltr:hidden" />
          <ArrowRight className="w-3 h-3 ltr:block rtl:hidden" />
        </div>
      </div>
    </Link>
  );
};

export const MainSectorsSection = () => {
  const bi = useBi();
  const sectors: SectorItem[] = [
    { slug: 'aluminum', icon: Square, image: sectorAluminum, accent: 'from-sky-500/15 to-sky-500/0', dot: 'bg-sky-500',
      titleAr: 'ألمنيوم', titleEn: 'Aluminum',
      bodyAr: 'أبواب، شبابيك، واجهات، مطابخ، وقواطع.', bodyEn: 'Doors, windows, facades, kitchens and partitions.' },
    { slug: 'iron', icon: Wrench, image: sectorIron, accent: 'from-slate-500/15 to-slate-500/0', dot: 'bg-slate-500',
      titleAr: 'حديد', titleEn: 'Iron',
      bodyAr: 'أبواب، سلالم، هياكل، شبك، وأعمال معدنية.', bodyEn: 'Doors, stairs, frames, mesh and metalwork.' },
    { slug: 'wood', icon: DoorClosed, image: sectorWood, accent: 'from-amber-600/15 to-amber-600/0', dot: 'bg-amber-600',
      titleAr: 'خشب', titleEn: 'Wood',
      bodyAr: 'أبواب، أثاث، ديكور، تفصيل، وتجهيزات داخلية.', bodyEn: 'Doors, furniture, décor, custom work and interiors.' },
    { slug: 'glass', icon: Layers, image: sectorGlass, accent: 'from-cyan-500/15 to-cyan-500/0', dot: 'bg-cyan-500',
      titleAr: 'زجاج', titleEn: 'Glass',
      bodyAr: 'واجهات، سيكوريت، قواطع، أبواب زجاجية، وتركيب.', bodyEn: 'Facades, tempered glass, partitions, doors and install.' },
    { slug: 'stainless', icon: Boxes, image: sectorStainless, accent: 'from-zinc-500/15 to-zinc-500/0', dot: 'bg-zinc-500',
      titleAr: 'ستانلس ستيل', titleEn: 'Stainless steel',
      bodyAr: 'مطاعم، مطابخ، درابزين، تجهيزات، وأعمال خاصة.', bodyEn: 'Restaurants, kitchens, railings, fittings and custom work.' },
    { slug: 'fabrication', icon: Hammer, image: sectorFabrication, accent: 'from-emerald-600/15 to-emerald-600/0', dot: 'bg-emerald-600',
      titleAr: 'التصنيع والتركيب', titleEn: 'Fabrication & install',
      bodyAr: 'ورش ومصانع وفرق تنفيذ حسب احتياج المشروع.', bodyEn: 'Workshops, factories and install crews per project.' },
  ];
  return (
    <Section id="sectors" ariaLabelledBy="sectors-heading">
      <SectionCover
        headingId="sectors-heading"
        tone="primary"
        icon={Layers}
        eyebrow={bi('القطاعات الرئيسية', 'Main sectors')}
        title={bi('قطاعات تغطي احتياجات المشاريع اليومية', 'Sectors that cover everyday project needs')}
        sub={bi(
          'من الأعمال الصغيرة إلى المشاريع التجارية، ابدأ من القطاع المناسب.',
          'From small jobs to commercial projects — start from the right sector.',
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        {sectors.map((s, idx) => (
          <SectorCard key={s.slug} s={s} idx={idx} />
        ))}
      </div>
      <div className="text-center mt-12">
        <SecondaryCTA to={ROUTES.categories} label={bi('استكشف كل القطاعات', 'Explore all sectors')} />
      </div>
    </Section>
  );
};

const AudienceBlock: React.FC<{
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

export const ForClientsSection = () => {
  const bi = useBi();
  return (
    <AudienceBlock
      image={imgClients}
      imageAlt={bi('منزل عصري بأبواب زجاجية ألمنيوم وخزائن خشبية', 'Modern home with aluminum glass doors and wooden cabinetry')}
      badge={bi('للعملاء', 'For clients')}
      title={bi('لديك مشروع وتحتاج مزود خدمة؟', 'Have a project and need a provider?')}
      body={bi(
        'اكتب ما تحتاجه بوضوح، وأرسل طلبك لمزودين مناسبين حسب القطاع والمدينة. بدل أن تبدأ من الصفر، ابدأ من مكان يجمع لك الخيارات.',
        'Describe what you need, then send it to providers by sector and city. Start from a place that gathers your options.',
      )}
      bullets={[
        bi('مناسب للأفراد والشركات', 'For individuals and companies'),
        bi('طلبات أوضح للمزودين', 'Clearer requests for providers'),
        bi('خيارات متعددة للمقارنة', 'Multiple options to compare'),
        bi('توفير وقت البحث', 'Less time spent searching'),
      ]}
      cta={{ to: ROUTES.quote, label: bi('اطلب عرض سعر الآن', 'Request a quote') }}
      tone="primary"
    />
  );
};

export const ForContractorsSection = () => {
  const bi = useBi();
  return (
    <AudienceBlock
      reverse
      image={imgContractors}
      imageAlt={bi('مخططات وعينات مقاطع ألمنيوم وخوذة على طاولة عمل', 'Plans, aluminum profile samples and a hard hat on a workbench')}
      badge={bi('للمقاولين والمكاتب الهندسية', 'For contractors & firms')}
      title={bi('وسّع شبكة مزوديك', 'Expand your provider network')}
      body={bi(
        'قطاعات تساعد المقاولين والمكاتب الهندسية على الوصول إلى ورش ومصانع ومزودي تنفيذ في قطاعات متعددة، لتسهيل البحث والمقارنة قبل اختيار الشريك المناسب للمشروع.',
        'Reach workshops, factories and execution partners across multiple sectors — to compare before picking the right partner.',
      )}
      bullets={[
        bi('مزودون حسب القطاع', 'Providers by sector'),
        bi('بحث حسب المدينة', 'Search by city'),
        bi('مناسب للمشاريع المتكررة', 'Works for recurring projects'),
        bi('بداية منظمة قبل التواصل', 'An organized start before outreach'),
      ]}
      cta={{ to: ROUTES.search, label: bi('ابحث عن مزودين', 'Find providers') }}
      tone="secondary"
    />
  );
};

export const ForProvidersSection = () => {
  const bi = useBi();
  return (
    <AudienceBlock
      image={imgProviders}
      imageAlt={bi('ورشة تصنيع ألمنيوم وحديد منظمة بإضاءة طبيعية', 'Organized aluminum and steel fabrication workshop with natural light')}
      badge={bi('لمزودي الخدمة', 'For service providers')}
      title={bi('اجعل منشأتك أسهل في الوصول', 'Make your business easier to find')}
      body={bi(
        'إذا كنت صاحب ورشة، مصنع، معرض، أو فريق تنفيذ، أنشئ ملفك في قطاعات ليعرف العملاء ماذا تقدم، أين تعمل، وكيف يمكنهم طلب خدماتك.',
        'Workshop, factory, showroom or install team — create your profile so clients know what you offer, where, and how to reach you.',
      )}
      bullets={[
        bi('ملف واضح لمنشأتك', 'A clear profile for your business'),
        bi('عرض الخدمات والصور', 'Show services and images'),
        bi('ظهور للعملاء والمقاولين', 'Visibility to clients and contractors'),
        bi('استقبال طلبات أكثر تنظيمًا', 'Receive more organized requests'),
      ]}
      cta={{ to: ROUTES.signupProvider, label: bi('أضف منشأتك', 'Add your business') }}
      small={bi('من يبحث عن خدماتك يجب أن يجدك بسهولة.', 'People looking for your services should find you easily.')}
      tone="accent"
    />
  );
};

export const TrustSection = () => {
  const bi = useBi();
  const badges = [
    { icon: CheckCircle2, titleAr: 'بيانات مكتملة', titleEn: 'Complete profile',
      bodyAr: 'المزود أضاف معلوماته الأساسية وخدماته.', bodyEn: 'The provider added core info and services.' },
    { icon: ImageIcon, titleAr: 'صور أعمال مضافة', titleEn: 'Work samples added',
      bodyAr: 'المزود أضاف نماذج من أعماله.', bodyEn: 'The provider uploaded samples of past work.' },
    { icon: ShieldCheck, titleAr: 'تمت مراجعة البيانات', titleEn: 'Reviewed details',
      bodyAr: 'تمت مراجعة اكتمال ووضوح البيانات.', bodyEn: 'Profile completeness and clarity were reviewed.' },
    { icon: Activity, titleAr: 'مزود نشط', titleEn: 'Active provider',
      bodyAr: 'المزود يتابع حسابه وطلباته.', bodyEn: 'The provider keeps their account and requests up to date.' },
  ];
  return (
    <Section id="trust" ariaLabelledBy="trust-heading" className="bg-card/40">
      <SectionHead
        headingId="trust-heading"
        title={bi('معلومات أوضح. قرار أسهل.', 'Clearer info. Easier decisions.')}
        sub={bi(
          'نساعد على عرض بيانات مزودي الخدمة بطريقة منظمة، حتى يعرف العميل نوع النشاط، الخدمات، المدينة، نطاق العمل، وصور الأعمال قبل التواصل.',
          'We present provider details in an organized way, so clients see the activity, services, city, scope and work samples before reaching out.',
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {badges.map(({ icon: Icon, titleAr, titleEn, bodyAr, bodyEn }) => (
          <div key={titleEn} className="rounded-xl border border-border/60 bg-background p-5 hover-lift">
            <Icon className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-heading font-semibold text-sm text-foreground mb-1.5">{bi(titleAr, titleEn)}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{bi(bodyAr, bodyEn)}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 max-w-3xl mx-auto rounded-xl border border-border/60 bg-background p-5 sm:p-6 flex items-start gap-3">
        <FileText className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm text-foreground leading-relaxed">
          {bi(
            'قطاعات تساعدك على البحث والمقارنة وطلب عروض الأسعار. الاتفاق النهائي وجودة التنفيذ يتمان بين العميل ومزود الخدمة.',
            'Qitaat helps with search, comparison and quote requests. The final agreement and execution quality are between the client and the provider.',
          )}
        </p>
      </div>
    </Section>
  );
};

export const FAQ_ITEMS_BI = [
  { qAr: 'ما هي قطاعات؟', qEn: 'What is Qitaat?',
    aAr: 'منصة تساعدك على الوصول إلى مزودي خدمات الصناعات الخفيفة وطلب عروض أسعار بطريقة منظمة.',
    aEn: 'A platform that helps you reach light-industry service providers and request quotes in an organized way.' },
  { qAr: 'هل قطاعات تنفذ الأعمال؟', qEn: 'Does Qitaat execute the work?',
    aAr: 'لا. قطاعات تساعد على الربط بين العميل ومزودي الخدمة، ولا تنفذ الأعمال مباشرة.',
    aEn: 'No. Qitaat connects clients with providers and does not execute work directly.' },
  { qAr: 'كيف أطلب عرض سعر؟', qEn: 'How do I request a quote?',
    aAr: 'اختر القطاع، أضف تفاصيل مشروعك، ثم أرسل الطلب للمزودين المناسبين.',
    aEn: 'Pick a sector, add your project details, then send the request to suitable providers.' },
  { qAr: 'هل يمكن للمزودين التسجيل؟', qEn: 'Can providers register?',
    aAr: 'نعم. يمكن للورش والمصانع والمعارض وفرق التنفيذ إنشاء ملف لعرض خدماتهم.',
    aEn: 'Yes. Workshops, factories, showrooms and install teams can create a profile.' },
  { qAr: 'هل المنصة مناسبة للمقاولين؟', qEn: 'Is the platform good for contractors?',
    aAr: 'نعم. تساعد المقاولين على الوصول إلى مزودي تنفيذ حسب القطاع والمدينة.',
    aEn: 'Yes. It helps contractors find execution partners by sector and city.' },
];

export const FAQSection = () => {
  const bi = useBi();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" ariaLabelledBy="faq-heading">
      <SectionHead headingId="faq-heading" title={bi('أسئلة قد تساعدك قبل أن تبدأ', 'Questions that might help before you start')} />
      <div className="max-w-2xl mx-auto space-y-3">
        {FAQ_ITEMS_BI.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.qEn} className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-start hover:bg-secondary/5 transition-colors"
              >
                <span className="font-heading font-semibold text-sm sm:text-base text-foreground">
                  {bi(item.qAr, item.qEn)}
                </span>
                {isOpen ? <Minus className="w-4 h-4 text-primary shrink-0" /> : <Plus className="w-4 h-4 text-primary shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">
                  {bi(item.aAr, item.aEn)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-center mt-8">
        <SecondaryCTA to="/about#faq" label={bi('عرض كل الأسئلة', 'View all questions')} />
      </div>
    </Section>
  );
};

export const FinalCTASection = () => {
  const bi = useBi();
  return (
    <section className="py-14 sm:py-20">
      <div className="container-app">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-secondary to-primary text-white shadow-2xl">
          {/* decorative pattern */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
          <div aria-hidden="true" className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-24 -start-24 w-72 h-72 rounded-full bg-primary/30 blur-3xl" />

          <div className="relative px-6 sm:px-12 py-14 sm:py-20 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {bi('ابدأ الآن', 'Get started')}
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-5 leading-[1.1] tracking-tight">
              {bi('ابدأ من المكان الصحيح', 'Start in the right place')}
            </h2>
            <p className="font-body text-base sm:text-lg md:text-xl text-white/85 max-w-2xl mx-auto mb-9 leading-relaxed">
              {bi(
                'سواء كنت تبحث عن مزود خدمة، أو تريد إضافة منشأتك، قطاعات تساعدك على الوصول، الظهور، والمقارنة بطريقة أوضح.',
                'Whether you are looking for a provider or adding your business, Qitaat helps you reach, appear and compare more clearly.',
              )}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to={ROUTES.quote}>
                <Button size="appLg" className="bg-white text-secondary hover:bg-white/90 gap-2 font-semibold shadow-xl">
                  {bi('اطلب عرض سعر', 'Request a quote')}
                </Button>
              </Link>
              <Link to={ROUTES.signupProvider}>
                <Button size="appLg" variant="outline" className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white hover:text-secondary gap-2">
                  {bi('أضف منشأتك', 'Add your business')}
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] sm:text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> {bi('مزودون موثّقون', 'Verified providers')}</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-sky-300" /> {bi('تغطية المملكة', 'Saudi-wide coverage')}</span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-amber-300" /> {bi('بدون عمولة على العميل', 'No fees for customers')}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
