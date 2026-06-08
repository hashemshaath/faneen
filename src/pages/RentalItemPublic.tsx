import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import { Bi, useBi } from '@/components/common/Bilingual';
import { RentalItems, RENTAL_UNITS } from '@/modules/rentals';
import type { RentalItem } from '@/modules/rentals';
import { useSeoPage } from '@/modules/seo/useSeoPage';
import { buildBreadcrumbList, buildService } from '@/lib/seo/structured-data';
import { Loader2 } from 'lucide-react';

const RentalItemPublic: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isRTL } = useLanguage();
  const bi = useBi();
  const [item, setItem] = useState<RentalItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await RentalItems.getPublishedItemBySlug(slug);
      setItem(data);
      setLoading(false);
    })();
  }, [slug]);

  const name = item ? (isRTL ? item.name_ar : (item.name_en || item.name_ar)) : '';
  useSeoPage({
    kind: 'service',
    lang: isRTL ? 'ar' : 'en',
    name: name || bi('عنصر تأجير','Rental item'),
    customDescription: item ? (isRTL ? (item.description_ar || '') : (item.description_en || '')) : '',
    canonical: `https://qitaat.com/rentals/${slug}`,
    jsonLd: [
      buildBreadcrumbList([
        { name: bi('التأجير','Rentals'), url: '/rentals' },
        { name: name || slug || '' },
      ]),
      item ? buildService({ name, description: isRTL ? item.description_ar || '' : item.description_en || '', serviceType: 'Rental', url: `/rentals/${slug}` }) : null,
    ].filter(Boolean) as Record<string, unknown>[],
  });

  if (loading) return <main className="container mx-auto py-10 flex justify-center"><Loader2 className="size-5 animate-spin" /></main>;
  if (!item) return (
    <main className="container mx-auto py-10">
      <Card className="p-8 text-center text-muted-foreground"><Bi ar="العنصر غير متاح." en="Item not available." /></Card>
      <div className="mt-4 text-center"><Link to="/rentals" className="text-primary underline"><Bi ar="عودة للتأجير" en="Back to rentals" /></Link></div>
    </main>
  );

  return (
    <main className="container mx-auto px-4 py-10 space-y-6 pb-16">
      <h1 className="text-3xl font-bold">{name}</h1>
      <div className="text-sm text-muted-foreground tech-content">{item.ref_id}</div>
      <Card className="p-6 space-y-3">
        <div className="text-lg tech-content">{item.base_price} {item.currency} / {RENTAL_UNITS.find(u => u.value === item.unit)?.[isRTL ? 'ar' : 'en']}</div>
        {item.description_ar && isRTL && <p className="text-muted-foreground whitespace-pre-line">{item.description_ar}</p>}
        {item.description_en && !isRTL && <p className="text-muted-foreground whitespace-pre-line">{item.description_en}</p>}
        {item.usage_terms && <div><div className="text-sm font-medium mb-1"><Bi ar="شروط الاستخدام" en="Usage terms" /></div><div className="text-sm text-muted-foreground">{item.usage_terms}</div></div>}
        {item.late_terms && <div><div className="text-sm font-medium mb-1"><Bi ar="شروط التأخير" en="Late terms" /></div><div className="text-sm text-muted-foreground">{item.late_terms}</div></div>}
        {item.penalty_terms && <div><div className="text-sm font-medium mb-1"><Bi ar="شروط جزائية" en="Penalty terms" /></div><div className="text-sm text-muted-foreground">{item.penalty_terms}</div></div>}
      </Card>
    </main>
  );
};

export default RentalItemPublic;