import React, { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, ChevronLeft, ListChecks, MapPin, FileText,
  Send, ShieldCheck, Building2, ArrowLeft, Hammer,
} from 'lucide-react';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import {
  SECTORS_SEO, SECTORS_SEO_LIST, type SeoSectorSlug,
} from '@/lib/sectors-seo';
import { buildBreadcrumbList, buildFaqPage, buildService } from '@/lib/seo/structured-data';
import { SectorWorksGallery } from '@/components/sectors/SectorWorksGallery';

const STEPS = [
  { title: 'اختر القطاع', text: 'ابدأ من القطاع الأقرب لاحتياجك.' },
  { title: 'أضف التفاصيل', text: 'وصف مختصر، مقاسات تقريبية، وصور إن وجدت.' },
  { title: 'حدد الموقع والموعد', text: 'المدينة ومكان التنفيذ والموعد المتوقع.' },
  { title: 'أرسل الطلب', text: 'يصل الطلب لمزودي الخدمة المناسبين للمتابعة معك.' },
];

const HOW_QITAAT_HELPS = [
  'تنظيم تفاصيل الطلب بشكل واضح للمزود.',
  'الوصول إلى مزودي خدمات حسب القطاع والمدينة.',
  'مقارنة الردود قبل اتخاذ قرار التنفيذ.',
  'حفظ الطلب ومتابعته من حسابك في أي وقت.',
];

