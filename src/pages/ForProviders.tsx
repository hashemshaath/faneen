import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
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
  fetchLandingContent,
  fetchLandingFeatures,
  fetchLandingFaq,
  fetchLandingTestimonials,
  fetchLandingSettings,
  type LandingContent,
} from '@/services/providerLandingService';
import { supabase } from '@/integrations/supabase/client';
import { ScrollToTop } from '@/components/ScrollToTop';
import { HeroParticles } from '@/components/home/HeroParticles';
import { Star, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

const pickIcon = (name: string): React.ComponentType<{ className?: string }> => {
  const Lib = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return Lib[name] ?? Lib.Sparkles;
};

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
  { ar: 'سجّل مجاناً', en: 'Register Free', desc_ar: 'أنشئ حسابك في أقل من دقيقة بالبريد أو جوجل', desc_en: 'Create your account in under a minute via email or Google' },
  { ar: 'فعّل ملفك', en: 'Activate Profile', desc_ar: 'أضف بيانات ورشتك، الموقع، وساعات العمل', desc_en: 'Add your workshop info, location, and working hours' },
  { ar: 'أضف خدماتك', en: 'Add Services', desc_ar: 'اعرض خدماتك ومشاريعك السابقة بصور احترافية', desc_en: 'Showcase services and past projects with pro photos' },
  { ar: 'استقبل العملاء', en: 'Receive Clients', desc_ar: 'تواصل مباشر، عقود VAT، وحجوزات بكل سهولة', desc_en: 'Direct messages, VAT contracts, and easy bookings' },
];

