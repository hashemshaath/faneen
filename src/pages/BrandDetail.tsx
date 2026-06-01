/**
 * BRANDS-GOVERNANCE-3 — Public brand detail page.
 *
 * Reads only approved brands (via `brands_public` view) and only the
 * verified provider links (filtered server-side). Audit logs, admin
 * notes, draft data and pending links are never rendered here.
 */
import React, { useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ShieldCheck, Globe2, Tag, Building2, AlertCircle } from 'lucide-react';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta, useMultiJsonLd } from '@/hooks/usePageMeta';
import {
  getBrandBySlug,
  listBrandManufacturingCountries,
  listPublicProvidersForBrand,
  lookupBusinessesByIds,
  relationshipLabel,
  pick,
} from '@/modules/brands';
import type { ProviderBrandRelationship } from '@/modules/brands';

const SITE = 'https://qitaat.com';

const BrandDetail: React.FC = () => {
  const { slug = '' } = useParams();
  const { isRTL } = useLanguage();
  const locale = isRTL ? 'ar' : 'en';

  const { data: brand, isLoading, isError } = useQuery({
    queryKey: ['public-brand-detail', slug],
    enabled: !!slug,
    queryFn: () => getBrandBySlug(slug),
    staleTime: 60_000,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['public-brand-mfg', brand?.id],
    enabled: !!brand?.id,
    queryFn: () => listBrandManufacturingCountries(brand!.id),
  });

  const { data: providerLinks = [] } = useQuery({
    queryKey: ['public-brand-providers', brand?.id],
    enabled: !!brand?.id,
    queryFn: () => listPublicProvidersForBrand(brand!.id),
  });

  const providerIds = useMemo(
    () => Array.from(new Set(providerLinks.map((l) => l.business_id))),
    [providerLinks],
  );
  const { data: providerBizs = [] } = useQuery({
    queryKey: ['public-brand-provider-bizs', brand?.id, providerIds.join(',')],
    enabled: providerIds.length > 0,
    queryFn: () => lookupBusinessesByIds(providerIds),
  });
  const bizMap = useMemo(
    () => new Map(providerBizs.map((b) => [b.id, b])),
    [providerBizs],
  );

  const display = brand ? (isRTL ? brand.name_ar : (brand.name_en || brand.name_ar)) : '';
  const desc = brand
    ? (isRTL ? brand.description_ar : (brand.description_en || brand.description_ar)) || ''
    : '';

  usePageMeta({
    title: brand
      ? (isRTL
          ? `${display} | العلامات التجارية في قِطاعات`
          : `${display} | Brands on Qitaat`)
      : (isRTL ? 'علامة تجارية | قِطاعات' : 'Brand | Qitaat'),
    description: brand
      ? (desc
          || (isRTL
              ? `استعرض الجهات المرتبطة بعلامة ${display} والخدمات والقطاعات التي تعمل بها ضمن منصة قِطاعات.`
              : `Explore firms associated with the ${display} brand, their services and the sectors they operate in on Qitaat.`))
      : (isRTL ? 'صفحة علامة تجارية معتمدة على قِطاعات.' : 'Approved brand on Qitaat.'),
    canonical: brand?.slug ? `${SITE}/brands/${brand.slug}` : `${SITE}/brands`,
    ogType: 'website',
    ogImage: brand?.logo_url || undefined,
    noindex: !isLoading && !brand,
  });

  useMultiJsonLd(brand ? [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: isRTL ? 'الرئيسية' : 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: isRTL ? 'العلامات التجارية' : 'Brands', item: `${SITE}/brands` },
        { '@type': 'ListItem', position: 3, name: display, item: `${SITE}/brands/${brand.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      name: display,
      alternateName: isRTL ? brand.name_en : brand.name_ar,
      description: desc || undefined,
      logo: brand.logo_url || undefined,
      url: `${SITE}/brands/${brand.slug}`,
      sameAs: brand.website ? [brand.website] : undefined,
    },
    // SEO-3 — ItemList of visibly-rendered authorized providers.
    // `providerLinks` is filtered to authorization_status='verified' and only
    // those whose business row was fetched and has a public username are
    // rendered on the page; mirror exactly that set here.
    ...(() => {
      const visible = providerLinks
        .map((l) => bizMap.get(l.business_id))
        .filter((b): b is NonNullable<typeof b> => !!b && !!b.username);
      if (visible.length === 0) return [];
      return [{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        '@id': `${SITE}/brands/${brand.slug}#providers`,
        name: isRTL ? `مزودون معتمدون لعلامة ${display}` : `Authorized providers for ${display}`,
        numberOfItems: visible.length,
        itemListElement: visible.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE}/${b.username}`,
          name: (isRTL ? (b.name_ar || b.name_en) : (b.name_en || b.name_ar)) || '',
        })),
      }];
    })(),
  ] : null);

  if (slug === '') return <Navigate to="/brands" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        <Link to="/brands" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className={isRTL ? 'h-4 w-4 rotate-180' : 'h-4 w-4'} />
          {isRTL ? 'كل العلامات' : 'All brands'}
        </Link>

        {isLoading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : isError || !brand ? (
          <Card><CardContent className="py-12 text-center space-y-3">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">{isRTL ? 'لم يتم العثور على هذه العلامة، أو لم تعتمد بعد.' : 'Brand not found or not yet approved.'}</p>
            <Link to="/brands"><Button variant="outline" size="sm">{isRTL ? 'العودة للسجل' : 'Back to registry'}</Button></Link>
          </CardContent></Card>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8">
              <div className="flex flex-wrap gap-5 items-start">
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={display}
                       className="h-20 w-20 rounded-2xl border bg-background object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-primary/15 grid place-items-center text-primary">
                    <Tag className="h-8 w-8" />
                  </div>
                )}
                <div className="flex-1 min-w-[240px]">
                  <h1 className="text-2xl md:text-3xl font-extrabold">{display}</h1>
                  {brand.ref_id && (
                    <p className="text-xs text-muted-foreground tech-content mt-0.5">{brand.ref_id}</p>
                  )}
                  {brand.brand_owner_company && (
                    <p className="text-sm text-muted-foreground mt-1">{brand.brand_owner_company}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {brand.is_verified && (
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />{isRTL ? 'موثقة' : 'Verified'}
                      </Badge>
                    )}
                    {brand.country_of_origin_code && (
                      <Badge variant="outline" className="gap-1">
                        <Globe2 className="h-3 w-3" />
                        {(isRTL ? brand.country_of_origin_name_ar : brand.country_of_origin_name_en) || brand.country_of_origin_code}
                      </Badge>
                    )}
                    {brand.is_local && (
                      <Badge variant="outline">{isRTL ? 'محلية' : 'Local'}</Badge>
                    )}
                    {brand.founded_year && (
                      <Badge variant="outline">{isRTL ? `تأسست ${brand.founded_year}` : `Founded ${brand.founded_year}`}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {desc && (
              <Card><CardContent className="p-5 prose prose-sm max-w-none whitespace-pre-line">{desc}</CardContent></Card>
            )}

            {countries.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3">{isRTL ? 'دول التصنيع' : 'Manufacturing countries'}</h2>
                <div className="flex flex-wrap gap-2">
                  {countries.map((c) => (
                    <Badge key={c.id} variant="secondary" className="gap-1">
                      <Globe2 className="h-3 w-3" />
                      {(isRTL ? c.country_name_ar : c.country_name_en) || c.country_code}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {providerLinks.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {isRTL ? 'مزودون معتمدون لهذه العلامة' : 'Authorized providers'}
                </h2>
                <div className="grid gap-2 md:grid-cols-2">
                  {providerLinks.map((l) => {
                    const b = bizMap.get(l.business_id);
                    if (!b) return null;
                    const rel = l.relationship_type as ProviderBrandRelationship | null;
                    return (
                      <Link key={l.id} to={b.username ? `/${b.username}` : '#'}>
                        <Card className="hover-lift"><CardContent className="p-3 flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{isRTL ? (b.name_ar || b.name_en) : (b.name_en || b.name_ar)}</div>
                            {rel && relationshipLabel[rel] && (
                              <div className="text-xs text-muted-foreground">{pick(relationshipLabel[rel], locale)}</div>
                            )}
                          </div>
                        </CardContent></Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {brand.website && (
              <Card><CardContent className="p-4 flex flex-wrap gap-4 text-sm">
                <a className="inline-flex items-center gap-1.5 text-primary tech-content"
                   href={brand.website} target="_blank" rel="noopener noreferrer">
                  <Globe2 className="h-4 w-4" />{brand.website}
                </a>
              </CardContent></Card>
            )}

            <Card className="bg-muted/30">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium">{isRTL ? 'وجدت معلومة غير دقيقة؟' : 'Spotted incorrect info?'}</p>
                  <p className="text-muted-foreground text-xs">
                    {isRTL ? 'يمكنك طلب تصحيح بيانات هذه العلامة من خلال الداشبورد.' : 'You can request a correction from the provider dashboard.'}
                  </p>
                </div>
                <Link to="/dashboard/brands" className="text-sm text-primary hover:underline">
                  {isRTL ? 'اطلب تصحيحاً ←' : 'Request correction →'}
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BrandDetail;