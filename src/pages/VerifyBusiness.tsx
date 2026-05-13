import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, Loader2, ExternalLink, MapPin, Star, BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';

interface PublicBusiness {
  id: string | null;
  username: string | null;
  name_ar: string | null;
  name_en: string | null;
  short_description_ar: string | null;
  short_description_en: string | null;
  logo_url: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  ref_id: string | null;
  business_number: number | null;
  membership_tier: string | null;
  city_id: string | null;
  region: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  created_at: string | null;
}

const VerifyBusiness = () => {
  useNoIndex();
  const { username } = useParams<{ username: string }>();
  const { isRTL } = useLanguage();
  const [state, setState] = useState<{ loading: boolean; data: PublicBusiness | null; error: 'not_found' | 'unknown' | null }>({
    loading: true, data: null, error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const handle = (username || '').trim().replace(/^@/, '').toLowerCase();
      if (!handle) {
        if (!cancelled) setState({ loading: false, data: null, error: 'not_found' });
        return;
      }
      try {
        const { data, error } = await supabase
          .from('businesses_public')
          .select('id, username, name_ar, name_en, short_description_ar, short_description_en, logo_url, is_verified, is_active, ref_id, business_number, membership_tier, city_id, region, rating_avg, rating_count, created_at')
          .eq('username', handle)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          setState({ loading: false, data: null, error: 'not_found' });
          return;
        }
        setState({ loading: false, data: data as PublicBusiness, error: null });
      } catch (e: unknown) {
        if (cancelled) return;
        setState({ loading: false, data: null, error: 'unknown' });
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  const t = useMemo(() => isRTL ? {
    title: 'التحقق من توثيق المنشأة', sub: 'صفحة تحقق عامة وآمنة من سجلّ قِطاعات الرسمي',
    verified: 'منشأة موثّقة', unverified: 'لم يتم توثيق هذه المنشأة بعد',
    inactive: 'الحساب غير نشط حاليًا', notFound: 'لا توجد منشأة مطابقة لهذا الرابط',
    handle: 'المعرّف', refId: 'رقم المنشأة', verifyNo: 'رقم التحقق',
    tier: 'باقة العضوية', region: 'المنطقة', joined: 'تاريخ الانضمام',
    rating: 'التقييم', openProfile: 'فتح صفحة المنشأة', loading: 'جارٍ التحقق…',
    privacy: 'لا يتم عرض أي بيانات تواصل أو مالية. التحقق يعتمد على السجل الرسمي في قِطاعات.',
    issuedBy: 'صادرة عن منصة قِطاعات', backHome: 'العودة للرئيسية',
  } : {
    title: 'Business Verification', sub: 'Public-safe authenticity check from the Qitaat registry',
    verified: 'Verified Business', unverified: 'This business is not verified yet',
    inactive: 'Account is currently inactive', notFound: 'No business matches this link',
    handle: 'Handle', refId: 'Reference ID', verifyNo: 'Verification No.',
    tier: 'Membership tier', region: 'Region', joined: 'Joined',
    rating: 'Rating', openProfile: 'Open business profile', loading: 'Verifying…',
    privacy: 'No contact or financial data is shown. Verification relies on the official Qitaat registry.',
    issuedBy: 'Issued by Qitaat platform', backHome: 'Back to home',
  }, [isRTL]);

  const { loading, data, error } = state;
  const verified = !!data?.is_verified && !!data?.is_active;
  const displayName = data ? ((isRTL ? data.name_ar : (data.name_en || data.name_ar)) || data.username || '—') : '';
  const desc = data ? ((isRTL ? data.short_description_ar : (data.short_description_en || data.short_description_ar)) || '') : '';
  const verifyNo = data?.business_number != null ? `BIZ-${String(data.business_number).padStart(7, '0')}` : (data?.ref_id || '—');
  const joined = data?.created_at ? new Date(data.created_at).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-GB') : '—';
  const rating = data && data.rating_count && data.rating_count > 0
    ? `${(data.rating_avg ?? 0).toFixed(1)} (${data.rating_count})`
    : '—';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4 py-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.sub}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className={`p-6 flex items-center gap-4 ${
            loading ? 'bg-muted/40' :
            error ? 'bg-amber-50 dark:bg-amber-950/30' :
            verified ? 'bg-emerald-50 dark:bg-emerald-950/30' :
            'bg-amber-50 dark:bg-amber-950/30'
          }`}>
            {loading ? (
              <Loader2 className="w-12 h-12 text-muted-foreground animate-spin shrink-0" />
            ) : error || !data ? (
              <ShieldX className="w-12 h-12 text-amber-600 shrink-0" />
            ) : data.logo_url ? (
              <img src={data.logo_url} alt="" loading="lazy"
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-background shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-emerald-600/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7 text-emerald-600" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="text-lg font-semibold text-foreground">{t.loading}</div>
              ) : error || !data ? (
                <div className="text-lg font-semibold text-foreground">{t.notFound}</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-semibold text-foreground truncate">{displayName}</span>
                    {verified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        <BadgeCheck className="w-3 h-3" />{t.verified}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground tech-content mt-0.5" dir="ltr">@{data.username}</div>
                  {!verified && (
                    <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      {data.is_active === false ? t.inactive : t.unverified}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {data && (
            <div className="p-6 space-y-3 text-sm">
              {desc && <p className="text-muted-foreground leading-relaxed">{desc}</p>}
              <Row label={t.verifyNo} value={verifyNo} mono />
              <Row label={t.handle} value={`@${data.username || '—'}`} mono />
              {data.ref_id && <Row label={t.refId} value={data.ref_id} mono />}
              {data.membership_tier && <Row label={t.tier} value={String(data.membership_tier)} />}
              {data.region && (
                <Row label={t.region} value={data.region} icon={<MapPin className="w-3.5 h-3.5 text-muted-foreground" />} />
              )}
              <Row label={t.rating} value={rating} icon={<Star className="w-3.5 h-3.5 text-amber-500" />} />
              <Row label={t.joined} value={joined} />

              {data.username && (
                <Link
                  to={`/${data.username}`}
                  className="mt-3 inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition"
                >
                  <ExternalLink className="w-4 h-4" />{t.openProfile}
                </Link>
              )}
            </div>
          )}

          {!data && !loading && (
            <div className="p-6">
              <Link to="/" className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted transition">
                {t.backHome}
              </Link>
            </div>
          )}

          <div className="px-6 py-4 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between gap-2">
            <span>{t.privacy}</span>
            <span className="shrink-0 opacity-70">{t.issuedBy}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, mono, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
    <span className="text-muted-foreground inline-flex items-center gap-1.5">{icon}{label}</span>
    <span className={`font-medium text-foreground truncate ${mono ? 'tech-content' : ''}`} dir={mono ? 'ltr' : undefined}>{value}</span>
  </div>
);

export default VerifyBusiness;