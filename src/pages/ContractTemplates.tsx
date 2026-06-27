import React, { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, ArrowRight } from 'lucide-react';

interface ContractTemplateInfo {
  slug: string;
  sector_ar: string;
  sector_en: string;
  title_ar: string;
  title_en: string;
  desc_ar: string;
  desc_en: string;
  use_cases_ar: string[];
  use_cases_en: string[];
  scope_ar: string[];
  scope_en: string[];
}

export const CONTRACT_TEMPLATES: ContractTemplateInfo[] = [
  {
    slug: 'aluminum-glass',
    sector_ar: 'الألمنيوم والزجاج',
    sector_en: 'Aluminum & Glass',
    title_ar: 'قالب عقد تنفيذ أعمال الألمنيوم والزجاج',
    title_en: 'Aluminum & Glass Works Contract Template',
    desc_ar: 'قالب عام لتوثيق نطاق وتسليم أعمال الألمنيوم والزجاج للمشاريع السكنية والتجارية بشكل احترافي.',
    desc_en: 'A general template to document the scope and delivery of aluminum and glass works for residential and commercial projects.',
    use_cases_ar: ['أبواب وشبابيك ألمنيوم', 'واجهات زجاجية', 'قواطع زجاج مكتبية', 'مظلات ألمنيوم'],
    use_cases_en: ['Aluminum doors & windows', 'Glass facades', 'Office glass partitions', 'Aluminum canopies'],
    scope_ar: ['المعاينة والمقاسات', 'التوريد والتصنيع', 'التركيب والاختبار', 'الضمان وما بعد التسليم'],
    scope_en: ['Site visit & measurements', 'Supply & fabrication', 'Installation & testing', 'Warranty & handover'],
  },
  {
    slug: 'steel-metal',
    sector_ar: 'الحديد والمعادن',
    sector_en: 'Steel & Metal',
    title_ar: 'قالب عقد أعمال الحديد والمعادن',
    title_en: 'Steel & Metal Works Contract Template',
    desc_ar: 'قالب عام لأعمال الحديد المشغول والهياكل المعدنية والدرابزين والأبواب الحديدية.',
    desc_en: 'A general template covering wrought iron, steel structures, railings and metal doors.',
    use_cases_ar: ['أبواب وبوابات حديد', 'درابزين وسلالم', 'هياكل ومظلات', 'حمايات شبابيك'],
    use_cases_en: ['Steel doors & gates', 'Railings & staircases', 'Structures & canopies', 'Window grilles'],
    scope_ar: ['الرسومات والاعتماد', 'التصنيع بالورشة', 'الدهان والمعالجة', 'التركيب والتسليم'],
    scope_en: ['Shop drawings & approval', 'Workshop fabrication', 'Painting & treatment', 'Installation & handover'],
  },
  {
    slug: 'wood-works',
    sector_ar: 'الأخشاب والنجارة',
    sector_en: 'Wood & Carpentry',
    title_ar: 'قالب عقد أعمال الأخشاب والنجارة',
    title_en: 'Wood & Carpentry Works Contract Template',
    desc_ar: 'قالب عام لأعمال الأبواب الخشبية والأثاث والديكورات الداخلية.',
    desc_en: 'A general template for wooden doors, furniture and interior decoration works.',
    use_cases_ar: ['أبواب خشب', 'دواليب وغرف ملابس', 'ديكورات داخلية', 'أثاث مفصّل'],
    use_cases_en: ['Wooden doors', 'Wardrobes & closets', 'Interior decor', 'Custom furniture'],
    scope_ar: ['تصميم واعتماد', 'تجهيز المصنع', 'النقل والتركيب', 'اللمسات الأخيرة'],
    scope_en: ['Design & approval', 'Factory preparation', 'Delivery & installation', 'Final finishing'],
  },
  {
    slug: 'kitchens',
    sector_ar: 'المطابخ',
    sector_en: 'Kitchens',
    title_ar: 'قالب عقد تصنيع وتركيب المطابخ',
    title_en: 'Kitchens Manufacturing & Installation Contract Template',
    desc_ar: 'قالب عام لتصنيع وتركيب المطابخ بمختلف المواد والأنماط.',
    desc_en: 'A general template for the manufacturing and installation of kitchens across materials and styles.',
    use_cases_ar: ['مطابخ ألمنيوم', 'مطابخ خشب', 'مطابخ بولي لاك', 'مطابخ كوارتز'],
    use_cases_en: ['Aluminum kitchens', 'Wood kitchens', 'Polylac kitchens', 'Quartz kitchens'],
    scope_ar: ['المعاينة والتصميم', 'تجهيز الكاونترات', 'التركيب والربط', 'التشغيل والتسليم'],
    scope_en: ['Site visit & design', 'Countertop preparation', 'Installation & hookup', 'Commissioning & handover'],
  },
  {
    slug: 'facades',
    sector_ar: 'الواجهات',
    sector_en: 'Facades',
    title_ar: 'قالب عقد أعمال الواجهات الزجاجية والكلادينج',
    title_en: 'Glass Facades & Cladding Contract Template',
    desc_ar: 'قالب عام لأعمال الواجهات الزجاجية والكلادينج للمنشآت التجارية والمكاتب.',
    desc_en: 'A general template for glass facades and cladding for commercial buildings and offices.',
    use_cases_ar: ['واجهات سترة', 'كلادينج خارجي', 'سكاي لايت', 'واجهات سبايدر'],
    use_cases_en: ['Curtain wall', 'External cladding', 'Skylights', 'Spider facades'],
    scope_ar: ['الاستلام والمسح', 'التصنيع', 'التركيب على ارتفاع', 'اختبار التسريب'],
    scope_en: ['Survey & handover', 'Fabrication', 'High-level installation', 'Leak testing'],
  },
  {
    slug: 'stainless-railings',
    sector_ar: 'الستانلس ستيل والدرابزين',
    sector_en: 'Stainless Steel & Railings',
    title_ar: 'قالب عقد أعمال الستانلس ستيل والدرابزين',
    title_en: 'Stainless Steel & Railings Contract Template',
    desc_ar: 'قالب عام لأعمال الستانلس ستيل والدرابزين للمطاعم والفلل والمنشآت.',
    desc_en: 'A general template for stainless steel and railing works in restaurants, villas and facilities.',
    use_cases_ar: ['درابزين سلالم', 'حواجز شرفات', 'تجهيزات مطاعم', 'تجهيزات مطابخ مهنية'],
    use_cases_en: ['Stair railings', 'Balcony barriers', 'Restaurant fittings', 'Professional kitchen fittings'],
    scope_ar: ['المعاينة', 'التصنيع بالورشة', 'التركيب الموقعي', 'التلميع والتسليم'],
    scope_en: ['Site visit', 'Workshop fabrication', 'On-site installation', 'Polishing & handover'],
  },
];

