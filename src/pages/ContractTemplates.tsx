import React, { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, ArrowRight, AlertTriangle, ListChecks, HelpCircle } from 'lucide-react';
import { CONTRACT_TEMPLATES } from '@/data/contractTemplates';

// Re-exported so existing test imports (`@/pages/ContractTemplates`)
// keep resolving after the static catalog moved to `src/data/contractTemplates.ts`.
// No content, route or JSON-LD change — Audit Pass 2D.
export { CONTRACT_TEMPLATES };

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
            <Link to={`/quote?sector=${template.quote_sector}`} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition">
              {isRTL ? `اطلب عرض سعر لأعمال ${template.sector_ar}` : `Request a quote — ${template.sector_en}`}
            </Link>
            <Link to={`/search?sector=${template.quote_sector}`} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition">
              {isRTL ? `استعرض مزودي ${template.sector_ar}` : `Browse ${template.sector_en} providers`}
            </Link>
            <Link to="/register-entity" className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition">
              {isRTL ? 'سجّل منشأتك' : 'Register your business'}
            </Link>
            <Link to="/contracts/request" className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition">
              {isRTL ? 'أنشئ عقدك بعد تسجيل الدخول' : 'Create a contract after sign-in'}
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
              <Link to={`/quote?sector=${template.quote_sector}`}>
                {isRTL ? `اطلب عرض سعر لأعمال ${template.sector_ar}` : `Request a quote — ${template.sector_en}`}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/search?sector=${template.quote_sector}`}>
                {isRTL ? `استعرض مزودي ${template.sector_ar}` : `Browse ${template.sector_en} providers`}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/register-entity">{isRTL ? 'سجّل منشأتك' : 'Register your business'}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/contracts/request">{isRTL ? 'أنشئ عقدك بعد تسجيل الدخول' : 'Create a contract after sign-in'}</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContractTemplates;