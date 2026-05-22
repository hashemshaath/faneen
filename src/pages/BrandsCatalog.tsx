/**
 * Public catalog of approved private sectors (brands).
 * Filterable by parent industrial sector + city + category, with text search.
 * Reads from the public `private_sectors_public` view (RLS-aware).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, MapPin, Tag, Layers } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { listPublicSectors } from '@/features/private-sectors/service';
import { listActiveCategories } from '@/modules/categories';
import { listActiveCities } from '@/modules/locations';
import { ONBOARDING_SECTORS } from '@/data/onboarding-sectors';

const ALL = '__all__';

const BrandsCatalog: React.FC = () => {
  const { isRTL } = useLanguage();
  const [search, setSearch] = useState('');
  const [parent, setParent] = useState<string>(ALL);
  const [cityId, setCityId] = useState<string>(ALL);
  const [categoryId, setCategoryId] = useState<string>(ALL);

  useEffect(() => {
    document.title = isRTL ? 'العلامات والقطاعات الخاصة | قِطاعات' : 'Private Brands & Sectors | Qitaat';
    const meta = document.querySelector('meta[name="description"]') ?? document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'description' }));
    meta.setAttribute('content', isRTL
      ? 'استكشف العلامات والوكالات الحصرية لمزودي الألمنيوم والمطابخ والزجاج والحديد المعتمدين على منصة قِطاعات.'
      : 'Explore approved exclusive brands, agencies and specialized sub-sectors from Qitaat verified providers.');
  }, [isRTL]);

  const { data: cities = [] } = useQuery<Array<{ id: string; name_ar: string; name_en: string }>>({
    queryKey: ['brands-cities'],
    queryFn: async () => {
      const { data } = await listActiveCities<{ id: string; name_ar: string; name_en: string }>();
      return data ?? [];
    },
  });
  const { data: categories = [] } = useQuery<Array<{ id: string; name_ar: string; name_en: string; slug: string }>>({
    queryKey: ['brands-categories'],
    queryFn: async () => {
      const { data } = await listActiveCategories<{ id: string; name_ar: string; name_en: string; slug: string }>({ select: 'id, name_ar, name_en, slug' });
      return data ?? [];
    },
  });

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['public-private-sectors', parent, cityId, categoryId, search],
    queryFn: () => listPublicSectors({
      parent_sector: parent === ALL ? undefined : parent,
      city_id: cityId === ALL ? undefined : cityId,
      category_id: categoryId === ALL ? undefined : categoryId,
      search: search.trim() || undefined,
    }),
  });

  const filtered = useMemo(() => brands, [brands]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2 text-primary"><Layers className="h-5 w-5" /></div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {isRTL ? 'العلامات والقطاعات الخاصة' : 'Brands & Private Sectors'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {isRTL
              ? 'كل العلامات الخاصة، الوكالات الحصرية، والتخصصات المعتمدة من قِبل إدارة المنصة.'
              : 'Every private brand, exclusive agency, and specialized sub-sector approved by the platform team.'}
          </p>
        </header>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
              <Input className="ps-10 h-11" placeholder={isRTL ? 'بحث بالاسم…' : 'Search by name…'}
                     value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={parent} onValueChange={setParent}>
              <SelectTrigger className="h-11"><SelectValue placeholder={isRTL ? 'القطاع' : 'Sector'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{isRTL ? 'كل القطاعات' : 'All sectors'}</SelectItem>
                {ONBOARDING_SECTORS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{isRTL ? s.name_ar : s.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2 md:col-span-1">
              <Select value={cityId} onValueChange={setCityId}>
                <SelectTrigger className="h-11"><SelectValue placeholder={isRTL ? 'المدينة' : 'City'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{isRTL ? 'كل المدن' : 'All cities'}</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-11"><SelectValue placeholder={isRTL ? 'الفئة' : 'Category'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{isRTL ? 'كل الفئات' : 'All categories'}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{isRTL ? c.name_ar : (c.name_en || c.name_ar)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد علامات بهذه الشروط.' : 'No brands match these filters.'}</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b) => (
              <Link to={`/brands/${b.slug}`} key={b.id} className="group">
                <Card className="hover-lift h-full overflow-hidden">
                  {b.cover_url ? (
                    <div className="aspect-[16/9] bg-muted overflow-hidden">
                      <img src={b.cover_url} alt={(isRTL ? b.name_ar : b.name_en) || b.name_ar}
                           loading="lazy"
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-secondary/10 grid place-items-center">
                      <Layers className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      {b.logo_url && <img src={b.logo_url} alt="" className="h-8 w-8 rounded border object-cover" loading="lazy" />}
                      <div className="font-semibold truncate">{isRTL ? b.name_ar : (b.name_en || b.name_ar)}</div>
                    </div>
                    {(b.short_description_ar || b.short_description_en) && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {isRTL ? (b.short_description_ar || b.short_description_en) : (b.short_description_en || b.short_description_ar)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {b.parent_sector && (() => {
                        const ps = ONBOARDING_SECTORS.find((s) => s.id === b.parent_sector);
                        return ps ? <Badge variant="secondary" className="gap-1"><Layers className="h-3 w-3" />{isRTL ? ps.name_ar : ps.name_en}</Badge> : null;
                      })()}
                      {b.city_name_ar && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />{isRTL ? b.city_name_ar : (b.city_name_en || b.city_name_ar)}</Badge>}
                      {b.category_name_ar && <Badge variant="outline" className="gap-1"><Tag className="h-3 w-3" />{isRTL ? b.category_name_ar : (b.category_name_en || b.category_name_ar)}</Badge>}
                    </div>
                    {b.business_username && (
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 pt-1">
                        <Building2 className="h-3 w-3" />
                        {isRTL ? 'بواسطة' : 'by'} <span className="font-medium">{isRTL ? b.business_name_ar : (b.business_name_en || b.business_name_ar)}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BrandsCatalog;