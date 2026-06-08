import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import { Bi, useBi } from '@/components/common/Bilingual';
import { RentalCategories, RentalItems, RENTAL_UNITS } from '@/modules/rentals';
import type { RentalCategory, RentalItem } from '@/modules/rentals';
import { useSeoPage } from '@/modules/seo/useSeoPage';
import { buildBreadcrumbList } from '@/lib/seo/structured-data';
import { Loader2, Package } from 'lucide-react';

/** Public rentals catalog — approved & published only. */
const RentalsCatalog: React.FC = () => {
  const { isRTL } = useLanguage();
  const bi = useBi();
  const [cats, setCats] = useState<RentalCategory[]>([]);
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, i] = await Promise.all([
        RentalCategories.listCategories(),
        RentalItems.listPublishedItems(),
      ]);
      setCats(c.data ?? []);
      setItems(i.data ?? []);
      setLoading(false);
    })();
  }, []);

  useSeoPage({
    kind: 'service',
    lang: isRTL ? 'ar' : 'en',
    name: bi('تأجير معدات التشييد والبناء','Construction Equipment Rental'),
    customDescription: bi(
      'استأجر سقالات، حاويات، مولدات ومعدات تشييد من مزودين موثوقين في السعودية عبر منصة قِطاعات.',
      'Rent scaffolding, containers, generators and construction equipment from trusted providers across Saudi Arabia on Qitaat.',
    ),
    keywords: ['تأجير معدات','تأجير سقالات','rental','scaffolding rental','equipment rental Saudi'],
    canonical: 'https://qitaat.com/rentals',
    jsonLd: [
      buildBreadcrumbList([{ name: bi('التأجير','Rentals'), url: '/rentals' }]),
    ].filter(Boolean) as Record<string, unknown>[],
  });

  return (
    <main className="container mx-auto px-4 py-10 space-y-8 pb-16">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">
          <Bi ar="تأجير معدات وخدمات التشييد" en="Construction Equipment & Services Rental" />
        </h1>
        <p className="text-muted-foreground">
          <Bi
            ar="استأجر بسهولة من مزودين موثوقين — سقالات، حاويات، مولدات، معدات قص وحفر، وخدمات موقع مساندة."
            en="Rent easily from trusted providers — scaffolding, containers, generators, cutting & drilling equipment, and site support services."
          />
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-3"><Bi ar="التصنيفات" en="Categories" /></h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cats.map(c => (
            <Link key={c.id} to={`/rentals/category/${c.slug}`} className="block">
              <Card className="p-4 hover-lift">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2"><Package className="size-5" /></div>
                <div className="font-medium">{isRTL ? c.name_ar : c.name_en}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{isRTL ? c.description_ar : c.description_en}</div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3"><Bi ar="عناصر متاحة" en="Available items" /></h2>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Bi ar="لا توجد عناصر منشورة بعد. تابعنا قريباً." en="No published items yet — check back soon." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map(it => (
              <Link key={it.id} to={it.seo_slug ? `/rentals/${it.seo_slug}` : '#'} className="block">
                <Card className="p-4 hover-lift h-full">
                  <div className="font-medium">{isRTL ? it.name_ar : (it.name_en || it.name_ar)}</div>
                  <div className="text-sm text-muted-foreground mt-2 tech-content">
                    {it.base_price} {it.currency} / {RENTAL_UNITS.find(u => u.value === it.unit)?.[isRTL ? 'ar' : 'en']}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default RentalsCatalog;