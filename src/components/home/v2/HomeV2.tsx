/**
 * Qitaat Home v2 — restructured per the marketing brief (Apple/IKEA tone:
 * short sentences, one idea per section, no hype, no superlatives).
 */
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBi } from '@/components/common/Bilingual';
import {
  ArrowLeft, ArrowRight, Search, FileText, Building2, Users, HardHat, Compass,
  Layers, Hammer, Plus, Minus, ShieldCheck, Image as ImageIcon,
  CheckCircle2, Activity, MapPin, Send, Scale, Boxes, DoorClosed, Square, Wrench,
} from 'lucide-react';
import heroFacade from '@/assets/home/hero-facade.jpg';
import heroSlide2 from '@/assets/home/hero-slide-2.jpg';
import heroSlide3 from '@/assets/home/hero-slide-3.jpg';
import heroSlide4 from '@/assets/home/hero-slide-4.jpg';
import imgClients from '@/assets/home/audience-clients.jpg';
import imgContractors from '@/assets/home/audience-contractors.jpg';
import imgProviders from '@/assets/home/audience-providers.jpg';

const ROUTES = {
  quote: '/search?intent=quote',
  search: '/search',
  signupProvider: '/auth?mode=signup&role=provider',
  categories: '/categories',
};

const Section: React.FC<React.PropsWithChildren<{ id?: string; className?: string }>> = ({
  id, className = '', children,
}) => (
  <section id={id} className={`py-14 sm:py-20 ${className}`}>
    <div className="container-app">{children}</div>
  </section>
);

const SectionHead: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-14">
    <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl text-foreground tracking-tight leading-tight">
      {title}
    </h2>
    {sub && <p className="font-body text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">{sub}</p>}
  </div>
);