const SectorSeoLanding: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const sector = slug && SECTORS_SEO[slug as SeoSectorSlug] ? SECTORS_SEO[slug as SeoSectorSlug] : null;

  const quoteHref = sector ? `/quote?sector=${sector.slug}` : '/quote';
  const searchHref = sector?.searchSector ? `/search?sector=${sector.searchSector}` : '/search';
  const pageUrl = sector ? `https://qitaat.com/sectors/${sector.slug}` : 'https://qitaat.com/sectors';

  usePageMeta({
    title: sector?.metaTitle ?? 'القطاعات | قطاعات',
    description: sector?.metaDescription ?? '',
    canonical: pageUrl,
    ogType: 'website',
    ogTitle: sector?.h1,
    ogDescription: sector?.hero,
  });

  useMultiJsonLd(
    useMemo(() => {
      if (!sector) return null;
      const blocks: Record<string, unknown>[] = [];
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: sector.h1,
        url: pageUrl,
        inLanguage: 'ar-SA-u-nu-latn',
        description: sector.metaDescription,
      });
      const bc = buildBreadcrumbList([
        { name: 'القطاعات', url: '/sectors' },
        { name: sector.shortName, url: `/sectors/${sector.slug}` },
      ]);
      if (bc) blocks.push(bc);
      const svc = buildService({
        name: sector.name,
        description: sector.metaDescription,
        providerName: 'Qitaat',
        providerUrl: '/',
        areaServed: 'Saudi Arabia',
        serviceType: sector.serviceType,
        url: `/sectors/${sector.slug}`,
      });
      if (svc) blocks.push(svc);
      const faq = buildFaqPage(sector.faqs);
      if (faq) blocks.push(faq);
      return blocks;
    }, [sector, pageUrl]),
  );

  if (!slug || !sector) {
    return <Navigate to="/sectors" replace />;
  }

  const related = SECTORS_SEO_LIST.filter((s) => s.slug !== sector.slug);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      {/* Hero */}
      <header className="bg-primary pt-28 pb-12">
        <div className="container px-4">
          <nav className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-3" aria-label="breadcrumb">
            <Link to="/" className="hover:text-gold transition-colors">الرئيسية</Link>
            <span>/</span>
            <Link to="/sectors" className="hover:text-gold transition-colors">القطاعات</Link>
            <span>/</span>
            <span className="text-primary-foreground">{sector.shortName}</span>
          </nav>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary-foreground">
            {sector.h1}
          </h1>
          <p className="mt-3 text-primary-foreground/80 text-sm sm:text-base max-w-2xl leading-relaxed">
            {sector.hero}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={quoteHref}>
              <Button size="lg" className="rounded-xl bg-gold text-primary hover:bg-gold/90 font-bold h-12 px-6">
                <Send className="w-4 h-4 ms-2" />
                {sector.primaryCta}
              </Button>
            </Link>
            <Link to={searchHref}>
              <Button size="lg" variant="outline" className="rounded-xl h-12 px-6 bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
                {sector.secondaryCta}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container px-4 py-12 space-y-14">
        {/* Common services */}
        <section aria-labelledby="services-h">
          <h2 id="services-h" className="font-heading text-2xl font-bold mb-5">الخدمات الشائعة داخل القطاع</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sector.services.map((s) => (
              <Card key={s} className="hover-lift">
                <CardContent className="p-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{s}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* When you need this sector */}
        <section aria-labelledby="when-h" className="grid lg:grid-cols-2 gap-6">
          <div>
            <h2 id="when-h" className="font-heading text-2xl font-bold mb-4">متى تحتاج هذا القطاع؟</h2>
            <ul className="space-y-2.5">
              {sector.whenNeeded.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm text-foreground">
                  <ListChecks className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="bg-card/50">
            <CardContent className="p-5">
              <h3 className="font-heading font-bold text-lg mb-3">كيف تساعدك قطاعات؟</h3>
              <ul className="space-y-2.5">
                {HOW_QITAAT_HELPS.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Info before quote */}
        <section aria-labelledby="before-h">
          <h2 id="before-h" className="font-heading text-2xl font-bold mb-5">معلومات تساعدك قبل طلب العرض</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sector.beforeQuote.map((b) => (
              <Card key={b} className="hover-lift">
                <CardContent className="p-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{b}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section aria-labelledby="steps-h">
          <h2 id="steps-h" className="font-heading text-2xl font-bold mb-5">خطوات طلب عرض السعر</h2>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Card className="h-full">
                  <CardContent className="p-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold mb-2 tech-content">
                      {i + 1}
                    </div>
                    <h3 className="font-heading font-bold text-sm">{s.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.text}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        {/* Real works gallery from providers */}
        <SectorWorksGallery sectorSlug={sector.slug} limit={20} hideWhenEmpty />

        {/* Customer CTA */}
        <section className="rounded-2xl bg-primary/5 border border-primary/10 p-6 sm:p-8 text-center">
          <h2 className="font-heading text-2xl font-bold">جاهز ترسل تفاصيل مشروعك؟</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            أرسل طلب عرض سعر منظم. يتم توجيهه لمزودي الخدمة حسب القطاع والمدينة.
          </p>
          <Link to={quoteHref} className="inline-block mt-5">
            <Button size="lg" className="rounded-xl h-12 px-6">
              <Send className="w-4 h-4 ms-2" />
              {sector.primaryCta}
            </Button>
          </Link>
        </section>

        {/* Provider CTA */}
        <section className="rounded-2xl border border-border p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold">هل تقدم خدمات في هذا القطاع؟</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              أضف منشأتك في قطاعات ليصل إليك العملاء عند البحث عن مزودي خدمات في مجالك.
            </p>
          </div>
          <Link to="/auth?mode=signup&role=provider">
            <Button variant="outline" className="rounded-xl h-12 px-5">
              <Building2 className="w-4 h-4 ms-2" />
              أضف منشأتك
            </Button>
          </Link>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-h">
          <h2 id="faq-h" className="font-heading text-2xl font-bold mb-5">أسئلة شائعة</h2>
          <div className="space-y-3">
            {sector.faqs.map((f) => (
              <Card key={f.q}>
                <CardContent className="p-5">
                  <h3 className="font-heading font-bold text-base">{f.q}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Related sectors */}
        <section aria-labelledby="related-h">
          <h2 id="related-h" className="font-heading text-2xl font-bold mb-5">قطاعات أخرى قد تحتاجها</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {related.map((r) => (
              <Link key={r.slug} to={`/sectors/${r.slug}`}>
                <Card className="hover-lift h-full">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-sm">{r.shortName}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.cardDescription}</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-4">
            <Link to="/sectors" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              كل القطاعات
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SectorSeoLanding;