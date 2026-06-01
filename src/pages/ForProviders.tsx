import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Sparkles,
  TrendingUp, ShieldCheck, Zap, Award,
  Factory, Store, HardHat, Truck, Compass, Settings2, Layers3,
  Wrench, Tags, Images, Briefcase, Users, FileSignature, CreditCard,
  Square, PanelTop, TreePine, ChefHat, Palette, Hammer,
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
  fetchLandingSettings, type LandingContent,
} from '@/services/providerLandingService';
import { supabase } from '@/integrations/supabase/client';
import { ScrollToTop } from '@/components/ScrollToTop';
import { HeroParticles } from '@/components/home/HeroParticles';
import { track as gtmTrack } from '@/lib/analytics-events';
import heroImage from '@/assets/providers-hero-construction.jpg';
import whyImage from '@/assets/providers-why-factory.jpg';
import howImage from '@/assets/providers-how-dashboard.jpg';
import ctaImage from '@/assets/providers-cta-handshake.jpg';

/**
 * UX-REDESIGN-2 — /for-providers
 *
 * Rebuild of the provider landing page:
 *   • Cut from 14+ sections to 10 focused, conversion-oriented sections.
 *   • Remove unverifiable claims: PDPL, regional hosting, "24/7", fake
 *     "98% satisfaction", fabricated live ticker, ROI calculator,
 *     one-sided comparison, hard-coded tier prices.
 *   • Surface real provider capabilities — services, brands, showcase,
 *     team, opportunities, membership, contracts — with soft framing
 *     ("يدعم", "يساعد", "عند تفعيل الميزة", "حسب الخطة").
 *   • Preserve CMS overrides from `providerLandingService` for hero,
 *     why, how and final-CTA sections.
 *   • Preserve SEO: canonical, JSON-LD (WebPage/Org/Service/Breadcrumb,
 *     +FAQPage when CMS FAQ populated), hero LCP preload.
 */

const pickIcon = (name: string): React.ComponentType<{ className?: string }> => {
  const Lib = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return Lib[name] ?? Lib.Sparkles;
};

const AUDIENCES = [
  { key: 'factories',   icon: Factory,  ar: 'مصانع',          en: 'Factories',
    desc_ar: 'اعرض خطوط الإنتاج ومواصفاتك الفنية لتصل إلى مقاولين ومشاريع مناسبة.',
    desc_en: 'Showcase production lines and specs to reach matching contractors and projects.' },
  { key: 'workshops',   icon: Settings2, ar: 'ورش',           en: 'Workshops',
    desc_ar: 'نظّم خدماتك ومناطق عملك ليصلك طلبات أوضح حسب نوع العمل والمدينة.',
    desc_en: 'Organize your services and areas so you receive clearer, location-matched requests.' },
  { key: 'showrooms',   icon: Store,    ar: 'معارض وموردون',  en: 'Showrooms & suppliers',
    desc_ar: 'اربط منتجاتك بالعلامات التجارية المعتمدة، وفصّل خدماتك بشكل قابل للبحث.',
    desc_en: 'Link products to approved brands and structure services so they are searchable.' },
  { key: 'install',     icon: HardHat,  ar: 'شركات تنفيذ وتركيب', en: 'Install & contracting',
    desc_ar: 'اعرض خبراتك في التركيب والصيانة والتشطيب، واستقبل طلبات مرتبطة بنطاق عملك.',
    desc_en: 'Show installation, maintenance and finishing scope and receive matched requests.' },
  { key: 'engineering', icon: Compass,  ar: 'مكاتب هندسية',   en: 'Engineering offices',
    desc_ar: 'قدّم استشاراتك وتصاميمك بطريقة منظمة يصل إليها مطورون ومقاولون يبحثون عن شركاء.',
    desc_en: 'Present consulting and design work in a way developers and contractors can find.' },
  { key: 'suppliers',   icon: Truck,    ar: 'موردون',         en: 'Suppliers',
    desc_ar: 'صنّف منتجاتك وعلاماتك ليصلك طلبات منظمة تناسب نوعية ما تورده.',
    desc_en: 'Classify products and brands to receive organized requests aligned with what you supply.' },
  { key: 'developers',  icon: Layers3,  ar: 'شركات متخصصة',  en: 'Specialized companies',
    desc_ar: 'كوّن بروفايلًا واضحًا لشركتك وفريقها وخدماتها يساعدك على فرص أوسع.',
    desc_en: 'Build a clear profile for your team and services to widen your opportunity surface.' },
];

const VALUE_PILLARS = [
  { icon: TrendingUp,  ar: 'ظهور أوضح',  en: 'Clearer visibility',
    desc_ar: 'يساعد على تحسين ظهور جهتك أمام الباحثين عن مزودي خدمات في القطاع والمدينة.',
    desc_en: 'Helps your business appear to people actively searching by sector and city.' },
  { icon: ShieldCheck, ar: 'بروفايل موثّق', en: 'Reviewed profile',
    desc_ar: 'تخضع بيانات جهتك للمراجعة قبل النشر، بما يدعم بناء ثقة أولية مع العميل.',
    desc_en: 'Your business details are reviewed before publishing to support initial client trust.' },
  { icon: Zap,         ar: 'طلبات أكثر تنظيمًا', en: 'More organized requests',
    desc_ar: 'يصلك الطلب مع نوع الخدمة والقطاع والمدينة، فتقرر الرد بمعلومات أوضح.',
    desc_en: 'Each request arrives with service type, sector and city — so you reply with more context.' },
  { icon: Award,       ar: 'فرص مرتبطة بتخصصك', en: 'Opportunities matched to scope',
    desc_ar: 'ينظم تصنيف خدماتك وقطاعاتك لتظهر في الفرص المناسبة فقط.',
    desc_en: 'Structures your services and sectors so you surface in opportunities that match.' },
];

type FeatureItem = {
  to: string;
  icon: typeof Wrench;
  ar: string; en: string;
  desc_ar: string; desc_en: string;
  link_ar: string; link_en: string;
};

/** Real provider-side capabilities. Copy is intentionally soft —
 *  "يدعم", "يساعد", "عند تفعيل", "حسب الخطة" — to avoid implying
 *  guarantees for partially-live or membership-gated features. */
const FEATURES: FeatureItem[] = [
  { to: '/services', icon: Wrench,
    ar: 'إدارة الخدمات والقطاعات', en: 'Services & sectors',
    desc_ar: 'صنّف خدماتك وحدّد القطاعات لتظهر في النتائج المناسبة فقط.',
    desc_en: 'Classify services and pick sectors so you surface only in matching results.',
    link_ar: 'استكشف الخدمات', link_en: 'Explore services' },
  { to: '/brands', icon: Tags,
    ar: 'ربط العلامات التجارية', en: 'Linked brands',
    desc_ar: 'يمكن ربط العلامات بعد اعتمادها من إدارة المنصة وعرضها على بروفايلك.',
    desc_en: 'Link brands once they are approved by the platform and display them on your profile.',
    link_ar: 'تصفح العلامات', link_en: 'Browse brands' },
  { to: '/showcase', icon: Images,
    ar: 'نشر الأعمال السابقة', en: 'Publish past work',
    desc_ar: 'تخضع الأعمال للمراجعة قبل النشر، ثم تظهر في معرض قطاعات الموثّق.',
    desc_en: 'Work is reviewed before publishing and then appears in the verified showcase.',
    link_ar: 'افتح المعرض', link_en: 'Open showcase' },
  { to: '/auth?mode=signup&role=provider', icon: Briefcase,
    ar: 'استقبال الفرص والطلبات', en: 'Receive opportunities',
    desc_ar: 'يصلك الطلب منظمًا مع نوع الخدمة والمدينة، يساعدك على الرد بسرعة ووضوح.',
    desc_en: 'Requests arrive with service type and city — so you reply quickly and clearly.',
    link_ar: 'ابدأ التسجيل', link_en: 'Start registration' },
  { to: '/auth?mode=signup&role=provider', icon: ShieldCheck,
    ar: 'بروفايل عام موثّق', en: 'Verified public profile',
    desc_ar: 'صفحة عامة لجهتك تعرض الخدمات، القطاعات، الأعمال، وبيانات التواصل بشكل منظّم.',
    desc_en: 'A public page presenting your services, sectors, work and contact in an organized way.',
    link_ar: 'سجّل جهتك', link_en: 'Register your business' },
  { to: '/auth?mode=signup&role=provider', icon: Users,
    ar: 'فريق العمل والصلاحيات', en: 'Team & permissions',
    desc_ar: 'يدعم إدارة الحساب بأكثر من عضو حسب الإعدادات والخطة.',
    desc_en: 'Supports more than one team member managing the account, per settings and plan.',
    link_ar: 'سجّل جهتك', link_en: 'Register your business' },
  { to: '/membership', icon: CreditCard,
    ar: 'العضوية والظهور', en: 'Membership & visibility',
    desc_ar: 'قد تختلف بعض المزايا حسب العضوية والإعدادات. راجع الخطط لمعرفة التفاصيل.',
    desc_en: 'Some features may vary by membership and settings. See the plans for details.',
    link_ar: 'اعرض الخطط', link_en: 'See plans' },
  { to: '/for-providers#how', icon: FileSignature,
    ar: 'العقود والمراحل عند التفعيل', en: 'Contracts & stages when enabled',
    desc_ar: 'تدعم المنصة تنظيم العقود والمراحل والدفعات، قابل للتفعيل حسب نوع الخدمة.',
    desc_en: 'The platform supports organizing contracts, stages and payments — enabled per service type.',
    link_ar: 'تعرف على الخطوات', link_en: 'See the steps' },
];

const STEPS = [
  { ar: 'سجّل الجهة',
    en: 'Register the business',
    desc_ar: 'تسجيل سريع عبر البريد أو جوجل وبدء إعداد بيانات الجهة.',
    desc_en: 'Quick signup with email or Google to start setting up your business.' },
  { ar: 'أضف بياناتك والقطاعات',
    en: 'Add details and sectors',
    desc_ar: 'البيانات الأساسية، الفروع، المدن، ساعات العمل، والقطاعات التي تخدمها.',
    desc_en: 'Core details, branches, cities, working hours and sectors you serve.' },
  { ar: 'حدّد الخدمات والعلامات',
    en: 'Set services and brands',
    desc_ar: 'صنّف خدماتك بدقة، واطلب ربط علاماتك التجارية المعتمدة.',
    desc_en: 'Classify services precisely and request linking of approved brands.' },
  { ar: 'انتظر المراجعة',
    en: 'Wait for review',
    desc_ar: 'يخضع الملف والأعمال المنشورة للمراجعة قبل الظهور للعموم.',
    desc_en: 'Your profile and submitted work are reviewed before going public.' },
  { ar: 'ابدأ الظهور واستقبال الفرص',
    en: 'Go live and receive opportunities',
    desc_ar: 'يظهر بروفايلك في القطاعات والمدن، وتصلك الطلبات منظمة.',
    desc_en: 'Your profile surfaces by sector and city, and requests reach you organized.' },
];

const SECTORS = [
  { slug: 'aluminum',   ar: 'الألمنيوم',     en: 'Aluminum',     icon: Square },
  { slug: 'steel',      ar: 'الحديد',         en: 'Steel',        icon: Hammer },
  { slug: 'glass',      ar: 'الزجاج',         en: 'Glass',        icon: PanelTop },
  { slug: 'wood',       ar: 'الخشب',          en: 'Wood',         icon: TreePine },
  { slug: 'kitchens',   ar: 'المطابخ',        en: 'Kitchens',     icon: ChefHat },
  { slug: 'decor',      ar: 'الديكورات',      en: 'Decor',        icon: Palette },
  { slug: 'blacksmith', ar: 'الحدادة الفنية', en: 'Blacksmithing', icon: Wrench },
];

