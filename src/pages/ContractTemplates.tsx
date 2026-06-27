import React, { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, ArrowRight, AlertTriangle, ListChecks, HelpCircle } from 'lucide-react';

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
  clauses_ar: string[];
  clauses_en: string[];
  attention_ar: string[];
  attention_en: string[];
  sector_route: string;
  related: string[];
  faq: Array<{ q_ar: string; q_en: string; a_ar: string; a_en: string }>;
}

export const CONTRACT_TEMPLATES: ContractTemplateInfo[] = [
];

const COMMON_FAQ: ContractTemplateInfo['faq'] = [
  {
    q_ar: 'ما فائدة قالب عقد تنفيذ الأعمال؟',
    q_en: 'What is the purpose of a work execution contract template?',
    a_ar: 'يساعد القالب الطرفين على توثيق نطاق العمل والتسليم والالتزامات بشكل واضح قبل بدء التنفيذ.',
    a_en: 'It helps both parties document the scope, deliverables and obligations clearly before execution starts.',
  },
  {
    q_ar: 'هل يمكن تعديل البنود؟',
    q_en: 'Can clauses be edited?',
    a_ar: 'نعم، البنود قابلة للتعديل أثناء إنشاء العقد الفعلي على المنصة وفق احتياج الطرفين.',
    a_en: 'Yes, clauses can be edited inside the actual contract draft on the platform to fit both parties.',
  },
  {
    q_ar: 'هل يغني القالب عن مراجعة قانونية؟',
    q_en: 'Does the template replace legal review?',
    a_ar: 'لا، القالب مرجع تعليمي عام، ويُنصح بمراجعة قانونية للعقود ذات القيمة المرتفعة.',
    a_en: 'No, the template is a general educational reference; legal review is recommended for high-value contracts.',
  },
  {
    q_ar: 'هل يمكن إنشاء عقد بعد طلب عرض سعر؟',
    q_en: 'Can a contract be created after a quote request?',
    a_ar: 'نعم، يمكن تحويل عرض السعر المقبول إلى عقد كامل عبر تدفق إنشاء العقد على المنصة.',
    a_en: 'Yes, an accepted quote can be turned into a full contract via the platform contract creation flow.',
  },
];

CONTRACT_TEMPLATES.push(
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
    clauses_ar: ['تعريف نطاق العمل والمواصفات', 'الجدول الزمني ومراحل التسليم', 'التزامات الطرفين', 'الضمان وفترة الصيانة', 'آلية تعديل الأعمال'],
    clauses_en: ['Scope & specifications', 'Timeline & delivery phases', 'Obligations of both parties', 'Warranty & maintenance period', 'Change order mechanism'],
    attention_ar: ['اعتماد المقاسات قبل التصنيع', 'تحديد نوع الزجاج وسماكته', 'توضيح أعمال السيليكون والعزل', 'تحديد جهة استلام التسليم النهائي'],
    attention_en: ['Approve measurements before fabrication', 'Define glass type & thickness', 'Clarify silicone & sealing scope', 'Designate the final handover party'],
    sector_route: '/sectors/aluminum',
    related: ['facades', 'kitchens'],
    faq: COMMON_FAQ,
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
    clauses_ar: ['وصف المواد والسماكات', 'الرسومات التنفيذية', 'مراحل التسليم والدفع', 'الضمان ضد الصدأ', 'مسؤولية النقل والتركيب'],
    clauses_en: ['Material & thickness specs', 'Shop drawings', 'Delivery & payment milestones', 'Anti-rust warranty', 'Transport & installation responsibility'],
    attention_ar: ['اعتماد الدهان ولون النهاية', 'تحديد جودة اللحام', 'التأكد من مطابقة الأبعاد', 'تحديد بنود السلامة'],
    attention_en: ['Approve paint & finish color', 'Define weld quality', 'Verify dimensional accuracy', 'Specify safety requirements'],
    sector_route: '/sectors/steel',
    related: ['stainless-railings', 'aluminum-glass'],
    faq: COMMON_FAQ,
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
    clauses_ar: ['نوع الخشب والقشرة', 'الإكسسوارات والمفصلات', 'دهان وتشطيب', 'الضمان ضد التقوس', 'مدة التسليم'],
    clauses_en: ['Wood & veneer type', 'Accessories & hinges', 'Paint & finishing', 'Anti-warp warranty', 'Delivery period'],
    attention_ar: ['الالتزام بالألوان المعتمدة', 'حماية الأرضيات أثناء التركيب', 'مطابقة المقاسات للموقع', 'توثيق العيوب قبل الاستلام'],
    attention_en: ['Stick to approved colors', 'Protect flooring during installation', 'Match measurements to the site', 'Document defects before acceptance'],
    sector_route: '/sectors/wood',
    related: ['kitchens', 'aluminum-glass'],
    faq: COMMON_FAQ,
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
    clauses_ar: ['نوع الكاونتر والأبواب', 'الإكسسوارات المعتمدة', 'الربط الكهربائي والسباكة', 'الضمان والصيانة', 'جدول التركيب'],
    clauses_en: ['Counter & door type', 'Approved accessories', 'Electrical & plumbing hookup', 'Warranty & maintenance', 'Installation schedule'],
    attention_ar: ['اعتماد التصميم ثلاثي الأبعاد', 'مطابقة فتحات الأجهزة', 'مواقع الإنارة والكهرباء', 'حماية الكاونتر أثناء النقل'],
    attention_en: ['Approve the 3D design', 'Match appliance cut-outs', 'Lighting & electrical positions', 'Protect the counter during transport'],
    sector_route: '/sectors/wood',
    related: ['wood-works', 'aluminum-glass'],
    faq: COMMON_FAQ,
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
    clauses_ar: ['نظام الواجهة المعتمد', 'متطلبات السلامة على ارتفاع', 'اختبارات الأداء والتسريب', 'الضمان على العزل', 'مراحل التسليم'],
    clauses_en: ['Approved facade system', 'Working-at-height safety', 'Performance & leak testing', 'Sealing warranty', 'Delivery milestones'],
    attention_ar: ['الالتزام بمعايير السلامة', 'اعتماد عينة الزجاج والألوان', 'التنسيق مع المقاول الرئيسي', 'التأكد من تصاريح الموقع'],
    attention_en: ['Comply with safety standards', 'Approve glass & color sample', 'Coordinate with main contractor', 'Confirm site permits'],
    sector_route: '/sectors/glass',
    related: ['aluminum-glass', 'steel-metal'],
    faq: COMMON_FAQ,
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
    clauses_ar: ['درجة الستانلس (304/316)', 'سماكة الأنابيب', 'نوع التثبيت', 'الضمان ضد التآكل', 'تشطيب اللمعان أو الساتان'],
    clauses_en: ['Stainless grade (304/316)', 'Tube thickness', 'Fixing method', 'Anti-corrosion warranty', 'Mirror/satin finish'],
    attention_ar: ['تحديد الدرجة المناسبة للبيئة', 'اعتماد عينة اللحام', 'متطلبات السلامة للدرابزين', 'تنظيف اللحامات بعد التركيب'],
    attention_en: ['Pick the right grade for the environment', 'Approve weld sample', 'Railing safety requirements', 'Clean welds after installation'],
    sector_route: '/sectors/stainless-steel',
    related: ['steel-metal', 'facades'],
    faq: COMMON_FAQ,
  },
);

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
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: template.faq.map((f) => ({
          '@type': 'Question',
          name: isRTL ? f.q_ar : f.q_en,
          acceptedAnswer: {
            '@type': 'Answer',
            text: isRTL ? f.a_ar : f.a_en,
          },
        })),
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

        <section className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              {isRTL ? 'أهم البنود العامة' : 'Key general clauses'}
            </h2>
            <ul className="space-y-2">
              {(isRTL ? template.clauses_ar : template.clauses_en).map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {isRTL ? 'نقاط يجب الانتباه لها' : 'Points to watch'}
            </h2>
            <ul className="space-y-2">
              {(isRTL ? template.attention_ar : template.attention_en).map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="related-links" className="rounded-2xl border border-border bg-card p-6 mb-8">
          <h2 id="related-links" className="font-semibold mb-4">
            {isRTL ? 'روابط ذات صلة' : 'Related links'}
          </h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link to={template.sector_route} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition">
              {isRTL ? `قطاع ${template.sector_ar}` : `${template.sector_en} sector`}
            </Link>
            <Link to="/quote" className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition">
              {isRTL ? 'اطلب عرض سعر' : 'Request a quote'}
            </Link>
            <Link to="/search" className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition">
              {isRTL ? 'استعرض مزودي الخدمة' : 'Browse providers'}
            </Link>
            <Link to="/register-entity" className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition">
              {isRTL ? 'ابدأ إنشاء عقد' : 'Start creating a contract'}
            </Link>
          </div>
          {template.related.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                {isRTL ? 'قوالب قريبة' : 'Related templates'}
              </h3>
              <div className="flex flex-wrap gap-2 text-sm">
                {template.related.map((rs) => {
                  const r = CONTRACT_TEMPLATES.find((x) => x.slug === rs);
                  if (!r) return null;
                  return (
                    <Link key={rs} to={`/contract-templates/${r.slug}`} className="px-3 py-1.5 rounded-full border border-border hover:border-primary/40 hover:text-primary transition">
                      {isRTL ? r.title_ar : r.title_en}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="template-faq" className="rounded-2xl border border-border bg-card p-6 mb-8">
          <h2 id="template-faq" className="font-semibold mb-4 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            {isRTL ? 'الأسئلة الشائعة' : 'Frequently asked questions'}
          </h2>
          <dl className="space-y-4">
            {template.faq.map((f, i) => (
              <div key={i}>
                <dt className="font-medium text-sm mb-1">{isRTL ? f.q_ar : f.q_en}</dt>
                <dd className="text-sm text-muted-foreground">{isRTL ? f.a_ar : f.a_en}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            {isRTL
              ? 'هذا قالب تعليمي عام، ولا يحتوي أي بيانات عقد حقيقي أو أسماء أطراف أو أسعار.'
              : 'This is a general educational template. It contains no real contract data, party names, or prices.'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button asChild>
              <Link to="/register-entity">{isRTL ? 'ابدأ إنشاء عقد' : 'Start creating a contract'}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/quote">{isRTL ? 'اطلب عرض سعر' : 'Request a quote'}</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContractTemplates;