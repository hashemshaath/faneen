import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Building2, ArrowLeft, Layers, MessageSquare } from 'lucide-react';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { SECTORS_SEO_LIST } from '@/lib/sectors-seo';
import { buildBreadcrumbList } from '@/lib/seo/structured-data';

const SectorsHub: React.FC = () => {
  usePageMeta({
    title: 'القطاعات | مزودو خدمات الألمنيوم والحديد والخشب والزجاج | قطاعات',
    description:
      'استكشف قطاعات الخدمات في منصة قطاعات، وابحث عن مزودي خدمات الألمنيوم، الحديد، الخشب، الزجاج، الستانلس ستيل، والتصنيع والتركيب في السعودية.',
    canonical: 'https://qitaat.com/sectors',
    ogType: 'website',
  });

  useMultiJsonLd(
    useMemo(() => {
      const blocks: Record<string, unknown>[] = [];
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'القطاعات',
        url: 'https://qitaat.com/sectors',
        inLanguage: 'ar-SA-u-nu-latn',
        description:
          'استكشف قطاعات الخدمات في منصة قطاعات، وابحث عن مزودي خدمات الألمنيوم، الحديد، الخشب، الزجاج، الستانلس ستيل، والتصنيع والتركيب.',
      });
      const bc = buildBreadcrumbList([{ name: 'القطاعات', url: '/sectors' }]);
      if (bc) blocks.push(bc);
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'قطاعات قطاعات',
        numberOfItems: SECTORS_SEO_LIST.length,
        itemListElement: SECTORS_SEO_LIST.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://qitaat.com/sectors/${s.slug}`,
          name: s.shortName,
        })),
      });
      return blocks;
    }, []),
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      {/* Hero */}
      <header className="bg-primary pt-28 pb-12">
        <div className="container px-4">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary-foreground">
            اختر القطاع المناسب لمشروعك
          </h1>
          <p className="mt-3 text-primary-foreground/80 text-sm sm:text-base max-w-2xl leading-relaxed">
            من الأعمال الصغيرة إلى المشاريع التجارية، ابدأ من القطاع الأقرب لاحتياجك، ثم أرسل تفاصيل طلبك لمزودي الخدمة المناسبين.
          </p>
          <div className="mt-6">
            <Link to="/quote">
              <Button size="lg" className="rounded-xl bg-gold text-primary hover:bg-gold/90 font-bold h-12 px-6">
                <Send className="w-4 h-4 ms-2" />
                اطلب عرض سعر
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container px-4 py-12 space-y-14">
        {/* Sector cards */}
        <section aria-labelledby="sectors-h">
          <h2 id="sectors-h" className="sr-only">القطاعات المتاحة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECTORS_SEO_LIST.map((s) => (
              <Card key={s.slug} className="hover-lift h-full">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading text-lg font-bold">{s.shortName}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed flex-1">
                    {s.cardDescription}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to={`/sectors/${s.slug}`}>
                      <Button size="sm" variant="outline" className="rounded-xl">استعرض القطاع</Button>
                    </Link>
                    <Link to={`/quote?sector=${s.slug}`}>
                      <Button size="sm" className="rounded-xl">اطلب عرض سعر</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Not sure which sector */}
        <section className="rounded-2xl bg-card border border-border p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold">غير متأكد من القطاع؟</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              اختر أقرب قطاع لاحتياجك، أو أرسل طلب عرض سعر ووضّح التفاصيل. يمكن توجيه الطلب لاحقًا حسب نوع الخدمة والمدينة.
            </p>
          </div>
          <Link to="/quote">
            <Button className="rounded-xl h-12 px-5">
              <MessageSquare className="w-4 h-4 ms-2" />
              أرسل تفاصيل مشروعك
            </Button>
          </Link>
        </section>

        {/* Provider CTA */}
        <section className="rounded-2xl bg-primary/5 border border-primary/10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold">هل تقدم خدمات في أحد هذه القطاعات؟</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
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

        {/* Cross-link hubs (internal linking — SEO-6) */}
        <nav aria-label="روابط أقسام أخرى" className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-heading text-lg font-bold mb-3">استكشف أقسام أخرى</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            <li>
              <Link to="/services" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary">
                تصفّح كل الخدمات
              </Link>
            </li>
            <li>
              <Link to="/brands" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary">
                دليل العلامات التجارية
              </Link>
            </li>
            <li>
              <Link to="/showcase" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:border-primary/40 hover:text-primary">
                أعمال ومشاريع المزودين
              </Link>
            </li>
          </ul>
        </nav>
      </main>

      <Footer />
    </div>
  );
};

export default SectorsHub;