const ForProviders = () => {
  const { isRTL } = useLanguage();
  const { track } = useLandingTracking(true);

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

  // SEO
  const seoTitle = pick(settings?.seo_title_ar, settings?.seo_title_en) ||
    'انضم لقِطاعات — منصة مزودي خدمات الألمنيوم والحديد والزجاج';
  const seoDesc = pick(settings?.seo_desc_ar, settings?.seo_desc_en) || '';

  usePageMeta({
    title: seoTitle,
    description: seoDesc,
    keywords: settings?.keywords ?? undefined,
    canonical: 'https://qitaat.com/for-providers',
    ogType: 'website',
    ogImage: settings?.og_image_url ?? undefined,
  });

  // JSON-LD: WebPage + Service + FAQPage + BreadcrumbList + Organization
  useMultiJsonLd(useMemo(() => {
    const blocks: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: seoTitle,
        description: seoDesc,
        url: 'https://qitaat.com/for-providers',
        inLanguage: isRTL ? 'ar' : 'en',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: isRTL ? 'منصة قِطاعات لمزودي خدمات الصناعات الخفيفة' : 'Qitaat Platform for Light Industry Providers',
        description: seoDesc,
        provider: { '@type': 'Organization', name: 'Qitaat قِطاعات', url: 'https://qitaat.com' },
        serviceType: isRTL ? 'منصة دليل أعمال صناعية' : 'Industrial Business Directory Platform',
        areaServed: [
          { '@type': 'Country', name: 'Saudi Arabia' },
          { '@type': 'Country', name: 'United Arab Emirates' },
          { '@type': 'Country', name: 'Kuwait' },
          { '@type': 'Country', name: 'Bahrain' },
          { '@type': 'Country', name: 'Qatar' },
          { '@type': 'Country', name: 'Oman' },
        ],
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'SAR',
          lowPrice: '0',
          highPrice: '299',
          offerCount: 3,
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isRTL ? 'الرئيسية' : 'Home', item: 'https://qitaat.com/' },
          { '@type': 'ListItem', position: 2, name: isRTL ? 'لمزودي الخدمات' : 'For Providers', item: 'https://qitaat.com/for-providers' },
        ],
      },
    ];
    if (faq.length > 0) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((q) => ({
          '@type': 'Question',
          name: pick(q.question_ar, q.question_en),
          acceptedAnswer: { '@type': 'Answer', text: pick(q.answer_ar, q.answer_en) },
        })),
      });
    }
    return blocks;
  }, [seoTitle, seoDesc, isRTL, faq])); // eslint-disable-line react-hooks/exhaustive-deps

  // Inject Google verification + GA4 script if configured
  useEffect(() => {
    if (!settings) return;
    if (settings.gsc_verification) {
      let m = document.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement | null;
      if (!m) { m = document.createElement('meta'); m.name = 'google-site-verification'; document.head.appendChild(m); }
      m.content = settings.gsc_verification;
    }
    if (settings.ga4_measurement_id && !document.getElementById('ga4-script')) {
      const s1 = document.createElement('script');
      s1.id = 'ga4-script';
      s1.async = true;
      s1.src = `https://www.googletagmanager.com/gtag/js?id=${settings.ga4_measurement_id}`;
      document.head.appendChild(s1);
      const s2 = document.createElement('script');
      s2.id = 'ga4-init';
      s2.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.ga4_measurement_id}');`;
      document.head.appendChild(s2);
    }
  }, [settings]);

  const ArrowFwd = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
        <HeroParticles />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
              {isRTL ? '🚀 منصة الصناعات الخفيفة #1 في الخليج' : '🚀 #1 Light Industry Platform in the Gulf'}
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] mb-5 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {pick(hero?.title_ar, hero?.title_en)}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              {pick(hero?.subtitle_ar, hero?.subtitle_en)}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-10">
              <Button
                asChild
                size="lg"
                className="h-12 px-7 text-base shadow-lg hover:shadow-xl transition-all"
                onClick={() => track({ event_type: 'cta_click', section: 'hero', cta_id: 'primary' })}
              >
                <Link to={hero?.cta_primary_href || '/auth?mode=signup&role=provider'}>
                  {pick(hero?.cta_primary_label_ar, hero?.cta_primary_label_en)}
                  <ArrowFwd className="w-4 h-4 ms-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-7 text-base"
                onClick={() => track({ event_type: 'cta_click', section: 'hero', cta_id: 'secondary' })}
              >
                <a href={hero?.cta_secondary_href || '#how-it-works'}>
                  {pick(hero?.cta_secondary_label_ar, hero?.cta_secondary_label_en)}
                </a>
              </Button>
            </div>
            {/* Trust strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
              {[
                { v: stats?.businessCount ?? 0, ar: 'ورشة ومصنع', en: 'Workshops' },
                { v: stats?.projectCount ?? 0, ar: 'مشروع منشور', en: 'Projects' },
                { v: stats?.reviewCount ?? 0, ar: 'تقييم عميل', en: 'Reviews' },
                { v: `${stats?.satisfaction ?? 0}%`, ar: 'رضا العملاء', en: 'Satisfaction' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl bg-card/60 backdrop-blur border border-border/40 p-3">
                  <div className="text-xl md:text-2xl font-bold text-primary tech-content">{s.v}+</div>
                  <div className="text-[11px] md:text-xs text-muted-foreground mt-1">{isRTL ? s.ar : s.en}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="py-14 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">{pick(why?.title_ar, why?.title_en)}</h2>
            <p className="text-muted-foreground">{pick(why?.subtitle_ar, why?.subtitle_en)}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {features.slice(0, 8).map((f) => {
              const Icon = pickIcon(f.icon_name);
              return (
                <Card key={f.id} className="p-4 md:p-5 hover-lift border-border/50 bg-card/80 backdrop-blur-sm group">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="font-semibold text-sm md:text-base mb-1.5 line-clamp-2">{pick(f.title_ar, f.title_en)}</h3>
                  <p className="text-xs md:text-[13px] text-muted-foreground leading-relaxed line-clamp-3">
                    {pick(f.desc_ar, f.desc_en)}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how-it-works" className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">{pick(how?.title_ar, how?.title_en)}</h2>
            <p className="text-muted-foreground">{pick(how?.subtitle_ar, how?.subtitle_en)}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="relative">
                <Card className="p-5 md:p-6 h-full text-center hover-lift">
                  <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground grid place-items-center text-lg font-bold mb-3 shadow-lg">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="font-semibold text-base md:text-lg mb-2">{isRTL ? s.ar : s.en}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {isRTL ? s.desc_ar : s.desc_en}
                  </p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ALL FEATURES (SEO content) */}
      <section className="py-14 md:py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">
              {isRTL ? 'كل ما تحتاجه لإدارة وتنمية أعمالك' : 'Everything You Need to Run and Grow'}
            </h2>
            <p className="text-muted-foreground">
              {isRTL
                ? 'منصة متكاملة من التسجيل حتى تسليم المشروع — كل شيء في مكان واحد'
                : 'A complete platform from registration to project delivery — all in one place'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => {
              const Icon = pickIcon(f.icon_name);
              return (
                <article key={f.id} className="flex gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="shrink-0 w-11 h-11 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm md:text-base mb-1">{pick(f.title_ar, f.title_en)}</h3>
                    <p className="text-xs md:text-[13px] text-muted-foreground leading-relaxed">
                      {pick(f.desc_ar, f.desc_en)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTORS */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">
              {isRTL ? 'القطاعات التي نخدمها' : 'Sectors We Serve'}
            </h2>
            <p className="text-muted-foreground">
              {isRTL ? 'متخصصون في الصناعات الخفيفة بكل تنوعها' : 'Specialized across all light industries'}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {SECTORS.map((s) => {
              const Icon = pickIcon(s.icon);
              return (
                <Link
                  key={s.slug}
                  to={`/sectors/${s.slug}`}
                  className="group p-4 rounded-xl bg-card border border-border/50 hover:border-primary hover:shadow-md transition-all text-center"
                  onClick={() => track({ event_type: 'cta_click', section: 'sectors', cta_id: s.slug })}
                >
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
              <h2 className="text-2xl md:text-4xl font-bold mb-3">
                {isRTL ? 'ماذا يقول مزودو الخدمات؟' : 'What Providers Say'}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testimonials.slice(0, 6).map((t) => (
                <Card key={t.id} className="p-5 hover-lift">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: Math.round(t.rating ?? 5) }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-4">"{pick(t.quote_ar, t.quote_en)}"</p>
                  <div className="flex items-center gap-3">
                    {t.avatar_url && <img src={t.avatar_url} alt={t.author_name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />}
                    <div>
                      <div className="font-semibold text-sm">{t.author_name}</div>
                      <div className="text-xs text-muted-foreground">{pick(t.author_role_ar, t.author_role_en)}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold mb-3">
              {isRTL ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isRTL ? 'كل ما تريد معرفته قبل التسجيل' : 'Everything you want to know before registering'}
            </p>
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

      {/* FINAL CTA */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="container mx-auto px-4 text-center text-primary-foreground">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            {pick(finalCta?.title_ar, finalCta?.title_en)}
          </h2>
          <p className="text-base md:text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            {pick(finalCta?.subtitle_ar, finalCta?.subtitle_en)}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-12 px-8 text-base shadow-xl"
              onClick={() => track({ event_type: 'cta_click', section: 'final', cta_id: 'primary' })}
            >
              <Link to={finalCta?.cta_primary_href || '/auth?mode=signup&role=provider'}>
                {pick(finalCta?.cta_primary_label_ar, finalCta?.cta_primary_label_en)}
                <ArrowFwd className="w-4 h-4 ms-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => track({ event_type: 'cta_click', section: 'final', cta_id: 'secondary' })}
            >
              <Link to={finalCta?.cta_secondary_href || '/contact'}>
                {pick(finalCta?.cta_secondary_label_ar, finalCta?.cta_secondary_label_en)}
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm opacity-90">
            {[
              isRTL ? 'بدون رسوم تسجيل' : 'No signup fees',
              isRTL ? 'إلغاء في أي وقت' : 'Cancel anytime',
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