const FALLBACK_FAQ = [
  { q_ar: 'هل التسجيل مجاني؟',
    a_ar: 'يمكن تسجيل جهتك والبدء بإعداد البروفايل دون رسوم تسجيل. قد تختلف بعض المزايا حسب العضوية والإعدادات.',
    q_en: 'Is registration free?',
    a_en: 'You can register your business and start setting up a profile without signup fees. Some features may vary by membership and settings.' },
  { q_ar: 'هل الظهور مضمون؟',
    a_ar: 'الظهور يعتمد على اكتمال البيانات، التصنيف، ومدى تطابقها مع بحث المستخدم. لا يوجد ضمان لنتيجة معينة.',
    q_en: 'Is visibility guaranteed?',
    a_en: 'Visibility depends on profile completeness, classification, and how well it matches user search. No specific outcome is guaranteed.' },
  { q_ar: 'هل أستطيع إضافة أكثر من قطاع؟',
    a_ar: 'نعم، يمكن للجهة العمل في أكثر من قطاع وإضافة الخدمات المناسبة لكل قطاع.',
    q_en: 'Can I add more than one sector?',
    a_en: 'Yes — a business can operate in multiple sectors and add the relevant services for each.' },
  { q_ar: 'هل يمكن ربط علامات تجارية؟',
    a_ar: 'يمكن ربط العلامات التجارية بعد اعتمادها من إدارة المنصة، ثم تظهر على بروفايلك.',
    q_en: 'Can I link brands?',
    a_en: 'You can request linking brands; once approved by the platform they appear on your profile.' },
  { q_ar: 'هل تظهر أعمالي مباشرة؟',
    a_ar: 'الأعمال المضافة للمعرض تخضع للمراجعة قبل النشر للعموم.',
    q_en: 'Does my work appear immediately?',
    a_en: 'Submitted showcase work is reviewed before being published publicly.' },
  { q_ar: 'كيف تصلني الفرص؟',
    a_ar: 'تصلك الطلبات داخل لوحة التحكم منظمة حسب نوع الخدمة، القطاع، والمدينة.',
    q_en: 'How do opportunities reach me?',
    a_en: 'Requests appear inside your dashboard, organized by service type, sector and city.' },
  { q_ar: 'هل أحتاج فريقًا لإدارة الحساب؟',
    a_ar: 'يمكن إدارة الحساب بشخص واحد، كما يدعم النظام إضافة أعضاء فريق حسب الإعدادات والخطة.',
    q_en: 'Do I need a team to manage the account?',
    a_en: 'One person can manage the account; the system also supports team members per settings and plan.' },
];

