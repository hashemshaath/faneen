import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import {
  Star, ArrowLeft, ArrowRight, CheckCircle2, XCircle, Sparkles,
  TrendingUp, ShieldCheck, Zap, Clock, Award, BadgeCheck,
  Factory, Store, Quote, HardHat, Truck, Compass, Settings2, Layers3,
  Calculator, Gift, PlayCircle, Rocket, Users, FileText, Briefcase,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import {
  fetchLandingContent, fetchLandingFeatures, fetchLandingFaq,
  fetchLandingTestimonials, fetchLandingSettings, type LandingContent,
} from '@/services/providerLandingService';
import { supabase } from '@/integrations/supabase/client';
import { ScrollToTop } from '@/components/ScrollToTop';
import { HeroParticles } from '@/components/home/HeroParticles';
import { track as gtmTrack } from '@/lib/analytics-events';
import { useCountUp } from '@/hooks/useCountUp';
import heroImage from '@/assets/providers-hero-construction.jpg';
import whyImage from '@/assets/providers-why-factory.jpg';
import howImage from '@/assets/providers-how-dashboard.jpg';
import ctaImage from '@/assets/providers-cta-handshake.jpg';

const SHOWCASE_IMAGES = [
  { src: heroImage,  ar: 'مشاريع البناء الكبرى',     en: 'Major construction projects' },
  { src: whyImage,   ar: 'مصانع الصناعات الخفيفة',   en: 'Light-industry factories' },
  { src: howImage,   ar: 'إدارة رقمية احترافية',     en: 'Professional digital management' },
  { src: ctaImage,   ar: 'شراكات وعقود نظامية',     en: 'Partnerships & formal contracts' },
];

const pickIcon = (name: string): React.ComponentType<{ className?: string }> => {
  const Lib = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return Lib[name] ?? Lib.Sparkles;
};

const AUDIENCES = [
  { key: 'factories',   icon: Factory,  ar: 'مصانع',          en: 'Factories',         desc_ar: 'اعرض خطوط الإنتاج والمواصفات الفنية، واستقبل طلبات المقاولين والاستشاريين والمشاريع الكبرى مباشرة.', desc_en: 'Showcase production lines and specs; receive direct demand from contractors, consultants and large projects.' },
  { key: 'contractors', icon: HardHat,  ar: 'مقاولون',        en: 'Contractors',       desc_ar: 'ابنِ ملفًا تنفيذيًا موثّقًا بالخبرات والمشاريع، وشارك في عروض الأسعار وفرص التنفيذ المناسبة لتخصصك.', desc_en: 'Build a verified execution profile, join RFQs and unlock projects that match your scope.' },
  { key: 'suppliers',   icon: Truck,    ar: 'موردون',         en: 'Suppliers',         desc_ar: 'صنّف منتجاتك وعلاماتك التجارية، واستقبل طلبات توريد منظّمة (RFQ) من مقاولين ومشاريع جاهزة للشراء.', desc_en: 'Classify products and brands; receive structured RFQs from contractors ready to purchase.' },
  { key: 'showrooms',   icon: Store,    ar: 'معارض',          en: 'Showrooms',         desc_ar: 'اعرض الكتالوجات والأنظمة بصور احترافية، واربط منتجاتك بالعلامات التجارية لطلبات تسعير فورية.', desc_en: 'Display catalogs and systems with rich media; link products to brands for instant quote requests.' },
  { key: 'engineering', icon: Compass,  ar: 'مكاتب هندسية',   en: 'Engineering Offices', desc_ar: 'كن جزءًا من منظومة البناء: استشارات، تصاميم، ومواصفات يصل إليها المطورون والمقاولون والمصانع.', desc_en: 'Position your office inside the construction ecosystem — reachable by developers, contractors and factories.' },
  { key: 'install',     icon: Settings2,ar: 'تركيب وصيانة',   en: 'Install & Maintenance', desc_ar: 'استقبل طلبات التركيب والصيانة والتشطيب حسب القطاع والمدينة، بتسعير وعقود واضحة.', desc_en: 'Receive installation, maintenance and finishing requests by sector and city, with clear quotes and contracts.' },
  { key: 'developers',  icon: Layers3,  ar: 'مطورون عقاريون', en: 'Real-estate Developers', desc_ar: 'أدر منظومة الموردين والمقاولين على مشاريعك، مع عروض أسعار وعقود وفواتير منظّمة في مكان واحد.', desc_en: 'Manage your supplier and contractor ecosystem with RFQs, structured contracts and invoices in one place.' },
];

const SECTORS = [
  { slug: 'aluminum', ar: 'الألمنيوم', en: 'Aluminum', icon: 'Square' },
  { slug: 'steel', ar: 'الحديد', en: 'Steel', icon: 'Hammer' },
  { slug: 'glass', ar: 'الزجاج', en: 'Glass', icon: 'PanelTop' },
  { slug: 'wood', ar: 'الخشب', en: 'Wood', icon: 'TreePine' },
  { slug: 'kitchens', ar: 'المطابخ', en: 'Kitchens', icon: 'ChefHat' },
  { slug: 'decor', ar: 'الديكورات', en: 'Decor', icon: 'Palette' },
  { slug: 'blacksmith', ar: 'الحدادة الفنية', en: 'Blacksmithing', icon: 'Wrench' },
];

const STEPS = [
  { ar: 'أنشئ الحساب', en: 'Create Account', desc_ar: 'تسجيل سريع بالبريد أو جوجل خلال دقيقة، بدون رسوم اشتراك مبدئية.', desc_en: 'Quick email or Google signup in under a minute — no upfront fees.' },
  { ar: 'ابنِ ملف الجهة', en: 'Build Your Profile', desc_ar: 'البيانات النظامية، الفروع، ساعات العمل، التخصصات، والعلامات التجارية.', desc_en: 'Legal details, branches, hours, specializations and brand affiliations.' },
  { ar: 'صنّف خدماتك ومنتجاتك', en: 'Classify Services & Products', desc_ar: 'اربط جهتك بالقطاعات والخدمات الدقيقة لتظهر في النتائج المناسبة فقط.', desc_en: 'Link your business to precise sectors and services to appear in the right results only.' },
  { ar: 'استقبل الطلبات وعروض الأسعار', en: 'Receive Requests & RFQs', desc_ar: 'محادثات منظمة، طلبات تسعير، عقود ضريبية، وفواتير ودفعات قابلة للتتبع.', desc_en: 'Structured chats, RFQs, VAT contracts, and trackable invoices and payments.' },
];

const VALUE_PILLARS = [
  { icon: TrendingUp,  ar: 'ظهور مهني',       en: 'Professional Visibility', desc_ar: 'ملف جهتك قابل للبحث والتصنيف والمقارنة في سوق البناء والتشييد.', desc_en: 'A profile that is searchable, classifiable and comparable inside the construction market.' },
  { icon: ShieldCheck, ar: 'ثقة موثّقة',       en: 'Verified Trust',          desc_ar: 'حسابات موثّقة، مراجعة من فريق المنصة، وشارات تعكس مصداقية الجهة.', desc_en: 'Verified accounts, platform review, and badges that reflect real credibility.' },
  { icon: Zap,         ar: 'أدوات تشغيلية',    en: 'Operational Tools',        desc_ar: 'إدارة طلبات، عروض أسعار، عقود VAT، قياسات، فواتير، ودفعات منظمة.', desc_en: 'Requests, RFQs, VAT contracts, measurements, invoices and structured payments.' },
  { icon: Award,       ar: 'فرص مستهدفة',     en: 'Targeted Opportunities',   desc_ar: 'وصول لطلبات وعروض أسعار تتوافق مع تخصصك، قطاعك، ومنطقة عملك.', desc_en: 'Reach requests and RFQs aligned with your specialty, sector and service area.' },
];

const COMPARISON = [
  { ar: 'ملف مهني قابل للتصنيف والمقارنة',     en: 'Classifiable, comparable profile',       without: false, withQ: true },
  { ar: 'استقبال طلبات وعروض أسعار منظّمة',   en: 'Structured requests & RFQs',             without: false, withQ: true },
  { ar: 'عقود نظامية بضريبة القيمة المضافة',  en: 'VAT-compliant formal contracts',         without: false, withQ: true },
  { ar: 'ربط العلامات التجارية بالمنتجات',     en: 'Link brands to products & catalogs',     without: false, withQ: true },
  { ar: 'ظهور في نتائج البحث وصفحات القطاع', en: 'Visibility in search & sector pages',    without: false, withQ: true },
  { ar: 'بدون عمولة على المشاريع',             en: 'No commission on awarded projects',      without: false, withQ: true },
];

const ONBOARDING_CHECKLIST = [
  { ar: 'تفعيل البريد وإكمال البيانات النظامية', en: 'Verify email & complete legal details', mins: 3 },
  { ar: 'رفع شعار الجهة وصور المعرض/المصنع',     en: 'Upload logo & showroom/factory photos',  mins: 4 },
  { ar: 'تصنيف الخدمات والمنتجات بدقة',          en: 'Classify services & products precisely', mins: 6 },
  { ar: 'ربط العلامات التجارية والكتالوجات',     en: 'Link brands & product catalogs',         mins: 5 },
  { ar: 'تفعيل استقبال طلبات التسعير (RFQ)',     en: 'Enable RFQ inbox',                       mins: 1 },
  { ar: 'نشر الملف ومشاركة الرابط الاحترافي',    en: 'Publish profile & share your pro link',  mins: 1 },
];

/** Animated number that counts up when scrolled into view. */
function AnimatedNumber({ value, suffix = '+' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [start, setStart] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || start) return;
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) { setStart(true); io.disconnect(); } },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [start]);
  const display = useCountUp(value, start, 1600, suffix);
  return <span ref={ref} className="tech-content">{display}</span>;
}

/** Sticky bottom CTA bar — appears after the user scrolls past the hero. */
function StickyCtaBar({ isRTL, onClick }: { isRTL: boolean; onClick: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 720);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
      role="region"
      aria-label={isRTL ? 'تسجيل سريع' : 'Quick signup'}
    >
      <div className="mx-auto max-w-5xl m-3 md:m-4 rounded-2xl border border-border/50 bg-card/95 backdrop-blur shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="hidden sm:grid w-10 h-10 rounded-xl bg-primary/10 text-primary place-items-center shrink-0">
          <Rocket className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {isRTL ? 'جاهز للظهور أمام مشاريع البناء؟' : 'Ready to be visible to construction projects?'}
          </div>
          <div className="text-[11px] md:text-xs text-muted-foreground truncate">
            {isRTL ? 'تسجيل مجاني — بدون عمولة على المشاريع' : 'Free signup — zero project commission'}
          </div>
        </div>
        <Button asChild size="sm" className="h-10 px-4 shrink-0" onClick={onClick}>
          <Link to="/auth?mode=signup&role=provider">
            {isRTL ? 'سجّل الآن' : 'Sign up'}
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Interactive ROI calculator (illustrative — not a binding promise). */
function RoiCalculator({ isRTL }: { isRTL: boolean }) {
  const [rfqs, setRfqs] = useState(20);     // monthly RFQs received
  const [winRate, setWinRate] = useState(15); // %
  const [avg, setAvg] = useState(12000);    // SAR per project

  const wonPerMonth = Math.round((rfqs * winRate) / 100);
  const monthlyRevenue = wonPerMonth * avg;
  const yearlyRevenue = monthlyRevenue * 12;

  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <Card className="p-5 md:p-8 border-border/50 shadow-sm">
      <div className="grid lg:grid-cols-[1fr_1px_1fr] gap-6 lg:gap-10 items-stretch">
        {/* Inputs */}
        <div className="space-y-5">
          {[
            { label: isRTL ? 'طلبات تسعير شهرية' : 'Monthly RFQs', value: rfqs, min: 5, max: 200, step: 5, set: setRfqs, suffix: '' },
            { label: isRTL ? 'نسبة الفوز بالعروض' : 'Win rate',    value: winRate, min: 5, max: 60, step: 1, set: setWinRate, suffix: '%' },
            { label: isRTL ? 'متوسط قيمة المشروع' : 'Avg. project value', value: avg, min: 1000, max: 200000, step: 500, set: setAvg, suffix: ' SAR' },
          ].map((f, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-medium">{f.label}</span>
                <span className="tech-content font-semibold text-primary">{fmt(f.value)}{f.suffix}</span>
              </div>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={f.value}
                onChange={(e) => f.set(Number(e.target.value))}
                className="w-full h-2 rounded-full bg-muted accent-primary cursor-pointer"
                aria-label={f.label}
              />
            </div>
          ))}
        </div>
        <div className="hidden lg:block bg-border/60" />
        {/* Outputs */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 md:p-6 border border-primary/20">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            {isRTL ? 'تقدير شهري' : 'Estimated monthly'}
          </div>
          <div className="text-4xl md:text-5xl font-bold text-foreground tech-content mb-1">{fmt(monthlyRevenue)} <span className="text-base text-muted-foreground">SAR</span></div>
          <div className="text-sm text-muted-foreground mb-5">
            {isRTL ? `≈ ${wonPerMonth} مشاريع شهرياً` : `≈ ${wonPerMonth} projects/month`}
          </div>
          <div className="pt-4 border-t border-border/40 flex items-end justify-between">
            <div>
              <div className="text-xs text-muted-foreground">{isRTL ? 'سنوياً' : 'Yearly'}</div>
              <div className="text-xl font-bold tech-content">{fmt(yearlyRevenue)} SAR</div>
            </div>
            <Button asChild size="sm" className="h-10">
              <Link to="/auth?mode=signup&role=provider">
                {isRTL ? 'ابدأ الآن' : 'Get started'}
              </Link>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
            {isRTL ? '* أرقام إرشادية للتوضيح فقط — تختلف النتائج حسب القطاع والتخصص ومنطقة العمل.' : '* Illustrative numbers only — actual results vary by sector, specialty and service area.'}
          </p>
        </div>
      </div>
    </Card>
  );
}


const ForProviders = () => {
  const { isRTL } = useLanguage();
  const { track } = useLandingTracking(true);
  const [audience, setAudience] = useState<string>('factories');

  const { data: settings } = useQuery({ queryKey: ['plp_settings'], queryFn: fetchLandingSettings });
  const { data: content = [] } = useQuery({ queryKey: ['plp_content'], queryFn: fetchLandingContent });
  const { data: features = [] } = useQuery({ queryKey: ['plp_features'], queryFn: fetchLandingFeatures });
  const { data: faq = [] } = useQuery({ queryKey: ['plp_faq'], queryFn: fetchLandingFaq });
  const { data: testimonials = [] } = useQuery({ queryKey: ['plp_testimonials'], queryFn: fetchLandingTestimonials });
  const { data: stats } = useQuery({
    queryKey: ['plp_home_stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_home_stats');
      return data as { businessCount: number; reviewCount: number; projectCount: number; satisfaction: number } | null;
    },
  });

  const sectionMap = useMemo(() => {
    const m = new Map<string, LandingContent>();
    for (const c of content) m.set(c.section_key, c);
    return m;
  }, [content]);

  const hero = sectionMap.get('hero');
  const why = sectionMap.get('why');
  const how = sectionMap.get('how');
  const finalCta = sectionMap.get('cta_final');

  const pick = (ar: string | null | undefined, en: string | null | undefined) =>
    (isRTL ? ar : en) || ar || en || '';

  const seoTitle = pick(settings?.seo_title_ar, settings?.seo_title_en) ||
    (isRTL
      ? 'سجّل جهتك في قِطاعات — منصة قطاع البناء والتشييد والصناعات الخفيفة'
      : 'Register on Qitaat — Construction, Supply & Light Industry Platform');
  const seoDesc = pick(settings?.seo_desc_ar, settings?.seo_desc_en) ||
    (isRTL
      ? 'منصة شاملة لجميع جهات قطاع البناء والتشييد والصناعات الخفيفة — ملف مهني قابل للتصنيف، طلبات منظّمة، عروض أسعار، وعقود نظامية تربط جهتك بمشاريع حقيقية.'
      : 'A comprehensive platform for every business in construction and light industry — classifiable profiles, structured requests, RFQs, and compliant contracts that connect you to real projects.');

  usePageMeta({
    title: seoTitle,
    description: seoDesc,
    keywords: settings?.keywords ?? undefined,
    canonical: 'https://qitaat.com/for-providers',
    ogType: 'website',
    ogImage: settings?.og_image_url ?? undefined,
  });

  useMultiJsonLd(useMemo(() => {
    const blocks: Record<string, unknown>[] = [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: seoTitle, description: seoDesc, url: 'https://qitaat.com/for-providers', inLanguage: isRTL ? 'ar' : 'en' },
      {
        '@context': 'https://schema.org', '@type': 'Service',
        name: isRTL ? 'منصة قِطاعات لقطاع البناء والصناعات الخفيفة' : 'Qitaat Platform for Construction & Light Industry',
        description: seoDesc,
        provider: { '@type': 'Organization', name: 'Qitaat قِطاعات', url: 'https://qitaat.com' },
        serviceType: isRTL ? 'منصة دليل أعمال صناعية' : 'Industrial Business Directory',
        areaServed: ['Saudi Arabia','United Arab Emirates','Kuwait','Bahrain','Qatar','Oman'].map(n => ({ '@type': 'Country', name: n })),
        offers: { '@type': 'AggregateOffer', priceCurrency: 'SAR', lowPrice: '0', highPrice: '299', offerCount: 3 },
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isRTL ? 'الرئيسية' : 'Home', item: 'https://qitaat.com/' },
          { '@type': 'ListItem', position: 2, name: isRTL ? 'لمزودي الخدمات' : 'For Providers', item: 'https://qitaat.com/for-providers' },
        ],
      },
    ];
    if (faq.length > 0) {
      blocks.push({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faq.map((q) => ({
          '@type': 'Question',
          name: pick(q.question_ar, q.question_en),
          acceptedAnswer: { '@type': 'Answer', text: pick(q.answer_ar, q.answer_en) },
        })),
      });
    }
    return blocks;
  }, [seoTitle, seoDesc, isRTL, faq])); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!settings) return;
    if (settings.gsc_verification) {
      let m = document.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement | null;
      if (!m) { m = document.createElement('meta'); m.name = 'google-site-verification'; document.head.appendChild(m); }
      m.content = settings.gsc_verification;
    }
    // GA4 is loaded via Google Tag Manager (GTM-NHPQ2R52) configured in index.html.
    // Do not inject gtag.js directly here — keep GTM as the single marketing tag.
  }, [settings]);

  const ArrowFwd = isRTL ? ArrowLeft : ArrowRight;
  const activeAudience = AUDIENCES.find(a => a.key === audience) ?? AUDIENCES[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-10 pb-14 md:pt-20 md:pb-24">
        <HeroParticles />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-5xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1.5 text-xs font-medium gap-1.5 inline-flex items-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {isRTL ? 'منصة قطاع البناء والتشييد والصناعات الخفيفة' : 'Construction, Supply & Light Industry Platform'}
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12] mb-5 bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              {pick(hero?.title_ar, hero?.title_en) || (isRTL
                ? 'حوّل جهتك إلى ملف مهني داخل سوق البناء والتشييد'
                : 'Turn your business into a professional profile inside the construction market')}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-7 max-w-2xl mx-auto leading-relaxed">
              {pick(hero?.subtitle_ar, hero?.subtitle_en) || (isRTL
                ? 'منصة شاملة لجميع جهات قطاع البناء والتشييد والصناعات الخفيفة — سجّل جهتك واحصل على ظهور قابل للبحث والتصنيف، واستقبل طلبات وعروض أسعار حقيقية.'
                : 'A comprehensive platform for every business in construction and light industry — register, get searchable visibility, and receive real requests and RFQs.')}
            </p>

            {/* Audience switcher */}
            <div className="flex flex-wrap justify-center gap-2 mb-7" role="tablist" aria-label={isRTL ? 'نوع المنشأة' : 'Business type'}>
              {AUDIENCES.map((a) => {
                const Icon = a.icon;
                const active = audience === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => { setAudience(a.key); track({ event_type: 'cta_click', section: 'audience', cta_id: a.key }); }}
                    className={`group inline-flex items-center gap-2 px-4 h-10 rounded-full border text-sm font-medium transition-all ${active ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card border-border/60 hover:border-primary/50 hover:bg-muted/50'}`}
                    aria-pressed={active}
                  >
                    <Icon className="w-4 h-4" />
                    {isRTL ? a.ar : a.en}
                  </button>
                );
              })}
            </div>
            <p className="text-sm md:text-base text-foreground/80 max-w-xl mx-auto mb-8 min-h-[2.5rem]">
              {isRTL ? activeAudience.desc_ar : activeAudience.desc_en}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-10">
              <Button asChild size="lg" className="h-12 px-7 text-base shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                onClick={() => { track({ event_type: 'cta_click', section: 'hero', cta_id: 'primary' }); gtmTrack.providerSignupStart({}); }}>
                <Link to={hero?.cta_primary_href || '/auth?mode=signup&role=provider'}>
                  {pick(hero?.cta_primary_label_ar, hero?.cta_primary_label_en) || (isRTL ? 'سجّل جهتك الآن — مجاناً' : 'Register Your Business — Free')}
                  <ArrowFwd className="w-4 h-4 ms-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base w-full sm:w-auto"
                onClick={() => track({ event_type: 'cta_click', section: 'hero', cta_id: 'secondary' })}>
                <a href={hero?.cta_secondary_href || '#how-it-works'}>
                  {pick(hero?.cta_secondary_label_ar, hero?.cta_secondary_label_en) || (isRTL ? 'كيف تعمل المنصة؟' : 'How it works')}
                </a>
              </Button>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs md:text-sm text-muted-foreground mb-8">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" />{isRTL ? 'بدون رسوم تسجيل' : 'No signup fees'}</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" />{isRTL ? 'بدون عمولة على المشاريع' : 'Zero project commission'}</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" />{isRTL ? 'إلغاء في أي وقت' : 'Cancel anytime'}</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" />{isRTL ? 'دعم بالعربية 24/7' : 'Arabic support 24/7'}</span>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
              {[
                { v: stats?.businessCount ?? 0, ar: 'منشأة مسجّلة', en: 'Businesses', icon: Factory },
                { v: stats?.projectCount ?? 0, ar: 'مشروع منشور', en: 'Projects', icon: Award },
                { v: stats?.reviewCount ?? 0, ar: 'تقييم موثّق', en: 'Reviews', icon: Star },
                { v: stats?.satisfaction ?? 98, ar: 'رضا العملاء', en: 'Satisfaction', icon: TrendingUp, isPct: true },
              ].map((s, i) => {
                const I = s.icon;
                return (
                  <div key={i} className="rounded-2xl bg-card/70 backdrop-blur border border-border/40 p-3 hover-lift">
                    <I className="w-4 h-4 text-primary mx-auto mb-1.5 opacity-70" />
                    <div className="text-xl md:text-2xl font-bold text-foreground">
                      <AnimatedNumber value={Number(s.v) || 0} suffix={('isPct' in s && s.isPct) ? '%' : '+'} />
                    </div>
                    <div className="text-[11px] md:text-xs text-muted-foreground mt-0.5">{isRTL ? s.ar : s.en}</div>
                  </div>
                );
              })}
            </div>

            {/* Hero showcase image (admin-controlled) */}
            {/* Hero showcase image (admin-controlled, with realistic default) */}
            <div className="mt-10 md:mt-14 max-w-5xl mx-auto">
              <div className="relative rounded-3xl overflow-hidden border border-border/40 shadow-2xl bg-card aspect-[16/9]">
                <img
                  src={hero?.image_url || heroImage}
                  alt={pick(hero?.title_ar, hero?.title_en) || (isRTL ? 'مشاريع البناء والتشييد على منصة قِطاعات' : 'Construction projects on Qitaat')}
                  className="w-full h-full object-cover"
                  loading="eager"
                  width={1600}
                  height={900}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-background/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AUDIENCE DEEP DIVE */}
      <section className="py-12 md:py-16 border-y border-border/40 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <Badge variant="outline" className="mb-3">{isRTL ? 'من يمكنه التسجيل' : 'Who can register'}</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              {isRTL ? 'منصة واحدة تخدم منظومة البناء والتشييد بالكامل' : 'One platform serving the full construction ecosystem'}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {isRTL ? 'تجربة مخصّصة لكل نوع جهة، بأدوات تناسب تخصصك وحجم عملياتك.' : 'A tailored experience for every business type, with tools matching your scope and scale.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              return (
                <Card key={a.key} className="p-5 md:p-6 hover-lift group">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{isRTL ? a.ar : a.en}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{isRTL ? a.desc_ar : a.desc_en}</p>
                  <Link to="/auth?mode=signup&role=provider"
                    onClick={() => { track({ event_type: 'cta_click', section: 'audience_card', cta_id: a.key }); gtmTrack.providerSignupStart({}); }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all">
                    {isRTL ? 'ابدأ الآن' : 'Get started'} <ArrowFwd className="w-4 h-4" />
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* VALUE PILLARS */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="outline" className="mb-3">{isRTL ? 'لماذا قِطاعات' : 'Why Qitaat'}</Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-3">{pick(why?.title_ar, why?.title_en) || (isRTL ? 'أكثر من مجرد دليل — شريك نموّ' : 'More than a directory — a growth partner')}</h2>
            <p className="text-muted-foreground">{pick(why?.subtitle_ar, why?.subtitle_en) || (isRTL ? 'أربعة أعمدة تجعل قرارك بالانضمام واضحاً' : 'Four pillars that make joining an easy decision')}</p>
          </div>
          <div className="max-w-5xl mx-auto mb-10 rounded-2xl overflow-hidden border border-border/40 shadow-lg aspect-[21/9] relative">
            <img
              src={why?.image_url || whyImage}
              alt={pick(why?.title_ar, why?.title_en) || (isRTL ? 'مصانع الصناعات الخفيفة' : 'Light-industry factories')}
              className="w-full h-full object-cover"
              loading="lazy"
              width={1600}
              height={700}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUE_PILLARS.map((p, i) => {
              const Icon = p.icon;
              return (
                <Card key={i} className="p-5 md:p-6 hover-lift relative overflow-hidden border-border/50">
                  <div className="absolute -top-8 -end-8 w-24 h-24 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground grid place-items-center mb-4 shadow-md">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base md:text-lg mb-2">{isRTL ? p.ar : p.en}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{isRTL ? p.desc_ar : p.desc_en}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ROI CALCULATOR */}
      <section className="py-14 md:py-20 bg-muted/20 border-y border-border/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <Badge variant="outline" className="mb-3 inline-flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              {isRTL ? 'حاسبة العائد' : 'ROI calculator'}
            </Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-3">
              {isRTL ? 'كم يمكن أن تنمو إيراداتك مع قِطاعات؟' : 'How much could you grow with Qitaat?'}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {isRTL ? 'حرّك الشرائط لتقدير قيمة المشاريع المحتملة بناءً على حجم نشاطك.' : 'Move the sliders to estimate potential project value based on your activity.'}
            </p>
          </div>
          <RoiCalculator isRTL={isRTL} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-14 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="outline" className="mb-3">{isRTL ? 'بأربع خطوات' : 'In four steps'}</Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-3">{pick(how?.title_ar, how?.title_en) || (isRTL ? 'من التسجيل إلى أول مشروع' : 'From signup to your first project')}</h2>
            <p className="text-muted-foreground">{pick(how?.subtitle_ar, how?.subtitle_en) || (isRTL ? 'بدون تعقيد — كل شيء مرشد بالعربية' : 'No complexity — fully Arabic-guided')}</p>
          </div>
          <div className="max-w-5xl mx-auto mb-10 rounded-2xl overflow-hidden border border-border/40 shadow-lg aspect-[21/9] relative">
            <img
              src={how?.image_url || howImage}
              alt={pick(how?.title_ar, how?.title_en) || (isRTL ? 'إدارة رقمية احترافية للجهات' : 'Professional digital management')}
              className="w-full h-full object-cover"
              loading="lazy"
              width={1600}
              height={700}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {STEPS.map((s, i) => (
              <Card key={i} className="p-5 md:p-6 h-full text-center hover-lift relative">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground grid place-items-center text-lg font-bold mb-3 shadow-lg">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-semibold text-base md:text-lg mb-2">{isRTL ? s.ar : s.en}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{isRTL ? s.desc_ar : s.desc_en}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ONBOARDING CHECKLIST PREVIEW */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-3 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isRTL ? 'قائمة التهيئة' : 'Onboarding checklist'}
              </Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-3">
                {isRTL ? 'ملف جاهز للإطلاق خلال 20 دقيقة' : 'A launch-ready profile in 20 minutes'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isRTL ? 'كل خطوة موجّهة بالعربية، مع حفظ تلقائي وإمكانية الإكمال لاحقاً.' : 'Every step is Arabic-guided, auto-saved, and resumable anytime.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 px-7"
                  onClick={() => { track({ event_type: 'cta_click', section: 'onboarding', cta_id: 'start' }); gtmTrack.providerSignupStart({}); }}>
                  <Link to="/auth?mode=signup&role=provider">
                    {isRTL ? 'ابدأ التهيئة' : 'Start setup'}
                    <ArrowFwd className="w-4 h-4 ms-2" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6">
                  <a href="#how-it-works">{isRTL ? 'كيف تعمل المنصة' : 'See how it works'}</a>
                </Button>
              </div>
            </div>
            <Card className="p-5 md:p-7 border-border/50 shadow-sm">
              <ul className="space-y-3">
                {ONBOARDING_CHECKLIST.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{isRTL ? item.ar : item.en}</div>
                      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> ≈ {item.mins} {isRTL ? 'دقائق' : 'min'}
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-success/40 shrink-0 self-center" />
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* COMPARISON: Without vs With */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3">{isRTL ? 'الفرق واضح' : 'The difference'}</Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-3">
              {isRTL ? 'بدون قِطاعات vs مع قِطاعات' : 'Without Qitaat vs With Qitaat'}
            </h2>
          </div>
          <Card className="overflow-hidden border-border/60">
            <div className="grid grid-cols-[1fr_auto_auto] text-sm">
              <div className="p-4 md:p-5 bg-muted/40 font-semibold border-b border-border/50">{isRTL ? 'الميزة' : 'Capability'}</div>
              <div className="p-4 md:p-5 bg-muted/40 font-semibold border-b border-border/50 text-center min-w-[110px]">{isRTL ? 'بدون' : 'Without'}</div>
              <div className="p-4 md:p-5 bg-primary/10 font-semibold border-b border-border/50 text-center min-w-[110px] text-primary">{isRTL ? 'مع قِطاعات' : 'With Qitaat'}</div>
              {COMPARISON.map((row, i) => (
                <div key={i} className="contents">
                  <div className={`p-4 md:p-5 border-t border-border/40 ${i % 2 ? 'bg-muted/10' : ''}`}>{isRTL ? row.ar : row.en}</div>
                  <div className={`p-4 md:p-5 border-t border-border/40 text-center ${i % 2 ? 'bg-muted/10' : ''}`}>
                    {row.without ? <CheckCircle2 className="w-5 h-5 text-success mx-auto" /> : <XCircle className="w-5 h-5 text-muted-foreground/40 mx-auto" />}
                  </div>
                  <div className={`p-4 md:p-5 border-t border-border/40 text-center bg-primary/5`}>
                    {row.withQ ? <CheckCircle2 className="w-5 h-5 text-success mx-auto" /> : <XCircle className="w-5 h-5 text-muted-foreground/40 mx-auto" />}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* FEATURES */}
      {features.length > 0 && (
        <section className="py-14 md:py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <Badge variant="outline" className="mb-3">{isRTL ? 'الأدوات' : 'The toolkit'}</Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-3">
                {isRTL ? 'كل ما تحتاجه لإدارة أعمالك باحتراف' : 'Everything you need to run your business pro'}
              </h2>
              <p className="text-muted-foreground">
                {isRTL ? 'منصة متكاملة من العميل الأول حتى تسليم المشروع' : 'End-to-end — from first lead to project delivery'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f) => {
                const Icon = pickIcon(f.icon_name);
                return (
                  <article key={f.id} className="flex gap-4 p-5 rounded-2xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-md transition-all">
                    <div className="shrink-0 w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm md:text-base mb-1">{pick(f.title_ar, f.title_en)}</h3>
                      <p className="text-xs md:text-[13px] text-muted-foreground leading-relaxed">{pick(f.desc_ar, f.desc_en)}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SECTORS */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="outline" className="mb-3">{isRTL ? 'القطاعات' : 'Sectors'}</Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-3">{isRTL ? 'قطاعات الصناعات الخفيفة التي نخدمها' : 'Light industry sectors we serve'}</h2>
            <p className="text-muted-foreground">{isRTL ? 'تخصّص حقيقي لكل قطاع وأدواته الفنية' : 'True specialization with sector-specific tooling'}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {SECTORS.map((s) => {
              const Icon = pickIcon(s.icon);
              return (
                <Link key={s.slug} to={`/sectors/${s.slug}`}
                  className="group p-4 rounded-2xl bg-card border border-border/50 hover:border-primary hover:shadow-md transition-all text-center"
                  onClick={() => track({ event_type: 'cta_click', section: 'sectors', cta_id: s.slug })}>
                  <Icon className="w-7 h-7 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-medium">{isRTL ? s.ar : s.en}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="py-14 md:py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <Badge variant="outline" className="mb-3">{isRTL ? 'آراء حقيقية' : 'Real voices'}</Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-3">{isRTL ? 'منشآت تثق بقِطاعات' : 'Businesses trust Qitaat'}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testimonials.slice(0, 6).map((t) => (
                <Card key={t.id} className="p-6 hover-lift relative">
                  <Quote className="absolute top-4 end-4 w-7 h-7 text-primary/15" />
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: Math.round(t.rating ?? 5) }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-5 text-foreground/90">"{pick(t.quote_ar, t.quote_en)}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                    {t.avatar_url
                      ? <img src={t.avatar_url} alt={t.author_name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                      : <div className="w-10 h-10 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-sm">{t.author_name.charAt(0)}</div>}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-1">{t.author_name}<BadgeCheck className="w-3.5 h-3.5 text-primary" /></div>
                      <div className="text-xs text-muted-foreground truncate">{pick(t.author_role_ar, t.author_role_en)}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRICING TEASER */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-success/15 via-success/10 to-transparent border border-success/30 text-success text-xs md:text-sm font-medium">
            <Gift className="w-4 h-4" />
            {isRTL ? 'عرض الإطلاق: 90 يومًا مجانًا على باقة الاحتراف للجهات الجديدة' : 'Launch offer: 90 days free on Pro plan for new businesses'}
          </div>
          <Badge variant="outline" className="mb-3">{isRTL ? 'العضويات' : 'Memberships'}</Badge>
          <h2 className="text-2xl md:text-4xl font-bold mb-3">{isRTL ? 'ابدأ مجاناً، وطوّر عضويتك مع نمو جهتك' : 'Start free, upgrade as your business grows'}</h2>
          <p className="text-muted-foreground mb-7">
            {isRTL ? 'خطط مرنة تناسب جميع جهات قطاع البناء والصناعات الخفيفة، بدون التزام سنوي وبدون عمولة على المشاريع.' : 'Flexible plans for every business in construction and light industry — no annual lock-in, no project commission.'}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-7"
              onClick={() => track({ event_type: 'cta_click', section: 'pricing', cta_id: 'view_plans' })}>
              <Link to="/membership">{isRTL ? 'استعرض الخطط' : 'View plans'} <ArrowFwd className="w-4 h-4 ms-2" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7"
              onClick={() => { track({ event_type: 'cta_click', section: 'pricing', cta_id: 'start_free' }); gtmTrack.providerSignupStart({}); }}>
              <Link to="/auth?mode=signup&role=provider">{isRTL ? 'ابدأ مجاناً' : 'Start free'}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faq.length > 0 && (
        <section className="py-14 md:py-20 bg-muted/20">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-3">{isRTL ? 'استفسارات' : 'FAQ'}</Badge>
              <h2 className="text-2xl md:text-4xl font-bold mb-3">{isRTL ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</h2>
              <p className="text-muted-foreground text-sm">{isRTL ? 'كل ما تريد معرفته قبل التسجيل' : 'Everything you want to know before signing up'}</p>
            </div>
            <Accordion type="single" collapsible className="space-y-2">
              {faq.map((q) => (
                <AccordionItem key={q.id} value={q.id} className="border border-border/50 rounded-xl px-4 bg-card">
                  <AccordionTrigger className="text-start text-sm md:text-base font-semibold hover:no-underline">
                    {pick(q.question_ar, q.question_en)}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {pick(q.answer_ar, q.answer_en)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* VISUAL SHOWCASE STRIP */}
      <section className="py-12 md:py-16 bg-muted/20 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <Badge variant="outline" className="mb-3">{isRTL ? 'من قلب القطاع' : 'From the field'}</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              {isRTL ? 'صور حقيقية من بيئة عمل جهاتنا' : 'Real scenes from our partners on the ground'}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {isRTL ? 'مصانع، مشاريع، ومكاتب تعمل كل يوم عبر قِطاعات.' : 'Factories, projects, and offices working through Qitaat every day.'}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {SHOWCASE_IMAGES.map((img, i) => (
              <div key={i} className="group relative rounded-2xl overflow-hidden border border-border/40 aspect-[4/5] hover-lift">
                <img
                  src={img.src}
                  alt={isRTL ? img.ar : img.en}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  width={800}
                  height={1000}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-3 md:p-4 text-white">
                  <div className="text-xs md:text-sm font-semibold leading-snug">{isRTL ? img.ar : img.en}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="absolute inset-0 -z-20">
          <img
            src={finalCta?.image_url || ctaImage}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover opacity-25 mix-blend-overlay"
            loading="lazy"
            width={1600}
            height={700}
          />
        </div>
        <div className="absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, hsl(var(--primary-foreground)/0.3) 0, transparent 50%), radial-gradient(circle at 80% 70%, hsl(var(--primary-foreground)/0.2) 0, transparent 50%)' }} />
        <div className="container mx-auto px-4 text-center text-primary-foreground">
          <Badge variant="secondary" className="mb-4 bg-primary-foreground/15 text-primary-foreground border-0 backdrop-blur">
            <Clock className="w-3.5 h-3.5 me-1.5" />
            {isRTL ? 'التسجيل يستغرق أقل من دقيقة' : 'Setup in under a minute'}
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            {pick(finalCta?.title_ar, finalCta?.title_en) || (isRTL ? 'ابدأ ببناء ملف جهتك المهني اليوم' : 'Start building your professional profile today')}
          </h2>
          <p className="text-base md:text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            {pick(finalCta?.subtitle_ar, finalCta?.subtitle_en) || (isRTL ? 'سجّل جهتك مجانًا، وابدأ بالظهور أمام مشاريع البناء والتشييد، واستقبل طلبات وعروض أسعار تناسب تخصصك.' : 'Register free, become visible to construction projects, and receive requests and RFQs aligned with your specialty.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button asChild size="lg" variant="secondary" className="h-12 px-8 text-base shadow-xl"
              onClick={() => { track({ event_type: 'cta_click', section: 'final', cta_id: 'primary' }); gtmTrack.providerSignupStart({}); }}>
              <Link to={finalCta?.cta_primary_href || '/auth?mode=signup&role=provider'}>
                {pick(finalCta?.cta_primary_label_ar, finalCta?.cta_primary_label_en) || (isRTL ? 'سجّل منشأتك مجاناً' : 'Register Free')}
                <ArrowFwd className="w-4 h-4 ms-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => track({ event_type: 'cta_click', section: 'final', cta_id: 'secondary' })}>
              <Link to={finalCta?.cta_secondary_href || '/contact'}>
                {pick(finalCta?.cta_secondary_label_ar, finalCta?.cta_secondary_label_en) || (isRTL ? 'تحدث مع الفريق' : 'Talk to sales')}
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm opacity-90">
            {[
              isRTL ? 'بدون رسوم تسجيل' : 'No signup fees',
              isRTL ? 'إلغاء في أي وقت' : 'Cancel anytime',
              isRTL ? 'بدون عمولة' : 'Zero commission',
              isRTL ? 'دعم بالعربية' : 'Arabic support',
            ].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default ForProviders;
