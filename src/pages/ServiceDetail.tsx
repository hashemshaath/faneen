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
          ? `${name} — أسعار ومقارنة 2026 | قِطاعات`
          : `${name} — prices & comparison 2026 | Qitaat`)
      : (isRTL ? 'الخدمة غير موجودة' : 'Service not found'),
    description: desc || (isRTL ? 'الخدمة غير موجودة' : 'Service not found'),
    keywords: service?.keywords.join(', '),
    canonical: service ? `${SITE_URL}/services/${service.slug}` : `${SITE_URL}/services`,
  });

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
        ]
      : null,
  );

  if (!service) return <Navigate to="/services" replace />;

  const related = getRelatedServices(service.slug, 3);
  const midPrice = Math.round((service.price_min + service.price_max) / 2);

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

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-3">
                    {isRTL ? 'وصف الخدمة' : 'Service overview'}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{desc}</p>
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