const ForProviders = () => {
  const { isRTL } = useLanguage();
  const { track } = useLandingTracking(true);

  const { data: settings } = useQuery({ queryKey: ['plp_settings'], queryFn: fetchLandingSettings });
  const { data: content = [] } = useQuery({ queryKey: ['plp_content'], queryFn: fetchLandingContent });
  const { data: features = [] } = useQuery({ queryKey: ['plp_features'], queryFn: fetchLandingFeatures });
  const { data: faq = [] } = useQuery({ queryKey: ['plp_faq'], queryFn: fetchLandingFaq });
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
      ? 'سجّل جهتك كمزود خدمة على قطاعات | بروفايل واضح وفرص منظمة'
      : 'Register your business on Qitaat | Clear profile, organized opportunities');
  const seoDesc = pick(settings?.seo_desc_ar, settings?.seo_desc_en) ||
    (isRTL
      ? 'منصة قطاعات تساعد مصانع وورش ومعارض وموردين وشركات تنفيذ على عرض خدماتهم بشكل منظم واستقبال طلبات مرتبطة بتخصصهم.'
      : 'Qitaat helps factories, workshops, showrooms, suppliers and install companies present their services clearly and receive opportunities matched to their scope.');

  const socialTitle = isRTL
    ? 'سجّل جهتك كمزود خدمة على قطاعات'
    : 'Register your business on Qitaat';

  usePageMeta({
    title: seoTitle,
    description: seoDesc,
    keywords: settings?.keywords ?? undefined,
    canonical: 'https://qitaat.com/for-providers',
    ogType: 'website',
    ogImage: settings?.og_image_url ?? undefined,
    ogTitle: socialTitle,
    ogDescription: seoDesc,
  });

  useMultiJsonLd(useMemo(() => {
    const blocks: Record<string, unknown>[] = [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: seoTitle, description: seoDesc, url: 'https://qitaat.com/for-providers', inLanguage: isRTL ? 'ar' : 'en' },
      {
        '@context': 'https://schema.org', '@type': 'Organization',
        '@id': 'https://qitaat.com/#organization',
        name: 'Qitaat قِطاعات',
        alternateName: ['قِطاعات', 'Qitaat'],
        url: 'https://qitaat.com',
        logo: { '@type': 'ImageObject', url: 'https://qitaat.com/logo.png' },
        description: seoDesc,
        areaServed: [{ '@type': 'Country', name: 'Saudi Arabia' }],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          url: 'https://qitaat.com/contact',
          availableLanguage: ['Arabic', 'English'],
        },
      },
      {
        '@context': 'https://schema.org', '@type': 'Service',
        name: isRTL ? 'قطاعات — منصة لمزودي خدمات البناء والصناعات الخفيفة' : 'Qitaat — platform for construction & light-industry providers',
        description: seoDesc,
        provider: { '@type': 'Organization', name: 'Qitaat قِطاعات', url: 'https://qitaat.com' },
        serviceType: isRTL ? 'منصة دليل أعمال صناعية' : 'Industrial Business Directory',
        areaServed: [{ '@type': 'Country', name: 'Saudi Arabia' }],
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isRTL ? 'الرئيسية' : 'Home', item: 'https://qitaat.com/' },
          { '@type': 'ListItem', position: 2, name: isRTL ? 'لمزودي الخدمات' : 'For Providers', item: 'https://qitaat.com/for-providers' },
        ],
      },
    ];
    const faqSource = faq.length > 0
      ? faq.map((q) => ({ name: pick(q.question_ar, q.question_en), text: pick(q.answer_ar, q.answer_en) }))
      : FALLBACK_FAQ.map((q) => ({ name: pick(q.q_ar, q.q_en), text: pick(q.a_ar, q.a_en) }));
    blocks.push({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqSource.map((q) => ({
        '@type': 'Question',
        name: q.name,
        acceptedAnswer: { '@type': 'Answer', text: q.text },
      })),
    });
    return blocks;
  }, [seoTitle, seoDesc, isRTL, faq])); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!settings) return;
    if (settings.gsc_verification) {
      let m = document.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement | null;
      if (!m) { m = document.createElement('meta'); m.name = 'google-site-verification'; document.head.appendChild(m); }
      m.content = settings.gsc_verification;
    }
  }, [settings]);

  // Preload the hero LCP image so it starts downloading before JSX paints.
  useEffect(() => {
    const href = hero?.image_url || heroImage;
    if (!href) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.setAttribute('fetchpriority', 'high');
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, [hero?.image_url]);

  const ArrowFwd = isRTL ? ArrowLeft : ArrowRight;

  const PROVIDER_SIGNUP = '/auth?mode=signup&role=provider';

  const onPrimaryCta = (section: string, cta_id: string) => () => {
    track({ event_type: 'cta_click', section, cta_id });
    gtmTrack.providerSignupStart({});
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-12 md:pt-28 md:pb-20">
        <div className="absolute inset-0 -z-20">
          <img
            src={hero?.image_url || heroImage}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            {...{ fetchpriority: 'high' }}
            width={1920}
            height={1080}
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <HeroParticles />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-5 px-3 py-1.5 text-xs font-medium gap-1.5 inline-flex items-center backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {isRTL ? 'لمزودي خدمات البناء والصناعات الخفيفة' : 'For construction & light-industry providers'}
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.25] mb-5 max-w-3xl mx-auto">
              {pick(hero?.title_ar, hero?.title_en) || (isRTL
                ? 'سجّل جهتك كمزود خدمة وابدأ من بروفايل واضح'
                : 'Register your business and start from a clear profile')}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-7 max-w-2xl mx-auto leading-relaxed">
              {pick(hero?.subtitle_ar, hero?.subtitle_en) || (isRTL
                ? 'قطاعات تساعد المصانع والورش والمعارض والموردين وشركات التنفيذ على عرض خدماتهم بطريقة منظمة، واستقبال طلبات مرتبطة بنطاق عملهم.'
                : 'Qitaat helps factories, workshops, showrooms, suppliers and install companies present services clearly and receive scope-matched requests.')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
              <Button asChild size="lg" className="h-12 px-7 text-base shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                onClick={onPrimaryCta('hero', 'primary')}>
                <Link to={hero?.cta_primary_href || PROVIDER_SIGNUP}>
                  {pick(hero?.cta_primary_label_ar, hero?.cta_primary_label_en) || (isRTL ? 'سجّل جهتك كمزود خدمة' : 'Register your business')}
                  <ArrowFwd className="w-4 h-4 ms-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base w-full sm:w-auto"
                onClick={() => track({ event_type: 'cta_click', section: 'hero', cta_id: 'secondary' })}>
                <Link to={hero?.cta_secondary_href || '/sectors'}>
                  {pick(hero?.cta_secondary_label_ar, hero?.cta_secondary_label_en) || (isRTL ? 'استكشف القطاعات' : 'Explore sectors')}
                </Link>
              </Button>
            </div>

            <ul className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs md:text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" />{isRTL ? 'بروفايل عام للجهة' : 'Public business profile'}</li>
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" />{isRTL ? 'خدمات وقطاعات منظّمة' : 'Organized services & sectors'}</li>
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" />{isRTL ? 'علامات تجارية مرتبطة' : 'Linked brands'}</li>
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" />{isRTL ? 'فرص وطلبات أوضح' : 'Clearer opportunities & requests'}</li>
            </ul>

            {/* Real DB stats only — no hard-coded satisfaction figure. */}
            {(stats?.businessCount || stats?.projectCount || stats?.reviewCount) ? (
              <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto mt-8">
                {[
                  { v: stats?.businessCount ?? 0, ar: 'منشأة مسجّلة', en: 'Businesses' },
                  { v: stats?.projectCount ?? 0,  ar: 'مشروع منشور', en: 'Published projects' },
                  { v: stats?.reviewCount ?? 0,   ar: 'تقييم موثّق',  en: 'Reviews' },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl bg-card/70 backdrop-blur border border-border/40 p-3 text-center">
                    <div className="text-xl md:text-2xl font-bold text-foreground tech-content">{Number(s.v) || 0}</div>
                    <div className="text-[11px] md:text-xs text-muted-foreground mt-0.5">{isRTL ? s.ar : s.en}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* AUDIENCE CARDS */}
      <section className="py-12 md:py-16 border-y border-border/40 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <Badge variant="outline" className="mb-3">{isRTL ? 'من يستخدم قطاعات' : 'Who uses Qitaat'}</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              {isRTL ? 'مساحة لكل جهة في القطاع' : 'A space for every kind of provider'}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {isRTL ? 'صيغة عرض موحّدة، مع تفاصيل تناسب نشاطك.' : 'A consistent format with details tailored to your activity.'}
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
                  <Link to={PROVIDER_SIGNUP}
                    onClick={onPrimaryCta('audience_card', a.key)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all">
                    {isRTL ? 'سجّل جهتك' : 'Register your business'} <ArrowFwd className="w-4 h-4" />
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY REGISTER — value pillars */}
      <section id="why" className="py-14 md:py-20 scroll-mt-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="outline" className="mb-3">{isRTL ? 'لماذا تسجّل جهتك' : 'Why register'}</Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-3">{pick(why?.title_ar, why?.title_en) || (isRTL ? 'بروفايل واضح وفرص مرتبطة بتخصصك' : 'A clear profile and opportunities matched to your scope')}</h2>
            <p className="text-muted-foreground">{pick(why?.subtitle_ar, why?.subtitle_en) || (isRTL ? 'أربعة أسباب عملية للتسجيل' : 'Four practical reasons to register')}</p>
          </div>
          <div className="max-w-5xl mx-auto mb-10 rounded-2xl overflow-hidden border border-border/40 shadow-lg aspect-[21/9] relative">
            <img
              src={why?.image_url || whyImage}
              alt={pick(why?.title_ar, why?.title_en) || (isRTL ? 'بروفايل مزود خدمة منظّم' : 'An organized provider profile')}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
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
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground grid place-items-center mb-4 shadow-md">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base md:text-lg mb-2">{isRTL ? p.ar : p.en}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{isRTL ? p.desc_ar : p.desc_en}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN MANAGE — feature grid */}
      <section id="features" className="py-14 md:py-20 bg-muted/20 border-y border-border/40 scroll-mt-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="outline" className="mb-3">{isRTL ? 'ماذا يمكنك أن تدير' : 'What you can manage'}</Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-3">
              {isRTL ? 'قدرات تساعد جهتك على الظهور والتنظيم' : 'Capabilities that help you appear and stay organized'}
            </h2>
            <p className="text-muted-foreground">
              {isRTL ? 'مزايا قابلة للتفعيل حسب نشاطك وحسب الخطة والإعدادات.' : 'Features that can be enabled based on your activity, plan and settings.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={`${f.to}-${f.en}`} className="p-5 md:p-6 hover-lift flex flex-col">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{isRTL ? f.ar : f.en}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{isRTL ? f.desc_ar : f.desc_en}</p>
                  <Link to={f.to} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-2.5 transition-all">
                    {isRTL ? f.link_ar : f.link_en} <ArrowFwd className="w-3.5 h-3.5" />
                  </Link>
                </Card>
              );
            })}
          </div>
          {/* CMS-driven features (admin-managed) keep rendering below if present. */}
          {features.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
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
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-14 md:py-20 scroll-mt-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="outline" className="mb-3">{isRTL ? 'كيف تبدأ' : 'How to start'}</Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-3">{pick(how?.title_ar, how?.title_en) || (isRTL ? 'خمس خطوات من التسجيل إلى أول فرصة' : 'Five steps from signup to first opportunity')}</h2>
            <p className="text-muted-foreground">{pick(how?.subtitle_ar, how?.subtitle_en) || (isRTL ? 'مرشد بالعربية وقابل للإكمال لاحقًا' : 'Arabic-guided and resumable later')}</p>
          </div>
          <div className="max-w-5xl mx-auto mb-10 rounded-2xl overflow-hidden border border-border/40 shadow-lg aspect-[21/9] relative">
            <img
              src={how?.image_url || howImage}
              alt={pick(how?.title_ar, how?.title_en) || (isRTL ? 'لوحة إدارة لمزود الخدمة' : 'Provider management dashboard')}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              width={1600}
              height={700}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {STEPS.map((s, i) => (
              <Card key={i} className="p-5 md:p-6 h-full text-center hover-lift relative">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground grid place-items-center text-base font-bold mb-3 shadow-lg tech-content">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-semibold text-sm md:text-base mb-2">{isRTL ? s.ar : s.en}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{isRTL ? s.desc_ar : s.desc_en}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SECTORS */}
      <section className="py-12 md:py-16 bg-muted/20 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <Badge variant="outline" className="mb-3">{isRTL ? 'القطاعات' : 'Sectors'}</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              {isRTL ? 'قطاعات الصناعات الخفيفة المدعومة' : 'Supported light-industry sectors'}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {SECTORS.map((s) => {
              const Icon = s.icon;
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

      {/* TRUST & VERIFICATION */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isRTL ? 'الثقة والتوثيق' : 'Trust & verification'}
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              {isRTL ? 'مراجعة قبل النشر، لا ضمان للنتائج' : 'Reviewed before publishing — outcomes are not guaranteed'}
            </h2>
          </div>
          <Card className="p-6 md:p-8 border-border/50">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm leading-relaxed">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground/90">{isRTL ? 'تخضع بيانات الجهة للمراجعة قبل ظهورها للعموم.' : 'Business details are reviewed before going public.'}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground/90">{isRTL ? 'العلامات التجارية تُربط بعد اعتمادها من إدارة المنصة.' : 'Brands are linked only after platform approval.'}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground/90">{isRTL ? 'أعمال المعرض تُراجَع قبل النشر.' : 'Showcase submissions are reviewed before publishing.'}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground/90">{isRTL ? 'لا نضمن نتائج التنفيذ ولا قرارات العملاء.' : 'We do not guarantee execution outcomes or client decisions.'}</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-5">
              {isRTL ? 'لمعرفة كيف نتحقق من بيانات الجهات،' : 'To see how we verify business details,'}{' '}
              <Link to="/about#trust" className="text-primary hover:underline underline-offset-4">
                {isRTL ? 'اطلع على تفاصيل التوثيق' : 'read the verification overview'}
              </Link>.
            </p>
          </Card>
        </div>
      </section>

      {/* MEMBERSHIP — explainer card only, no hard-coded prices */}
      <section id="membership" className="py-12 md:py-16 bg-muted/20 border-y border-border/40 scroll-mt-32">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="p-6 md:p-8 text-center">
            <Badge variant="outline" className="mb-3">{isRTL ? 'العضوية' : 'Membership'}</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              {isRTL ? 'بعض المزايا قد تختلف حسب الخطة' : 'Some features may vary by plan'}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed">
              {isRTL
                ? 'يمكن بدء التسجيل وإعداد البروفايل دون رسوم تسجيل. تفاصيل الخطط، المزايا، والظهور تُعرض كاملة على صفحة العضوية.'
                : 'You can register and set up a profile with no signup fees. Full plan details, features and visibility are listed on the membership page.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="h-12 px-7"
                onClick={() => track({ event_type: 'cta_click', section: 'membership', cta_id: 'view_plans' })}>
                <Link to="/membership">{isRTL ? 'اعرض خطط العضوية' : 'See membership plans'} <ArrowFwd className="w-4 h-4 ms-2" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6"
                onClick={onPrimaryCta('membership', 'signup')}>
                <Link to={PROVIDER_SIGNUP}>{isRTL ? 'سجّل جهتك' : 'Register your business'}</Link>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14 md:py-20 scroll-mt-32">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-3">{isRTL ? 'استفسارات' : 'FAQ'}</Badge>
            <h2 className="text-2xl md:text-4xl font-bold mb-3">{isRTL ? 'أسئلة قد تساعدك قبل التسجيل' : 'Questions that may help before you register'}</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {(faq.length > 0
              ? faq.map((q) => ({ id: q.id, q: pick(q.question_ar, q.question_en), a: pick(q.answer_ar, q.answer_en) }))
              : FALLBACK_FAQ.map((q, i) => ({ id: `fb-${i}`, q: pick(q.q_ar, q.q_en), a: pick(q.a_ar, q.a_en) }))
            ).map((item) => (
              <AccordionItem key={item.id} value={item.id} className="border border-border/50 rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-start text-sm md:text-base font-semibold hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
            decoding="async"
            width={1600}
            height={700}
          />
        </div>
        <div className="container mx-auto px-4 text-center text-primary-foreground">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            {pick(finalCta?.title_ar, finalCta?.title_en) || (isRTL ? 'ابدأ ببناء بروفايل جهتك اليوم' : 'Start building your business profile today')}
          </h2>
          <p className="text-base md:text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            {pick(finalCta?.subtitle_ar, finalCta?.subtitle_en) || (isRTL
              ? 'سجّل جهتك، أكمل بياناتك، وابدأ الظهور للعملاء والمقاولين في القطاعات التي تخدمها.'
              : 'Register your business, complete your details, and start appearing to clients and contractors in the sectors you serve.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button asChild size="lg" variant="secondary" className="h-12 px-8 text-base shadow-xl"
              onClick={onPrimaryCta('final', 'primary')}>
              <Link to={finalCta?.cta_primary_href || PROVIDER_SIGNUP}>
                {pick(finalCta?.cta_primary_label_ar, finalCta?.cta_primary_label_en) || (isRTL ? 'سجّل جهتك كمزود خدمة' : 'Register your business')}
                <ArrowFwd className="w-4 h-4 ms-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => track({ event_type: 'cta_click', section: 'final', cta_id: 'secondary' })}>
              <Link to={finalCta?.cta_secondary_href || '/contact'}>
                {pick(finalCta?.cta_secondary_label_ar, finalCta?.cta_secondary_label_en) || (isRTL ? 'تواصل معنا' : 'Contact us')}
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm opacity-90">
            <Link to="/sectors" className="hover:underline underline-offset-4">{isRTL ? 'القطاعات' : 'Sectors'}</Link>
            <span className="opacity-50">·</span>
            <Link to="/services" className="hover:underline underline-offset-4">{isRTL ? 'الخدمات' : 'Services'}</Link>
            <span className="opacity-50">·</span>
            <Link to="/brands" className="hover:underline underline-offset-4">{isRTL ? 'العلامات' : 'Brands'}</Link>
            <span className="opacity-50">·</span>
            <Link to="/showcase" className="hover:underline underline-offset-4">{isRTL ? 'المعرض' : 'Showcase'}</Link>
          </div>
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default ForProviders;