import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, MapPin, AtSign, Crown, Calendar, ArrowLeft } from 'lucide-react';

import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';

interface PublicProfile {
  username: string;
  full_name: string | null;
  full_name_ar: string | null;
  full_name_en: string | null;
  avatar_url: string | null;
  membership_tier: string;
  is_verified: boolean;
  account_type: string;
  region_name: string | null;
  city_name_ar: string | null;
  city_name_en: string | null;
  country_name_ar: string | null;
  country_name_en: string | null;
  created_at: string;
}

export const PublicUserProfile: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const { isRTL, language } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-profile', username.toLowerCase()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_profile', { _username: username });
      if (error) throw error;
      const rows = (data ?? []) as PublicProfile[];
      return rows[0] ?? null;
    },
    enabled: !!username,
    staleTime: 60_000,
  });

  const displayName =
    data?.[language === 'ar' ? 'full_name_ar' : 'full_name_en'] ||
    data?.full_name ||
    data?.username ||
    '';

  usePageMeta({
    title: data
      ? `${displayName} (@${data.username}) | قِطاعات`
      : t('ملف شخصي | قِطاعات', 'Profile | Qitaat'),
    description: data
      ? t(
          `حساب ${displayName} على قِطاعات`,
          `${displayName}'s profile on Qitaat`,
        )
      : undefined,
    canonical: data ? `https://qitaat.com/${data.username}` : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-lg w-full overflow-hidden">
            <div
              className="h-20 w-full"
              style={{
                background:
                  'radial-gradient(120% 100% at 100% 0%, hsl(var(--primary) / 0.18) 0%, transparent 55%), linear-gradient(135deg, hsl(var(--primary) / 0.7), hsl(var(--primary) / 0.35))',
              }}
              aria-hidden
            />
            <CardContent className="p-6 sm:p-8 text-center space-y-4 -mt-10">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-background border-4 border-background shadow-md flex items-center justify-center text-2xl font-bold text-primary">
                @
              </div>
              <div className="space-y-1.5">
                <h1 className="text-lg sm:text-xl font-bold">
                  {t('الصفحة غير متاحة', 'This page is unavailable')}
                </h1>
                <p className="text-sm text-muted-foreground" dir="auto">
                  <span className="tech-content font-semibold">@{username}</span>{' '}
                  {t(
                    'قد يكون الحساب غير موجود، أو خاصًا، أو لا يزال قيد المراجعة قبل النشر.',
                    'may not exist, be private, or still awaiting publication review.',
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-start text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground">
                  {t('لماذا قد لا تظهر الصفحة؟', 'Why might this page not show?')}
                </p>
                <ul className="space-y-1">
                  <li>• {t('النشاط التجاري لم يُعتمد للنشر بعد.', 'The business is not yet approved for publication.')}</li>
                  <li>• {t('اسم المستخدم تمت إعادة تسميته أو حذفه.', 'The username has been renamed or removed.')}</li>
                  <li>• {t('الحساب شخصي وليس مفتوحًا للعرض العام.', 'The account is private and not publicly visible.')}</li>
                </ul>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button asChild variant="default" size="sm">
                  <Link to="/search">{t('تصفح المزودين', 'Browse providers')}</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/auth">{t('تسجيل الدخول', 'Sign in')}</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/">{t('العودة للرئيسية', 'Back to home')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const cityName = isRTL ? data.city_name_ar : data.city_name_en;
  const countryName = isRTL ? data.country_name_ar : data.country_name_en;
  const location = [data.region_name, cityName, countryName].filter(Boolean).join(' · ');
  const initials = (displayName || data.username).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
          {/* Header */}
          <Card className="overflow-hidden">
            <div
              className="h-28 w-full"
              style={{
                background:
                  'radial-gradient(120% 100% at 100% 0%, hsl(var(--primary) / 0.18) 0%, transparent 55%), linear-gradient(135deg, hsl(var(--primary) / 0.85), hsl(var(--primary) / 0.55))',
              }}
              aria-hidden
            />
            <CardContent className="p-5 -mt-12">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="shrink-0">
                  {data.avatar_url ? (
                    <img
                      src={data.avatar_url}
                      alt={displayName}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-background shadow-md bg-muted"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl border-4 border-background shadow-md bg-primary/10 text-primary text-2xl font-bold flex items-center justify-center">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0 pb-1 flex-1">
                  <h1 className="text-2xl font-bold leading-tight truncate" dir="auto">
                    {displayName}
                  </h1>
                  <div className="text-sm text-muted-foreground tech-content mt-0.5 flex items-center gap-1">
                    <AtSign className="w-3.5 h-3.5" />
                    {data.username}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] h-5">
                      <Crown className="w-2.5 h-2.5 me-1" />
                      {data.membership_tier}
                    </Badge>
                    {data.is_verified && (
                      <Badge className="bg-success/10 text-success border-success/30 text-[10px] h-5">
                        <ShieldCheck className="w-2.5 h-2.5 me-1" />
                        {t('موثّق', 'Verified')}
                      </Badge>
                    )}
                    {data.account_type === 'business' && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {t('مزود خدمة', 'Provider')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic info */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-bold">{t('المعلومات الأساسية', 'Basic information')}</h2>
              {location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span dir="auto">{location}</span>
                </div>
              )}
              {data.full_name_ar && data.full_name_en && (
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <div className="text-sm">
                    <div className="text-[11px] text-muted-foreground">{t('الاسم بالعربية', 'Arabic name')}</div>
                    <div dir="rtl" lang="ar">{data.full_name_ar}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-[11px] text-muted-foreground">{t('الاسم بالإنجليزية', 'English name')}</div>
                    <div dir="ltr" lang="en" className="tech-content">{data.full_name_en}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <Calendar className="w-3.5 h-3.5" />
                {t('عضو منذ', 'Member since')}{' '}
                {new Date(data.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                })}
              </div>
            </CardContent>
          </Card>

          <div className="text-center pt-2">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link to="/">
                <ArrowLeft className={isRTL ? 'w-4 h-4 rotate-180' : 'w-4 h-4'} />
                {t('العودة للرئيسية', 'Back to home')}
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicUserProfile;