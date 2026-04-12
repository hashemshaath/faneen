import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Categories = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { isRTL, language } = useLanguage();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-page'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').eq('is_active', true).order('sort_order');
      return data ?? [];
    },
  });

  const selectedCategory = slug ? categories.find(c => c.slug === slug) : null;
  const catName = selectedCategory ? (language === 'ar' ? selectedCategory.name_ar : selectedCategory.name_en) : '';

  const { data: businesses = [], isLoading: bizLoading } = useQuery({
    queryKey: ['businesses-by-category', selectedCategory?.id],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id, username, name_ar, name_en, logo_url, rating_avg, rating_count, is_verified, city_id, cities(name_ar, name_en)').eq('is_active', true).eq('category_id', selectedCategory!.id).order('rating_avg', { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled: !!selectedCategory?.id,
  });

  usePageMeta({
    title: selectedCategory
      ? (language === 'ar' ? `${catName} - دليل مزودي الخدمات | فنيين` : `${catName} - Service Providers | Faneen`)
      : (language === 'ar' ? 'تصفح الأقسام والفئات | فنيين' : 'Browse Categories | Faneen'),
    description: selectedCategory
      ? (language === 'ar' ? `تصفح أفضل مزودي خدمات ${catName} مع التقييمات والأسعار` : `Browse the best ${catName} service providers`)
      : (language === 'ar' ? 'تصفح جميع أقسام وفئات خدمات الألمنيوم والحديد والزجاج والخشب' : 'Browse all aluminum, iron, glass and wood categories'),
  });

  useMultiJsonLd(useMemo(() => {
    if (!selectedCategory) return null;
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'فنيين', item: 'https://faneen.com' },
        { '@type': 'ListItem', position: 2, name: catName, item: `https://faneen.com/categories/${selectedCategory.slug}` },
      ],
    };
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `كيف أجد أفضل ورشة ${catName} في السعودية؟`,
          acceptedAnswer: { '@type': 'Answer', text: `ابحث في دليل فنيين عن ورش ${catName}. يمكنك تصفية النتائج حسب التقييم والموقع ومقارنة الأسعار والخدمات.` },
        },
        {
          '@type': 'Question',
          name: `ما هي أسعار ${catName} في السعودية؟`,
          acceptedAnswer: { '@type': 'Answer', text: `تتفاوت أسعار ${catName} حسب الجودة والمساحة والموقع. يمكنك طلب عروض أسعار مجانية من خلال دليل فنيين.` },
        },
        {
          '@type': 'Question',
          name: `هل يمكنني الاطلاع على أعمال ورش ${catName} السابقة؟`,
          acceptedAnswer: { '@type': 'Answer', text: `نعم، كل ورشة في دليل فنيين تملك معرض صور لأعمالها السابقة يمكنك الاطلاع عليه قبل التواصل.` },
        },
      ],
    };
    return [breadcrumb, faq];
  }, [selectedCategory, catName]));

  if (slug && selectedCategory) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="bg-primary pt-24 pb-10">
          <div className="container px-4">
            <div className="flex items-center gap-2 text-sm text-primary-foreground/60 mb-3">
              <Link to="/categories" className="hover:text-gold transition-colors">{isRTL ? 'الأقسام' : 'Categories'}</Link>
              <span>/</span>
              <span className="text-primary-foreground">{catName}</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">{catName}</h1>
            {selectedCategory.description_ar && <p className="mt-2 text-primary-foreground/70 text-sm max-w-2xl">{language === 'ar' ? selectedCategory.description_ar : (selectedCategory.description_en || selectedCategory.description_ar)}</p>}
            <p className="mt-2 text-primary-foreground/50 text-xs">{businesses.length} {isRTL ? 'مزود خدمة' : 'providers'}</p>
          </div>
        </div>
        <div className="container py-8 px-4">
          {bizLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">{isRTL ? 'لا يوجد مزودين في هذا القسم حالياً' : 'No providers in this category yet'}</p>
              <Link to="/search"><Button variant="outline">{isRTL ? 'البحث' : 'Search'}</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {businesses.map((b: any) => (
                <Link key={b.id} to={`/${b.username}`}>
                  <Card className="hover:shadow-lg hover:border-gold/30 transition-all group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {b.logo_url ? <img src={b.logo_url} alt={b.name_ar} className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-muted-foreground/40" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading font-bold text-sm text-foreground truncate group-hover:text-gold transition-colors">{language === 'ar' ? b.name_ar : (b.name_en || b.name_ar)}</h3>
                        {b.cities && <p className="text-xs text-muted-foreground mt-0.5">{language === 'ar' ? b.cities.name_ar : b.cities.name_en}</p>}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-gold">★ {Number(b.rating_avg).toFixed(1)}</span>
                          <span className="text-[10px] text-muted-foreground">({b.rating_count})</span>
                          {b.is_verified && <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full">{isRTL ? 'موثق' : 'Verified'}</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="bg-primary pt-24 pb-10">
        <div className="container px-4">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary-foreground">{isRTL ? 'تصفح الأقسام' : 'Browse Categories'}</h1>
          <p className="mt-2 text-primary-foreground/70 text-sm">{isRTL ? 'اختر القسم المناسب لتجد مزودي الخدمات' : 'Choose a category to find service providers'}</p>
        </div>
      </div>
      <div className="container py-8 px-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <Link key={cat.id} to={`/categories/${cat.slug}`}>
                <Card className="hover:shadow-lg hover:border-gold/30 transition-all group h-full">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0 group-hover:bg-gold/20 transition-colors">
                      <Layers className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h2 className="font-heading font-bold text-foreground group-hover:text-gold transition-colors">{language === 'ar' ? cat.name_ar : cat.name_en}</h2>
                      {cat.description_ar && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{language === 'ar' ? cat.description_ar : (cat.description_en || cat.description_ar)}</p>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Categories;
