/**
 * Public detail page for a single approved private sector.
 * Renders SEO meta + JSON-LD, displays specializations and approved distributors.
 */
import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, MapPin, Tag, Building2, Globe2, Mail, Phone, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { getPublicSectorBySlug, listSpecializations, listDistributors } from '@/features/private-sectors/service';
import { listBusinessesByIds } from '@/modules/businesses';
import { ONBOARDING_SECTORS } from '@/data/onboarding-sectors';
import { PS_DIST_ROLE_META } from '@/features/private-sectors/types';

const BrandDetail: React.FC = () => {
  const { slug = '' } = useParams();
  const { isRTL } = useLanguage();

  const { data: brand, isLoading } = useQuery({
    queryKey: ['public-brand', slug],
    enabled: !!slug,
    queryFn: () => getPublicSectorBySlug(slug),
  });

  const { data: specs = [] } = useQuery({
    queryKey: ['public-brand-specs', brand?.id],
    enabled: !!brand?.id,
    queryFn: () => listSpecializations(brand!.id),
  });

  const { data: dists = [] } = useQuery({
    queryKey: ['public-brand-dists', brand?.id],
    enabled: !!brand?.id,
    queryFn: () => listDistributors(brand!.id),
  });

  const distBizIds = Array.from(new Set(dists.map((d) => d.business_id)));
  type DistBiz = { id: string; name_ar: string; name_en: string; username: string };
  const { data: distBizs = [] } = useQuery<DistBiz[]>({
    queryKey: ['public-brand-dist-bizs', brand?.id, distBizIds.join(',')],
    enabled: distBizIds.length > 0,
    queryFn: async () => {
      const { data } = await listBusinessesByIds<DistBiz>({ ids: distBizIds });
      return data ?? [];
    },
  });
  const distBizMap = new Map(distBizs.map((b) => [b.id, b]));

  useEffect(() => {
    if (!brand) return;
    const title = (isRTL ? brand.seo_title_ar : brand.seo_title_en) || (isRTL ? brand.name_ar : (brand.name_en || brand.name_ar));
    const desc = (isRTL ? brand.seo_description_ar : brand.seo_description_en)
      || (isRTL ? brand.short_description_ar : brand.short_description_en) || '';
    document.title = `${title} | ${isRTL ? 'قِطاعات' : 'Qitaat'}`;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', desc);
    if (brand.seo_keywords?.length) setMeta('keywords', brand.seo_keywords.join(', '));

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      name: title,
      description: desc,
      logo: brand.logo_url || undefined,
      url: `https://qitaat.com/brands/${brand.slug}`,
    };
    let script = document.getElementById('brand-jsonld') as HTMLScriptElement | null;
    if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.id = 'brand-jsonld'; document.head.appendChild(script); }
    script.textContent = JSON.stringify(jsonLd);
    return () => { script?.remove(); };
  }, [brand, isRTL]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        <Link to="/brands" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className={isRTL ? 'h-4 w-4 rotate-180' : 'h-4 w-4'} />
          {isRTL ? 'كل العلامات' : 'All brands'}
        </Link>

        {isLoading ? (
          <div className="h-72 bg-muted animate-pulse rounded-xl" />
        ) : !brand ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">{isRTL ? 'لم يتم العثور على العلامة.' : 'Brand not found.'}</CardContent></Card>
        ) : (
          <>
            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-background">
              {brand.cover_url && (
                <div className="absolute inset-0 opacity-20">
                  <img src={brand.cover_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative p-6 md:p-8 flex flex-wrap gap-5 items-start">
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt="" className="h-20 w-20 rounded-2xl border bg-background object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-primary/15 grid place-items-center text-primary"><Layers className="h-8 w-8" /></div>
                )}
                <div className="flex-1 min-w-[260px]">
                  <h1 className="text-2xl md:text-3xl font-extrabold">{isRTL ? brand.name_ar : (brand.name_en || brand.name_ar)}</h1>
                  <p className="text-xs text-muted-foreground tech-content mt-0.5">{brand.ref_id}</p>
                  {(brand.short_description_ar || brand.short_description_en) && (
                    <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-3xl">
                      {isRTL ? (brand.short_description_ar || brand.short_description_en) : (brand.short_description_en || brand.short_description_ar)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(() => {
                      const ps = ONBOARDING_SECTORS.find((s) => s.id === brand.parent_sector);
                      return ps ? <Badge variant="secondary"><Layers className="h-3 w-3 me-1" />{isRTL ? ps.name_ar : ps.name_en}</Badge> : null;
                    })()}
                    {brand.city_name_ar && <Badge variant="outline"><MapPin className="h-3 w-3 me-1" />{isRTL ? brand.city_name_ar : (brand.city_name_en || brand.city_name_ar)}</Badge>}
                    {brand.category_name_ar && <Badge variant="outline"><Tag className="h-3 w-3 me-1" />{isRTL ? brand.category_name_ar : (brand.category_name_en || brand.category_name_ar)}</Badge>}
                    {brand.business_username && (
                      <Link to={`/${brand.business_username}`}>
                        <Badge className="cursor-pointer"><Building2 className="h-3 w-3 me-1" />{isRTL ? brand.business_name_ar : (brand.business_name_en || brand.business_name_ar)}</Badge>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {(brand.description_ar || brand.description_en) && (
              <Card><CardContent className="p-5 prose prose-sm max-w-none whitespace-pre-line">
                {isRTL ? (brand.description_ar || brand.description_en) : (brand.description_en || brand.description_ar)}
              </CardContent></Card>
            )}

            {/* Specializations */}
            {specs.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3">{isRTL ? 'التخصصات' : 'Specializations'}</h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {specs.map((sp) => (
                    <Card key={sp.id}><CardContent className="p-4">
                      <div className="font-semibold">{isRTL ? sp.name_ar : (sp.name_en || sp.name_ar)}</div>
                      {(sp.description_ar || sp.description_en) && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{isRTL ? (sp.description_ar || sp.description_en) : (sp.description_en || sp.description_ar)}</p>
                      )}
                    </CardContent></Card>
                  ))}
                </div>
              </section>
            )}

            {/* Approved distributors only (RLS enforces) */}
            {dists.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {isRTL ? 'الموزعون المعتمدون' : 'Authorized distributors'}
                </h2>
                <div className="grid gap-2 md:grid-cols-2">
                  {dists.map((d) => {
                    const b = distBizMap.get(d.business_id);
                    return (
                      <Link to={b?.username ? `/${b.username}` : '#'} key={d.id}>
                        <Card className="hover-lift"><CardContent className="p-3 flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{b ? (isRTL ? b.name_ar : (b.name_en || b.name_ar)) : '—'}</div>
                            <div className="text-xs text-muted-foreground">
                              {isRTL ? PS_DIST_ROLE_META[d.role].ar : PS_DIST_ROLE_META[d.role].en}
                              {(d.territory_ar || d.territory_en) && <> · {isRTL ? (d.territory_ar || d.territory_en) : (d.territory_en || d.territory_ar)}</>}
                            </div>
                          </div>
                        </CardContent></Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Contact */}
            {(brand.website || brand.contact_email || brand.contact_phone) && (
              <Card><CardContent className="p-4 flex flex-wrap gap-4 text-sm">
                {brand.website && <a className="inline-flex items-center gap-1.5 text-primary tech-content" href={brand.website} target="_blank" rel="noopener noreferrer"><Globe2 className="h-4 w-4" />{brand.website}</a>}
                {brand.contact_email && <a className="inline-flex items-center gap-1.5 tech-content" href={`mailto:${brand.contact_email}`}><Mail className="h-4 w-4" />{brand.contact_email}</a>}
                {brand.contact_phone && <a className="inline-flex items-center gap-1.5 tech-content" href={`tel:${brand.contact_phone}`}><Phone className="h-4 w-4" />{brand.contact_phone}</a>}
              </CardContent></Card>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BrandDetail;