import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { buildBreadcrumbList, SITE_URL } from '@/lib/seo/structured-data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search as SearchIcon, ArrowLeft, ArrowRight, Star, Clock, ShieldCheck, FileText, Layers } from 'lucide-react';
import {
  SERVICES_CATALOG, SECTOR_LABEL, QUALITY_LABEL, UNIT_LABEL,
  listAllFeatures, type QualityTier,
} from '@/lib/services-catalog';
import type { SectorSlug } from '@/lib/sector-keywords';

const ALL = 'all';

const Services: React.FC = () => {
  const { isRTL, language } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const [query, setQuery] = useState('');
  const [sector, setSector] = useState<SectorSlug | typeof ALL>(ALL);
  const [quality, setQuality] = useState<QualityTier | typeof ALL>(ALL);
  const [feature, setFeature] = useState<string>(ALL);

  const features = useMemo(() => listAllFeatures(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES_CATALOG.filter((s) => {
      if (sector !== ALL && s.sector !== sector) return false;
      if (quality !== ALL && s.quality !== quality) return false;
      if (feature !== ALL && !s.features.some((f) => f.id === feature)) return false;
      if (q) {
        const hay = `${s.name_ar} ${s.name_en} ${s.tagline_ar} ${s.tagline_en} ${s.keywords.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, sector, quality, feature]);

  usePageMeta({
    title: isRTL
      ? 'مقارنة وأسعار خدمات القطاعات الصناعية | قِطاعات'
      : 'Compare prices for industrial services | Qitaat',
    description: isRTL
      ? 'قائمة شفافة بأسعار خدمات الألمنيوم والزجاج والحديد والخشب والمطابخ في السعودية مع فلترة بالمزايا وجودة العمل والضمان.'
      : 'A transparent price list for aluminum, glass, steel, wood, and kitchen services in Saudi Arabia, filtered by features, quality, and warranty.',
    keywords: 'أسعار شبابيك ألمنيوم, سعر متر كلادينج, سعر مطابخ, مظلات سيارات, اسعار باركيه, services pricing saudi',
    canonical: `${SITE_URL}/services`,
  });

  useMultiJsonLd([
    buildBreadcrumbList([
      { name: isRTL ? 'الخدمات والأسعار' : 'Services & Pricing', url: '/services' },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: isRTL ? 'الخدمات والأسعار' : 'Services & Pricing',
      url: `${SITE_URL}/services`,
      hasPart: SERVICES_CATALOG.map((s) => ({
        '@type': 'Service',
        name: language === 'ar' ? s.name_ar : s.name_en,
        url: `${SITE_URL}/services/${s.slug}`,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'SAR',
          lowPrice: s.price_min,
          highPrice: s.price_max,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: SERVICES_CATALOG.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/services/${s.slug}`,
        name: language === 'ar' ? s.name_ar : s.name_en,
      })),
    },
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="container py-10">
          <nav className="text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground">{isRTL ? 'الرئيسية' : 'Home'}</Link>
            <span className="mx-2">/</span>
            <span>{isRTL ? 'الخدمات والأسعار' : 'Services & Pricing'}</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              {isRTL ? 'مقارنة الأسعار وجودة الخدمات' : 'Compare Prices & Service Quality'}
            </h1>
            <p className="text-muted-foreground max-w-3xl">
              {isRTL
                ? 'قائمة شفافة بأسعار خدمات الألمنيوم والزجاج والحديد والخشب والمطابخ في السوق السعودي. استخدم الفلاتر للمقارنة بين المزايا وجودة العمل ومدة التنفيذ والضمان.'
                : 'A transparent price list for aluminum, glass, steel, wood, and kitchen services in the Saudi market. Use the filters to compare features, quality, lead time, and warranty.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild className="rounded-xl h-11">
                <Link to="/quote">
                  <FileText className="h-4 w-4 me-1.5" />
                  {isRTL ? 'اطلب عرض سعر' : 'Request a quote'}
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl h-11">
                <Link to="/sectors">
                  <Layers className="h-4 w-4 me-1.5" />
                  {isRTL ? 'استكشف القطاعات' : 'Explore sectors'}
                </Link>
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isRTL
                ? 'ابدأ من الخدمة إذا كنت تعرف المطلوب. الأسعار تقديرية وقد تتغير حسب المواصفات والمدينة.'
                : 'Start from the service if you know what you need. Prices are estimates and may vary by spec and city.'}
            </p>
          </header>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                <Input
                  dir="auto"
                  className="ps-9"
                  placeholder={isRTL ? 'ابحث عن خدمة...' : 'Search a service...'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select value={sector} onValueChange={(v) => setSector(v as SectorSlug | typeof ALL)}>
                <SelectTrigger><SelectValue placeholder={isRTL ? 'القطاع' : 'Sector'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{isRTL ? 'كل القطاعات' : 'All sectors'}</SelectItem>
                  {Object.entries(SECTOR_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={quality} onValueChange={(v) => setQuality(v as QualityTier | typeof ALL)}>
                <SelectTrigger><SelectValue placeholder={isRTL ? 'جودة العمل' : 'Quality'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{isRTL ? 'كل المستويات' : 'All tiers'}</SelectItem>
                  {Object.entries(QUALITY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={feature} onValueChange={setFeature}>
                <SelectTrigger><SelectValue placeholder={isRTL ? 'ميزة محددة' : 'Feature'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{isRTL ? 'كل المزايا' : 'All features'}</SelectItem>
                  {features.map((ft) => (
                    <SelectItem key={ft.id} value={ft.id}>{isRTL ? ft.ar : ft.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground mb-4">
            {isRTL ? `عدد النتائج: ${filtered.length}` : `${filtered.length} results`}
          </p>

          {/* Comparison table — desktop */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? 'الخدمة' : 'Service'}</TableHead>
                  <TableHead>{isRTL ? 'القطاع' : 'Sector'}</TableHead>
                  <TableHead className="tech-content">{isRTL ? 'السعر (ريال)' : 'Price (SAR)'}</TableHead>
                  <TableHead>{isRTL ? 'الجودة' : 'Quality'}</TableHead>
                  <TableHead>{isRTL ? 'التنفيذ' : 'Lead time'}</TableHead>
                  <TableHead>{isRTL ? 'الضمان' : 'Warranty'}</TableHead>
                  <TableHead className="text-end" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.slug} className="hover-lift">
                    <TableCell>
                      <Link to={`/services/${s.slug}`} className="font-semibold hover:underline">
                        {isRTL ? s.name_ar : s.name_en}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1 max-w-md">
                        {isRTL ? s.tagline_ar : s.tagline_en}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{isRTL ? SECTOR_LABEL[s.sector].ar : SECTOR_LABEL[s.sector].en}</Badge>
                    </TableCell>
                    <TableCell className="tech-content whitespace-nowrap font-medium">
                      {s.price_min.toLocaleString()}–{s.price_max.toLocaleString()}
                      <span className="text-xs text-muted-foreground ms-1">/{isRTL ? UNIT_LABEL[s.unit].ar : UNIT_LABEL[s.unit].en}</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        {isRTL ? QUALITY_LABEL[s.quality].ar : QUALITY_LABEL[s.quality].en}
                      </span>
                    </TableCell>
                    <TableCell className="tech-content whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        {s.lead_time_days} {isRTL ? 'يوم' : 'days'}
                      </span>
                    </TableCell>
                    <TableCell className="tech-content whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        {s.warranty_years} {isRTL ? 'سنة' : 'yrs'}
                      </span>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/services/${s.slug}`}>
                          {isRTL ? 'تفاصيل' : 'Details'} <Arrow className="h-4 w-4 ms-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {filtered.map((s) => (
              <Card key={s.slug} className="hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to={`/services/${s.slug}`} className="font-semibold hover:underline block">
                        {isRTL ? s.name_ar : s.name_en}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isRTL ? s.tagline_ar : s.tagline_en}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {isRTL ? SECTOR_LABEL[s.sector].ar : SECTOR_LABEL[s.sector].en}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="tech-content font-medium text-foreground">
                      {s.price_min.toLocaleString()}–{s.price_max.toLocaleString()} {isRTL ? 'ريال' : 'SAR'}/{isRTL ? UNIT_LABEL[s.unit].ar : UNIT_LABEL[s.unit].en}
                    </span>
                    <span>•</span>
                    <span>{isRTL ? QUALITY_LABEL[s.quality].ar : QUALITY_LABEL[s.quality].en}</span>
                    <span>•</span>
                    <span className="tech-content">{s.warranty_years} {isRTL ? 'سنة ضمان' : 'yrs warranty'}</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full mt-3">
                    <Link to={`/services/${s.slug}`}>
                      {isRTL ? 'تفاصيل الخدمة' : 'Service details'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <Card className="mt-4">
              <CardContent className="p-8 text-center space-y-4">
                <SearchIcon className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <div>
                  <p className="font-heading font-bold text-foreground mb-1">
                    {isRTL ? 'لا توجد خدمات مطابقة' : 'No services match'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'جرّب توسيع القطاع أو إزالة بعض الفلاتر، أو أرسل طلب عرض سعر وسنساعدك.' : 'Try widening the sector or removing filters, or request a quote and we will help.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button asChild size="sm" className="rounded-xl">
                    <Link to="/quote">{isRTL ? 'اطلب عرض سعر' : 'Request a quote'}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-xl">
                    <Link to="/sectors">{isRTL ? 'استكشف القطاعات' : 'Explore sectors'}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Services;
