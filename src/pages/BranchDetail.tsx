import React, { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, Phone, Mail, Globe, MessageCircle, ArrowLeft, ExternalLink,
  Star, UserCog, Instagram, Linkedin, Facebook, Youtube, Building2,
  Loader2, Boxes, Tag,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  listBranchServiceIds,
  listBranchPromotionIds,
  listServicesByBusiness,
} from '@/modules/catalog';
import { listBusinessesByIds } from '@/modules/businesses';
import { listProfilesByUserIds } from '@/modules/users';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const t = (isRTL: boolean, ar: string, en: string) => (isRTL ? ar : en);

interface PublicBranch {
  id: string;
  business_id: string;
  ref_id: string | null;
  slug: string | null;
  is_main: boolean;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  customer_service_phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  region: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  sales_manager_staff_id: string | null;
  social_instagram: string | null;
  social_x: string | null;
  social_tiktok: string | null;
  social_linkedin: string | null;
  social_facebook: string | null;
  social_snapchat: string | null;
  social_youtube: string | null;
}

interface BusinessLite {
  id: string;
  username: string | null;
  name_ar: string | null;
  name_en: string | null;
  logo_url: string | null;
}

interface ServiceCard { id: string; name_ar: string; name_en: string | null; price_from: number | null; currency_code: string }
interface PromotionCard { id: string; title_ar: string; title_en: string | null; image_url: string | null; offer_price: number | null; original_price: number | null; currency_code: string }

const BranchDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  // 1) Branch (public view)
  const { data: branch, isLoading } = useQuery({
    queryKey: ['public-branch', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_branches_public' as 'business_branches')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PublicBranch | null;
    },
  });

  // 2) Parent business
  const { data: business } = useQuery({
    queryKey: ['public-branch-business', branch?.business_id],
    enabled: Boolean(branch?.business_id),
    queryFn: async () => {
      const { data } = await listBusinessesByIds<BusinessLite>({
        ids: [branch!.business_id],
        select: 'id, username, name_ar, name_en, logo_url',
      });
      return (data?.[0] ?? null) as BusinessLite | null;
    },
  });

  // 3) Sales manager (resolved via security definer? — fallback safe display)
  const { data: salesManager } = useQuery({
    queryKey: ['branch-sales-manager', branch?.sales_manager_staff_id],
    enabled: Boolean(branch?.sales_manager_staff_id),
    queryFn: async () => {
      const { data: staff } = await supabase
        .from('business_staff')
        .select('id, user_id, role')
        .eq('id', branch!.sales_manager_staff_id!)
        .maybeSingle();
      if (!staff) return null;
      const uid = (staff as { user_id: string }).user_id;
      const { data: profiles } = await listProfilesByUserIds<{
        user_id: string; full_name: string | null; phone: string | null;
        email: string | null; avatar_url: string | null;
      }>({ userIds: [uid], select: 'user_id, full_name, phone, email, avatar_url' });
      const p = profiles?.[0];
      return p ? { full_name: p.full_name, phone: p.phone, email: p.email, avatar_url: p.avatar_url } : null;
    },
  });

  // 4) Linked services / promotions
  const { data: linkedServiceIds } = useQuery({
    queryKey: ['public-branch-services', branch?.id],
    enabled: Boolean(branch?.id),
    queryFn: async () => (await listBranchServiceIds(branch!.id)).data ?? [],
  });

  const { data: linkedPromotionIds } = useQuery({
    queryKey: ['public-branch-promotions', branch?.id],
    enabled: Boolean(branch?.id),
    queryFn: async () => (await listBranchPromotionIds(branch!.id)).data ?? [],
  });

  const { data: services } = useQuery({
    queryKey: ['branch-services-cards', branch?.id, branch?.business_id, linkedServiceIds?.length],
    enabled: Boolean(branch?.business_id),
    queryFn: async () => {
      // If branch has explicit links → show only those. Else show all active business services.
      const { data } = await listServicesByBusiness<ServiceCard>({
        businessId: branch!.business_id,
        select: 'id, name_ar, name_en, price_from, currency_code, is_active',
        activeOnly: true,
      });
      const all = (data ?? []) as ServiceCard[];
      const linked = linkedServiceIds ?? [];
      const filtered = linked.length > 0 ? all.filter(s => linked.includes(s.id)) : all;
      return filtered.slice(0, 24);
    },
  });

  const { data: promotions } = useQuery({
    queryKey: ['branch-promotions-cards', branch?.id, branch?.business_id, linkedPromotionIds?.length],
    enabled: Boolean(branch?.business_id),
    queryFn: async () => {
      const base = supabase
        .from('promotions')
        .select('id, title_ar, title_en, image_url, offer_price, original_price, currency_code, is_active')
        .eq('business_id', branch!.business_id)
        .eq('is_active', true);
      const q = (linkedPromotionIds?.length ?? 0) > 0 ? base.in('id', linkedPromotionIds!) : base;
      const { data } = await q.limit(12);
      return (data ?? []) as PromotionCard[];
    },
  });

  const branchName = branch ? (isRTL ? branch.name_ar : (branch.name_en || branch.name_ar)) : '';
  const businessName = business ? (isRTL ? (business.name_ar || business.name_en || '') : (business.name_en || business.name_ar || '')) : '';

  usePageMeta({
    title: branch
      ? `${branchName} — ${businessName} | قِطاعات`
      : t(isRTL, 'فرع | قِطاعات', 'Branch | Qitaat'),
    description: branch?.description_ar || branch?.description_en || undefined,
  });

  // JSON-LD LocalBusiness
  const jsonLd = useMemo(() => {
    if (!branch || !business) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: `${branchName} — ${businessName}`,
      address: branch.address ? {
        '@type': 'PostalAddress',
        streetAddress: branch.address,
        addressRegion: branch.region ?? undefined,
        addressCountry: 'SA',
      } : undefined,
      telephone: branch.phone || branch.mobile || undefined,
      email: branch.email || undefined,
      url: branch.website || undefined,
      geo: branch.latitude && branch.longitude ? {
        '@type': 'GeoCoordinates',
        latitude: branch.latitude, longitude: branch.longitude,
      } : undefined,
    };
  }, [branch, business, branchName, businessName]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <Building2 className="w-16 h-16 text-muted-foreground/30" />
        <h1 className="text-xl font-semibold">{t(isRTL, 'الفرع غير موجود', 'Branch not found')}</h1>
        <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t(isRTL, 'رجوع', 'Back')}
        </Button>
      </div>
    );
  }

  const socials: Array<{ url: string; Icon: React.ComponentType<{ className?: string }>; label: string }> = [
    branch.social_instagram && { url: branch.social_instagram, Icon: Instagram, label: 'Instagram' },
    branch.social_facebook && { url: branch.social_facebook, Icon: Facebook, label: 'Facebook' },
    branch.social_linkedin && { url: branch.social_linkedin, Icon: Linkedin, label: 'LinkedIn' },
    branch.social_youtube && { url: branch.social_youtube, Icon: Youtube, label: 'YouTube' },
    branch.social_x && { url: branch.social_x, Icon: Globe, label: 'X' },
    branch.social_tiktok && { url: branch.social_tiktok, Icon: Globe, label: 'TikTok' },
    branch.social_snapchat && { url: branch.social_snapchat, Icon: Globe, label: 'Snapchat' },
  ].filter(Boolean) as Array<{ url: string; Icon: React.ComponentType<{ className?: string }>; label: string }>;

  return (
    <div className="min-h-screen bg-background">
      {jsonLd && (
         
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-background border-b border-border/60">
        <div className="container max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Link to="/" className="hover:text-primary">{t(isRTL, 'الرئيسية', 'Home')}</Link>
            <span>/</span>
            {business?.username && (
              <>
                <Link to={`/${business.username}`} className="hover:text-primary truncate max-w-[200px]">{businessName}</Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground truncate">{branchName}</span>
          </div>

          <div className="flex items-start gap-4 flex-wrap">
            {business?.logo_url && (
               
              <img src={business.logo_url} alt={businessName} loading="lazy" className="w-16 h-16 rounded-xl object-cover border border-border" />
            )}
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold" dir="auto">{branchName}</h1>
                {branch.is_main && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    {t(isRTL, 'الفرع الرئيسي', 'Main branch')}
                  </Badge>
                )}
              </div>
              {business?.username && (
                <Link to={`/${business.username}`} className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {businessName}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
              {(branch.description_ar || branch.description_en) && (
                <p className="mt-3 text-sm text-muted-foreground max-w-2xl" dir="auto">
                  {isRTL ? (branch.description_ar || branch.description_en) : (branch.description_en || branch.description_ar)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="container max-w-6xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-3">
        {/* Contact card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              {t(isRTL, 'تواصل مباشر', 'Contact')}
            </h2>
            <Separator />
            <ContactRow icon={Phone}    label={t(isRTL,'هاتف ثابت','Phone')}        value={branch.phone}        href={branch.phone ? `tel:${branch.phone}` : null} />
            <ContactRow icon={Phone}    label={t(isRTL,'جوال','Mobile')}             value={branch.mobile}       href={branch.mobile ? `tel:${branch.mobile}` : null} />
            <ContactRow icon={MessageCircle} label="WhatsApp"                         value={branch.whatsapp}     href={branch.whatsapp ? `https://wa.me/${branch.whatsapp.replace(/[^0-9]/g,'')}` : null} />
            <ContactRow icon={Phone}    label={t(isRTL,'خدمة العملاء','Customer service')} value={branch.customer_service_phone} href={branch.customer_service_phone ? `tel:${branch.customer_service_phone}` : null} />
            <ContactRow icon={Mail}     label={t(isRTL,'البريد','Email')}            value={branch.email}        href={branch.email ? `mailto:${branch.email}` : null} />
            <ContactRow icon={Globe}    label={t(isRTL,'الموقع','Website')}          value={branch.website}      href={branch.website} external />
            {branch.address && (
              <ContactRow icon={MapPin} label={t(isRTL,'العنوان','Address')} value={[branch.region, branch.district, branch.address].filter(Boolean).join('، ')} />
            )}

            {socials.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-2 flex-wrap">
                  {socials.map(({ url, Icon, label }) => (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition"
                      aria-label={label}>
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {salesManager && (
            <Card>
              <CardContent className="p-6 space-y-3">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-primary" />
                  {t(isRTL, 'مدير المبيعات', 'Sales manager')}
                </h2>
                <Separator />
                <div className="flex items-center gap-4">
                  {salesManager.avatar_url ? (
                     
                    <img src={salesManager.avatar_url} alt="" loading="lazy" className="w-14 h-14 rounded-full object-cover border" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {(salesManager.full_name ?? '?').slice(0,1)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" dir="auto">{salesManager.full_name ?? t(isRTL, 'غير متوفر', 'N/A')}</p>
                    {salesManager.phone && (
                      <a href={`tel:${salesManager.phone}`} className="text-sm text-muted-foreground hover:text-primary tech-content inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />{salesManager.phone}
                      </a>
                    )}
                  </div>
                  {salesManager.phone && (
                    <Button asChild size="sm" variant="outline" className="gap-2">
                      <a href={`tel:${salesManager.phone}`}>
                        <Phone className="w-3.5 h-3.5" />
                        {t(isRTL, 'اتصل', 'Call')}
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(services?.length ?? 0) > 0 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-primary" />
                  {t(isRTL, 'المنتجات والخدمات', 'Products & Services')}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {services!.map(s => (
                    <div key={s.id} className="p-4 rounded-xl border border-border/60 hover-lift">
                      <p className="font-medium" dir="auto">{isRTL ? s.name_ar : (s.name_en || s.name_ar)}</p>
                      {s.price_from != null && (
                        <p className="text-sm text-muted-foreground tech-content mt-1">
                          {t(isRTL, 'من', 'From')} {s.price_from} {s.currency_code}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(promotions?.length ?? 0) > 0 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  {t(isRTL, 'العروض الخاصة', 'Special offers')}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {promotions!.map(p => (
                    <div key={p.id} className="p-4 rounded-xl border border-border/60 hover-lift">
                      {p.image_url && (
                         
                        <img src={p.image_url} alt="" loading="lazy" className="w-full aspect-video object-cover rounded-lg mb-3" />
                      )}
                      <p className="font-medium" dir="auto">{isRTL ? p.title_ar : (p.title_en || p.title_ar)}</p>
                      {p.offer_price != null && (
                        <p className="text-sm tech-content mt-1">
                          <span className="text-primary font-semibold">{p.offer_price} {p.currency_code}</span>
                          {p.original_price != null && (
                            <span className="text-muted-foreground line-through ms-2">{p.original_price}</span>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

const ContactRow: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  href?: string | null;
  external?: boolean;
}> = ({ icon: Icon, label, value, href, external }) => {
  if (!value) return null;
  const body = (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium tech-content truncate" dir="ltr">{value}</p>
      </div>
      {external && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
    </div>
  );
  return href ? (
    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
       className="block hover:bg-muted/30 rounded-lg px-2 py-1 -mx-2 transition">
      {body}
    </a>
  ) : <div className="px-2 py-1 -mx-2">{body}</div>;
};

export default BranchDetail;