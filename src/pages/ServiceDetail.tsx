import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList, buildFaqPage, buildService, SITE_URL } from '@/lib/seo/structured-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Clock, ShieldCheck, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import {
  getServiceBySlug, getRelatedServices, SECTOR_LABEL, QUALITY_LABEL, UNIT_LABEL,
} from '@/lib/services-catalog';
import { getServiceContent, SECTOR_HERO } from '@/lib/service-seo-content';

const ServiceDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isRTL, language } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const service = getServiceBySlug(slug);

  // Hooks must run unconditionally — keep before early return
  const name = service ? (language === 'ar' ? service.name_ar : service.name_en) : '';
  const desc = service ? (language === 'ar' ? service.description_ar : service.description_en) : '';
  const sectorName = service ? (isRTL ? SECTOR_LABEL[service.sector].ar : SECTOR_LABEL[service.sector].en) : '';
  const unitLabel = service ? (isRTL ? UNIT_LABEL[service.unit].ar : UNIT_LABEL[service.unit].en) : '';

  usePageMeta({
    title: service
      ? (isRTL
          ? `${name} | مزودو خدمات البناء والتشييد | قِطاعات`
          : `${name} | Construction service providers | Qitaat`)
      : (isRTL ? 'الخدمة غير موجودة' : 'Service not found'),
    description: service
      ? (isRTL
          ? `استعرض مزودي خدمة ${name} ضمن قطاعات البناء والتشييد، مع تصنيف حسب القطاع والموقع والجهات المتخصصة على قِطاعات.`
          : `Browse ${name} providers across construction sectors on Qitaat, filtered by sector, location and specialised firms.`)
      : (isRTL ? 'الخدمة غير موجودة' : 'Service not found'),
    keywords: service?.keywords.join(', '),
    canonical: service ? `${SITE_URL}/services/${service.slug}` : `${SITE_URL}/services`,
    noindex: !service,
  });

  const relatedForLd = service ? getRelatedServices(service.slug, 3) : [];
  useMultiJsonLd(
    service
      ? [
          buildBreadcrumbList([
            { name: isRTL ? 'الخدمات والأسعار' : 'Services & Pricing', url: '/services' },
            { name, url: `/services/${service.slug}` },
          ]),
          buildService({
            name,
            description: desc,
            serviceType: sectorName,
            areaServed: isRTL ? 'المملكة العربية السعودية' : 'Saudi Arabia',
            url: `/services/${service.slug}`,
            providerName: 'قِطاعات Qitaat',
            providerUrl: '/',
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name,
            description: desc,
            category: sectorName,
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'SAR',
              lowPrice: service.price_min,
              highPrice: service.price_max,
              offerCount: 10,
              availability: 'https://schema.org/InStock',
            },
          },
          buildFaqPage(
            service.faq.map((q) => ({
              q: language === 'ar' ? q.q_ar : q.q_en,
              a: language === 'ar' ? q.a_ar : q.a_en,
            })),
          ),
          // SEO-3 — ItemList of the visibly-rendered "related services" cards.
          // Sourced from the static services catalog, all items resolve to
          // canonical `/services/:slug` pages.
          ...(relatedForLd.length > 0
            ? [{
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                '@id': `${SITE_URL}/services/${service.slug}#related`,
                name: isRTL
                  ? `خدمات ${sectorName} ذات صلة`
                  : `Related ${sectorName} services`,
                numberOfItems: relatedForLd.length,
                itemListElement: relatedForLd.map((r, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  url: `${SITE_URL}/services/${r.slug}`,
                  name: isRTL ? r.name_ar : r.name_en,
                })),
              }]
            : []),
        ]
      : null,
  );

  if (!service) return <Navigate to="/services" replace />;

  const related = relatedForLd;
  const midPrice = Math.round((service.price_min + service.price_max) / 2);
  const content = getServiceContent(service.slug);
  const heroImg = SECTOR_HERO[service.sector];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="container py-8 md:py-12">
          <nav className="text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground">{isRTL ? 'الرئيسية' : 'Home'}</Link>
            <span className="mx-2">/</span>
            <Link to="/services" className="hover:text-foreground">
              {isRTL ? 'الخدمات والأسعار' : 'Services & Pricing'}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{name}</span>
          </nav>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <header>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary">{sectorName}</Badge>
                  <Badge variant="outline" className="gap-1">
                    <Star className="h-3 w-3 text-amber-500" />
                    {isRTL ? QUALITY_LABEL[service.quality].ar : QUALITY_LABEL[service.quality].en}
                  </Badge>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{name}</h1>
                <p className="text-muted-foreground text-lg">
                  {isRTL ? service.tagline_ar : service.tagline_en}
                </p>
              </header>

              {heroImg && (
                <figure className="rounded-xl overflow-hidden border bg-muted">
                  <img
                    src={heroImg}
                    alt={isRTL ? `${name} — ${sectorName} في السعودية` : `${name} — ${sectorName} in Saudi Arabia`}
                    width={1280}
                    height={720}
                    loading="eager"
                    decoding="async"
                    {...{ fetchpriority: 'high' }}
                    className="w-full h-auto object-cover aspect-[16/9]"
                  />
                  <figcaption className="sr-only">
                    {isRTL ? service.tagline_ar : service.tagline_en}
                  </figcaption>
                </figure>
              )}

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3">
                    {isRTL ? 'وصف الخدمة' : 'Service overview'}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{desc}</p>
                  {content && (
                    <p className="mt-3 text-foreground/90 leading-relaxed">
                      {isRTL ? content.intro_ar : content.intro_en}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {isRTL ? 'المزايا والمواصفات' : 'Features & specs'}
                  </h2>
                  <ul className="grid sm:grid-cols-2 gap-2.5">
                    {service.features.map((ft) => (
                      <li key={ft.id} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{isRTL ? ft.ar : ft.en}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {content && content.sections.length > 0 && (
                <article className="space-y-6">
                  {content.sections.map((sec, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <h2 className="text-xl md:text-2xl font-semibold mb-3 tracking-tight">
                          {isRTL ? sec.h2_ar : sec.h2_en}
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                          {isRTL ? sec.body_ar : sec.body_en}
                        </p>
                        {sec.subsections && sec.subsections.length > 0 && (
                          <div className="mt-4 grid sm:grid-cols-2 gap-4">
                            {sec.subsections.map((sub, j) => (
                              <div key={j} className="rounded-lg border p-4 bg-muted/30">
                                <h3 className="font-semibold mb-1.5">
                                  {isRTL ? sub.h3_ar : sub.h3_en}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {isRTL ? sub.body_ar : sub.body_en}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </article>
              )}

              {content && content.cases.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl md:text-2xl font-semibold mb-4 tracking-tight">
                      {isRTL ? 'حالات واقعية من السوق السعودي' : 'Real cases from the Saudi market'}
                    </h2>
                    <div className="space-y-4">
                      {content.cases.map((c, i) => (
                        <div key={i} className="rounded-lg border p-4 bg-muted/20">
                          <h3 className="font-semibold mb-1">
                            {isRTL ? c.title_ar : c.title_en}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-3">
                            {isRTL ? `📍 ${c.city_ar}` : `📍 ${c.city_en}`}
                          </p>
                          <dl className="grid sm:grid-cols-3 gap-3 text-sm">
                            <div>
                              <dt className="font-medium text-foreground/80 mb-1">
                                {isRTL ? 'التحدي' : 'Challenge'}
                              </dt>
                              <dd className="text-muted-foreground">{isRTL ? c.problem_ar : c.problem_en}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-foreground/80 mb-1">
                                {isRTL ? 'الحل' : 'Solution'}
                              </dt>
                              <dd className="text-muted-foreground">{isRTL ? c.solution_ar : c.solution_en}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                                {isRTL ? 'النتيجة' : 'Outcome'}
                              </dt>
                              <dd className="text-muted-foreground">{isRTL ? c.outcome_ar : c.outcome_en}</dd>
                            </div>
                          </dl>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {content && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-lg font-semibold mb-3 text-emerald-700 dark:text-emerald-400">
                        {isRTL ? '✓ نصائح قبل الشراء' : '✓ Tips before buying'}
                      </h2>
                      <ul className="space-y-2 text-sm">
                        {(isRTL ? content.tips_ar : content.tips_en).map((t, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{t}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-lg font-semibold mb-3 text-rose-700 dark:text-rose-400">
                        {isRTL ? '✕ أخطاء شائعة تجنّبها' : '✕ Common mistakes to avoid'}
                      </h2>
                      <ul className="space-y-2 text-sm">
                        {(isRTL ? content.mistakes_ar : content.mistakes_en).map((m, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-rose-600 mt-0.5 shrink-0">✕</span>
                            <span className="text-muted-foreground">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}

              {service.faq.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4">
                      {isRTL ? 'أسئلة شائعة' : 'Frequently asked questions'}
                    </h2>
                    <div className="space-y-3">
                      {service.faq.map((q, i) => (
                        <details key={i} className="group rounded-lg border p-3">
                          <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
                            <span>{language === 'ar' ? q.q_ar : q.q_en}</span>
                            <span className="text-muted-foreground group-open:rotate-180 transition">▾</span>
                          </summary>
                          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                            {language === 'ar' ? q.a_ar : q.a_en}
                          </p>
                        </details>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar — pricing + actions */}
            <aside className="space-y-4">
              <Card className="sticky top-24">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {isRTL ? 'نطاق السعر التقديري' : 'Estimated price range'}
                    </p>
                    <p className="tech-content text-2xl font-bold">
                      {service.price_min.toLocaleString()}–{service.price_max.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ms-1">
                        {isRTL ? 'ريال' : 'SAR'} / {unitLabel}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 tech-content">
                      {isRTL ? 'متوسط: ' : 'Avg: '}
                      {midPrice.toLocaleString()} {isRTL ? 'ريال' : 'SAR'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'مدة التنفيذ' : 'Lead time'}</p>
                      <p className="font-semibold inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span className="tech-content">{service.lead_time_days}</span> {isRTL ? 'يوم' : 'days'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{isRTL ? 'الضمان' : 'Warranty'}</p>
                      <p className="font-semibold inline-flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span className="tech-content">{service.warranty_years}</span> {isRTL ? 'سنة' : 'yrs'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <Button asChild className="w-full">
                      <Link to={`/sectors/${service.sector}`}>
                        {isRTL ? 'تصفح موردي ' : 'Browse '}{sectorName}
                        <Arrow className="h-4 w-4 ms-1" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/services">
                        {isRTL ? 'مقارنة جميع الخدمات' : 'Compare all services'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>

          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold mb-4">
                {isRTL ? `خدمات ${sectorName} ذات صلة` : `Related ${sectorName} services`}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {related.map((r) => (
                  <Card key={r.slug} className="hover-lift">
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-1">
                        <Link to={`/services/${r.slug}`} className="hover:underline">
                          {isRTL ? r.name_ar : r.name_en}
                        </Link>
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {isRTL ? r.tagline_ar : r.tagline_en}
                      </p>
                      <p className="tech-content text-sm font-medium">
                        {r.price_min.toLocaleString()}–{r.price_max.toLocaleString()} {isRTL ? 'ريال' : 'SAR'}
                        <span className="text-muted-foreground"> / {isRTL ? UNIT_LABEL[r.unit].ar : UNIT_LABEL[r.unit].en}</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ServiceDetail;