const PrimaryCTA: React.FC<{ to: string; label: string }> = ({ to, label }) => {
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  return (
    <Link to={to}>
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

  const SLIDES = [
    {
      img: heroFacade,
      badgeAr: 'منصة سعودية للصناعات الخفيفة', badgeEn: 'A Saudi platform for light industries',
      titleAr: 'مزودو خدمات الصناعات الخفيفة في مكان واحد',
      titleEn: 'Light-industry service providers in one place',
      subAr: 'ألمنيوم، حديد، خشب، زجاج، وستانلس ستيل. ابحث، قارن، واطلب عرض سعر بخطوات قليلة.',
      subEn: 'Aluminum, iron, wood, glass and stainless steel. Search, compare, and request a quote in a few steps.',
    },
    {
      img: heroSlide2,
      badgeAr: 'واجهات ألمنيوم وزجاج', badgeEn: 'Aluminum & glass facades',
      titleAr: 'واجهات احترافية تلائم مشروعك',
      titleEn: 'Professional facades that fit your project',
      subAr: 'تواصل مع ورش متخصصة في الكيرتن وول والواجهات التجارية.',
      subEn: 'Connect with workshops specialized in curtain walls and commercial facades.',
    },
    {
      img: heroSlide3,
      badgeAr: 'حديد وستانلس ستيل', badgeEn: 'Iron & stainless steel',
      titleAr: 'تصنيع معدني بدقة وموثوقية',
      titleEn: 'Metal fabrication, done with precision',
      subAr: 'مصانع وورش تنفّذ أعمال الحديد والستانلس بمواصفات واضحة.',
      subEn: 'Factories and workshops delivering steel work to clear specs.',
    },
    {
      img: heroSlide4,
      badgeAr: 'نجارة وأعمال خشب', badgeEn: 'Carpentry & wood',
      titleAr: 'مطابخ ودواليب بمقاسات منزلك',
      titleEn: 'Kitchens and built-ins, made to measure',
      subAr: 'احصل على عرض سعر من نجارين موثوقين بقربك.',
      subEn: 'Get a quote from trusted carpenters near you.',
    },
  ];

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, []);

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

  const PrevIcon = isRTL ? ArrowRight : ArrowLeft;
  const NextIcon = isRTL ? ArrowLeft : ArrowRight;
  const slide = SLIDES[active];

  return (
    <section
      className="relative pt-20 pb-14 sm:pt-28 sm:pb-24 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={bi('عرض شرائح قطاعات', 'Qitaat hero slideshow')}
    >
      {/* Soft ambient background (no longer the slideshow) */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-card/40 via-background to-background" />
        <div className="absolute inset-0 bg-gradient-to-tr from-secondary/[0.05] via-transparent to-primary/[0.05]" />
      </div>

      <div className="container-app relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Text column */}
          <div className="lg:col-span-6 text-center lg:text-start">
            <div key={`txt-${active}`} className="animate-fade-in">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border/70 text-xs font-semibold text-secondary mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {bi(slide.badgeAr, slide.badgeEn)}
              </span>
              <h1 className="font-heading font-black text-[2rem] sm:text-5xl md:text-6xl text-foreground leading-[1.12] tracking-tight">
                {bi(slide.titleAr, slide.titleEn)}
              </h1>
              <p className="font-body text-base sm:text-lg text-muted-foreground mt-5 leading-relaxed max-w-xl mx-auto lg:mx-0">
                {bi(slide.subAr, slide.subEn)}
              </p>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3">
              <PrimaryCTA to={ROUTES.quote} label={bi('اطلب عرض سعر', 'Request a quote')} />
              <SecondaryCTA to={ROUTES.signupProvider} label={bi('أضف منشأتك', 'Add your business')} />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-4">
              {bi('ابدأ بطلب واضح، وقارن بين الخيارات قبل أن تختار.', 'Start with a clear request, then compare options before you choose.')}
            </p>

            {/* Slider controls */}
            <div className="mt-7 flex items-center lg:justify-start justify-center gap-4">
              <button
                type="button"
                onClick={goPrev}
                aria-label={bi('الشريحة السابقة', 'Previous slide')}
                className="w-10 h-10 rounded-full border border-border/70 bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-secondary/5 hover:border-secondary/40 transition-colors"
              >
                <PrevIcon className="w-4 h-4 text-foreground" />
              </button>
              <div className="flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={bi(`الانتقال إلى الشريحة ${i + 1}`, `Go to slide ${i + 1}`)}
                    aria-current={i === active}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === active ? 'w-8 bg-secondary' : 'w-2 bg-border hover:bg-muted-foreground/40'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={goNext}
                aria-label={bi('الشريحة التالية', 'Next slide')}
                className="w-10 h-10 rounded-full border border-border/70 bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-secondary/5 hover:border-secondary/40 transition-colors"
              >
                <NextIcon className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* Image card column */}
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[5/4] w-full rounded-2xl overflow-hidden border border-border/60 shadow-2xl bg-card">
              {SLIDES.map((s, i) => (
                <img
                  key={i}
                  src={s.img}
                  alt={bi(s.titleAr, s.titleEn)}
                  width={1920}
                  height={1080}
                  fetchPriority={i === 0 ? 'high' : 'low'}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-out ${
                    i === active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
              {/* gradient + caption overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent pointer-events-none" />
              <div key={`cap-${active}`} className="absolute bottom-0 inset-x-0 p-5 sm:p-6 animate-fade-in">
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white">
                  {bi(slide.badgeAr, slide.badgeEn)}
                </span>
                <p className="text-white font-heading font-bold text-lg sm:text-xl mt-2 leading-snug drop-shadow">
                  {bi(slide.titleAr, slide.titleEn)}
                </p>
              </div>
              {/* Progress bar */}
              <div className="absolute top-0 inset-x-0 h-1 bg-white/15">
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
        </div>

        {/* Sector chips */}
        <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-3xl mx-auto">
          {HERO_CHIPS.map(({ ar, en, slug, icon: Icon }) => (
            <Link
              key={slug}
              to={`/search?category=${slug}`}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-full border border-border/70 bg-card/80 backdrop-blur-sm hover:bg-secondary/5 hover:border-secondary/40 transition-colors text-sm font-medium text-foreground hover-lift"
            >
              <Icon className="w-4 h-4 text-secondary" />
              {bi(ar, en)}
            </Link>
          ))}
        </div>
      </div>

      <style>{`@keyframes qitaat-hero-progress { from { width: 0% } to { width: 100% } }`}</style>
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
    <section className="py-8 sm:py-10 border-y border-border/60 bg-card/50">
      <div className="container-app">
        <p className="text-xs sm:text-sm font-semibold text-muted-foreground text-center mb-4">
          {bi('اختر القطاع وابدأ', 'Pick a sector to start')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_SECTORS.map(({ ar, en, slug, icon: Icon }) => (
            <Link
              key={slug}
              to={`/search?category=${slug}`}
              className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg bg-background border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm text-foreground"
            >
              <Icon className="w-3.5 h-3.5 text-primary" />
              {bi(ar, en)}
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4 max-w-xl mx-auto">
          {bi(
            'قطاعات تساعدك على الوصول إلى مزودين حسب نوع الخدمة والمدينة.',
            'Qitaat helps you reach providers by service type and city.',
          )}
        </p>
      </div>
    </section>
  );
};

export const ProblemSection = () => {
  const bi = useBi();
  const cards = [
    { titleAr: 'بحث متفرق', titleEn: 'Scattered search',
      bodyAr: 'تتنقل بين حسابات، أرقام، وتوصيات غير مكتملة.',
      bodyEn: 'You jump between accounts, numbers and incomplete tips.' },
    { titleAr: 'معلومات غير واضحة', titleEn: 'Unclear information',
      bodyAr: 'لا تعرف دائمًا نوع الخدمة، المدينة، أو الأعمال السابقة.',
      bodyEn: 'You rarely see the service type, city or past work upfront.' },
    { titleAr: 'مقارنة صعبة', titleEn: 'Hard to compare',
      bodyAr: 'العروض والردود تأتي بطرق مختلفة، فتأخذ وقتًا أطول لاتخاذ القرار.',
      bodyEn: 'Quotes arrive in different formats, slowing your decision.' },
  ];
  return (
    <Section>
      <SectionHead
        title={bi('البحث عن مزود مناسب لا يجب أن يكون عشوائيًا', 'Finding the right provider should not be random')}
        sub={bi(
          'عادةً يبدأ البحث بسؤال المعارف، أو تصفح خرائط جوجل، أو مراسلات واتساب متفرقة. النتيجة غالبًا: وقت أطول، معلومات أقل، ومقارنة أصعب.',
          'Most searches start with friends, Google Maps and scattered WhatsApp chats — and end with more time spent and less to compare.',
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((c) => (
          <div key={c.titleEn} className="rounded-xl border border-border/60 bg-card p-6 hover-lift">
            <h3 className="font-heading font-semibold text-lg text-foreground mb-2">{bi(c.titleAr, c.titleEn)}</h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">{bi(c.bodyAr, c.bodyEn)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
};

export const SolutionSection = () => {
  const bi = useBi();
  const items = [
    { icon: Search, titleAr: 'ابحث حسب القطاع', titleEn: 'Search by sector',
      bodyAr: 'ألمنيوم، حديد، خشب، زجاج، ستانلس، وغيرها.', bodyEn: 'Aluminum, iron, wood, glass, stainless and more.' },
    { icon: MapPin, titleAr: 'اختر المدينة', titleEn: 'Choose your city',
      bodyAr: 'ابدأ من المزودين الأقرب أو الأنسب لموقع مشروعك.', bodyEn: 'Start with providers nearest or best suited to your project.' },
    { icon: Send, titleAr: 'أرسل طلبًا واضحًا', titleEn: 'Send a clear request',
      bodyAr: 'أضف التفاصيل والصور والمقاسات إن وجدت.', bodyEn: 'Add details, images and measurements if you have them.' },
    { icon: Scale, titleAr: 'قارن قبل القرار', titleEn: 'Compare before deciding',
      bodyAr: 'راجع الخيارات وتواصل مع المزود الأنسب.', bodyEn: 'Review options and contact the best fit.' },
  ];
  return (
    <Section className="bg-card/40">
      <SectionHead
        title={bi('قطاعات تجعل البداية أوضح', 'Qitaat makes the start clearer')}
        sub={bi(
          'منصة واحدة تساعدك على البحث عن مزودي الخدمة، فهم خياراتك، وطلب عروض سعر بطريقة منظمة.',
          'One place to search for providers, understand your options, and request quotes in an organized way.',
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {items.map(({ icon: Icon, titleAr, titleEn, bodyAr, bodyEn }) => (
          <div key={titleEn} className="rounded-xl border border-border/60 bg-background p-5 hover-lift">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-semibold text-base text-foreground mb-1.5">{bi(titleAr, titleEn)}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{bi(bodyAr, bodyEn)}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-10">
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
    <Section>
      <SectionHead title={bi('3 خطوات تكفي لتبدأ', 'Three steps to get started')} />
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
    { icon: Users, titleAr: 'الأفراد', titleEn: 'Individuals',
      bodyAr: 'لمن يحتاج تنفيذ أعمال ألمنيوم، زجاج، حديد، خشب أو ستانلس.',
      bodyEn: 'For anyone needing aluminum, glass, iron, wood or stainless work.' },
    { icon: HardHat, titleAr: 'المقاولون', titleEn: 'Contractors',
      bodyAr: 'لمن يبحث عن ورش، مصانع، ومزودي تنفيذ لمشاريعه.',
      bodyEn: 'For those sourcing workshops, factories and execution partners.' },
    { icon: Compass, titleAr: 'المكاتب الهندسية', titleEn: 'Engineering offices',
      bodyAr: 'لمن يريد ربط التصميم بمزودي تنفيذ مناسبين.',
      bodyEn: 'To connect designs with the right execution partners.' },
    { icon: Building2, titleAr: 'مزودو الخدمة', titleEn: 'Service providers',
      bodyAr: 'للورش والمصانع والمعارض التي تريد ظهورًا أوضح وفرصًا أكثر.',
      bodyEn: 'For workshops, factories and showrooms seeking clearer visibility.' },
  ];
  return (
    <Section className="bg-card/40">
      <SectionHead title={bi('مصممة لمن يبحث… ولمن يقدم الخدمة', 'Built for buyers — and for providers')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {items.map(({ icon: Icon, titleAr, titleEn, bodyAr, bodyEn }) => (
          <div key={titleEn} className="rounded-xl border border-border/60 bg-background p-5 hover-lift">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-secondary" />
            </div>
            <h3 className="font-heading font-semibold text-base text-foreground mb-1.5">{bi(titleAr, titleEn)}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{bi(bodyAr, bodyEn)}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-10">
        <SecondaryCTA to="/about" label={bi('اختر المسار المناسب لك', 'Choose your path')} />
      </div>
    </Section>
  );
};

export const MainSectorsSection = () => {
  const bi = useBi();
  const sectors = [
    { slug: 'aluminum', icon: Square, accent: 'from-sky-500/15 to-sky-500/0', dot: 'bg-sky-500',
      titleAr: 'ألمنيوم', titleEn: 'Aluminum',
      bodyAr: 'أبواب، شبابيك، واجهات، مطابخ، وقواطع.', bodyEn: 'Doors, windows, facades, kitchens and partitions.' },
    { slug: 'iron', icon: Wrench, accent: 'from-slate-500/15 to-slate-500/0', dot: 'bg-slate-500',
      titleAr: 'حديد', titleEn: 'Iron',
      bodyAr: 'أبواب، سلالم، هياكل، شبك، وأعمال معدنية.', bodyEn: 'Doors, stairs, frames, mesh and metalwork.' },
    { slug: 'wood', icon: DoorClosed, accent: 'from-amber-600/15 to-amber-600/0', dot: 'bg-amber-600',
      titleAr: 'خشب', titleEn: 'Wood',
      bodyAr: 'أبواب، أثاث، ديكور، تفصيل، وتجهيزات داخلية.', bodyEn: 'Doors, furniture, décor, custom work and interiors.' },
    { slug: 'glass', icon: Layers, accent: 'from-cyan-500/15 to-cyan-500/0', dot: 'bg-cyan-500',
      titleAr: 'زجاج', titleEn: 'Glass',
      bodyAr: 'واجهات، سيكوريت، قواطع، أبواب زجاجية، وتركيب.', bodyEn: 'Facades, tempered glass, partitions, doors and install.' },
    { slug: 'stainless', icon: Boxes, accent: 'from-zinc-500/15 to-zinc-500/0', dot: 'bg-zinc-500',
      titleAr: 'ستانلس ستيل', titleEn: 'Stainless steel',
      bodyAr: 'مطاعم، مطابخ، درابزين، تجهيزات، وأعمال خاصة.', bodyEn: 'Restaurants, kitchens, railings, fittings and custom work.' },
    { slug: 'fabrication', icon: Hammer, accent: 'from-emerald-600/15 to-emerald-600/0', dot: 'bg-emerald-600',
      titleAr: 'التصنيع والتركيب', titleEn: 'Fabrication & install',
      bodyAr: 'ورش ومصانع وفرق تنفيذ حسب احتياج المشروع.', bodyEn: 'Workshops, factories and install crews per project.' },
  ];
  return (
    <Section>
      <SectionHead
        title={bi('قطاعات تغطي احتياجات المشاريع اليومية', 'Sectors that cover everyday project needs')}
        sub={bi(
          'من الأعمال الصغيرة إلى المشاريع التجارية، ابدأ من القطاع المناسب.',
          'From small jobs to commercial projects — start from the right sector.',
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {sectors.map((s) => (
          <Link
            key={s.slug}
            to={`/search?category=${s.slug}`}
            className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-6 hover-lift block"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none`} />
            <div className="relative flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-background border border-border/60 flex items-center justify-center shadow-sm">
                <s.icon className="w-5 h-5 text-foreground" />
              </div>
              <span className={`w-2 h-2 rounded-full ${s.dot}`} aria-hidden="true" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
              {bi(s.titleAr, s.titleEn)}
            </h3>
            <p className="relative text-sm text-muted-foreground leading-relaxed">{bi(s.bodyAr, s.bodyEn)}</p>
            <div className="relative mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              {bi('استعرض المزودين', 'Browse providers')}
              <ArrowLeft className="w-3 h-3 rtl:block ltr:hidden" />
              <ArrowRight className="w-3 h-3 ltr:block rtl:hidden" />
            </div>
          </Link>
        ))}
      </div>
      <div className="text-center mt-10">
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
    <Section className="bg-card/40">
      <SectionHead
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
    <Section>
      <SectionHead title={bi('أسئلة قد تساعدك قبل أن تبدأ', 'Questions that might help before you start')} />
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
    <section className="py-16 sm:py-24 bg-secondary text-white">
      <div className="container-app text-center">
        <h2 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl mb-5 leading-tight">
          {bi('ابدأ من المكان الصحيح', 'Start in the right place')}
        </h2>
        <p className="font-body text-base sm:text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
          {bi(
            'سواء كنت تبحث عن مزود خدمة، أو تريد إضافة منشأتك، قطاعات تساعدك على الوصول، الظهور، والمقارنة بطريقة أوضح.',
            'Whether you are looking for a provider or adding your business, Qitaat helps you reach, appear and compare more clearly.',
          )}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to={ROUTES.quote}>
            <Button size="appLg" className="bg-white text-secondary hover:bg-white/90 gap-2 font-semibold">
              {bi('اطلب عرض سعر', 'Request a quote')}
            </Button>
          </Link>
          <Link to={ROUTES.signupProvider}>
            <Button size="appLg" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-secondary gap-2">
              {bi('أضف منشأتك', 'Add your business')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