const ContractTemplates: React.FC = () => {
  const { isRTL } = useLanguage();

  usePageMeta({
    title: isRTL
      ? 'قوالب عقود تنفيذ الأعمال | قطاعات'
      : 'Work Execution Contract Templates | Qitaat',
    description: isRTL
      ? 'قوالب عقود عامة لتنفيذ أعمال الألمنيوم والزجاج والحديد والخشب والمطابخ والواجهات والستانلس ستيل، بدون أي بيانات عقد حقيقي.'
      : 'General contract templates for aluminum, glass, steel, wood, kitchens, facades and stainless steel works — no real contract data.',
    canonical: 'https://qitaat.com/contract-templates',
  });

  useMultiJsonLd(useMemo(() => [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: isRTL ? 'قوالب عقود تنفيذ الأعمال' : 'Work Execution Contract Templates',
      url: 'https://qitaat.com/contract-templates',
      description: isRTL
        ? 'قوالب عقود عامة وتعليمية لمختلف قطاعات الصناعات الخفيفة.'
        : 'General educational contract templates across light-industry sectors.',
      hasPart: CONTRACT_TEMPLATES.map((t) => ({
        '@type': 'Article',
        headline: isRTL ? t.title_ar : t.title_en,
        url: `https://qitaat.com/contract-templates/${t.slug}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'قِطاعات', item: 'https://qitaat.com' },
        { '@type': 'ListItem', position: 2, name: isRTL ? 'قوالب العقود' : 'Contract Templates', item: 'https://qitaat.com/contract-templates' },
      ],
    },
  ], [isRTL]));

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
        <header className="mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <FileText className="w-3.5 h-3.5" />
            {isRTL ? 'قوالب عقود عامة' : 'General Contract Templates'}
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2">
            {isRTL ? 'قوالب عقود تنفيذ الأعمال' : 'Work Execution Contract Templates'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            {isRTL
              ? 'قوالب تعليمية عامة لتوثيق نطاق العمل والتسليم. لا تحتوي أي عقد حقيقي أو بيانات أطراف أو أسعار أو مواقع.'
              : 'General educational templates documenting scope and delivery. No real contract data, party names, prices or locations.'}
          </p>
        </header>

        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CONTRACT_TEMPLATES.map((t) => (
            <Link
              key={t.slug}
              to={`/contract-templates/${t.slug}`}
              className="group rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/40 transition"
            >
              <Badge variant="secondary" className="mb-3">{isRTL ? t.sector_ar : t.sector_en}</Badge>
              <h2 className="font-semibold text-lg mb-1.5 group-hover:text-primary transition">
                {isRTL ? t.title_ar : t.title_en}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-3">{isRTL ? t.desc_ar : t.desc_en}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
                {isRTL ? 'استعرض القالب' : 'View template'}
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </div>
            </Link>
          ))}
        </section>

        <div className="mt-10 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
          <h3 className="font-semibold text-lg mb-2">{isRTL ? 'جاهز لإنشاء عقدك؟' : 'Ready to create your contract?'}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isRTL ? 'سجّل في قطاعات لإنشاء عقد كامل بأطراف وبنود واضحة.' : 'Register on Qitaat to create a full contract with clear parties and clauses.'}
          </p>
          <Button asChild>
            <Link to="/auth">{isRTL ? 'سجل لإنشاء عقد' : 'Register to create a contract'}</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const ContractTemplateDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isRTL } = useLanguage();
  const template = CONTRACT_TEMPLATES.find((t) => t.slug === slug);

  usePageMeta({
    title: template
      ? (isRTL ? `${template.title_ar} | قطاعات` : `${template.title_en} | Qitaat`)
      : (isRTL ? 'قالب عقد | قطاعات' : 'Contract Template | Qitaat'),
    description: template
      ? (isRTL ? template.desc_ar : template.desc_en)
      : (isRTL ? 'قوالب عقود عامة' : 'General contract templates'),
    canonical: template ? `https://qitaat.com/contract-templates/${template.slug}` : 'https://qitaat.com/contract-templates',
  });

  useMultiJsonLd(useMemo(() => {
    if (!template) return [];
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: isRTL ? template.title_ar : template.title_en,
        description: isRTL ? template.desc_ar : template.desc_en,
        url: `https://qitaat.com/contract-templates/${template.slug}`,
        about: isRTL ? template.sector_ar : template.sector_en,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: isRTL ? template.title_ar : template.title_en,
        serviceType: isRTL ? template.sector_ar : template.sector_en,
        description: isRTL ? template.desc_ar : template.desc_en,
        url: `https://qitaat.com/contract-templates/${template.slug}`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'قِطاعات', item: 'https://qitaat.com' },
          { '@type': 'ListItem', position: 2, name: isRTL ? 'قوالب العقود' : 'Contract Templates', item: 'https://qitaat.com/contract-templates' },
          { '@type': 'ListItem', position: 3, name: isRTL ? template.title_ar : template.title_en, item: `https://qitaat.com/contract-templates/${template.slug}` },
        ],
      },
    ];
  }, [template, isRTL]));

  if (!template) {
    return <Navigate to="/contract-templates" replace />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        <nav className="text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">{isRTL ? 'الرئيسية' : 'Home'}</Link>
          <span className="mx-2">/</span>
          <Link to="/contract-templates" className="hover:text-primary">{isRTL ? 'قوالب العقود' : 'Contract Templates'}</Link>
        </nav>

        <header className="mb-8">
          <Badge variant="secondary" className="mb-3">{isRTL ? template.sector_ar : template.sector_en}</Badge>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3">
            {isRTL ? template.title_ar : template.title_en}
          </h1>
          <p className="text-muted-foreground text-base">{isRTL ? template.desc_ar : template.desc_en}</p>
        </header>

        <section className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">{isRTL ? 'الحالات المناسبة' : 'Suitable use cases'}</h2>
            <ul className="space-y-2">
              {(isRTL ? template.use_cases_ar : template.use_cases_en).map((u) => (
                <li key={u} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{u}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">{isRTL ? 'نطاق العمل العام' : 'General scope of work'}</h2>
            <ul className="space-y-2">
              {(isRTL ? template.scope_ar : template.scope_en).map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            {isRTL
              ? 'هذا قالب تعليمي عام، ولا يحتوي أي بيانات عقد حقيقي أو أسماء أطراف أو أسعار.'
              : 'This is a general educational template. It contains no real contract data, party names, or prices.'}
          </p>
          <Button asChild>
            <Link to="/auth">{isRTL ? 'ابدأ طلب عقد' : 'Start a contract request'}</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContractTemplates;