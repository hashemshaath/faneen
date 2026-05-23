import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck, ShieldX, ShieldAlert, Loader2, ExternalLink, MapPin, Star, BadgeCheck,
  Copy, Check, Share2, QrCode, Code2, AlertTriangle,
} from 'lucide-react';
import { getPublicBusinessForVerify } from '@/modules/businesses';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { buildBadgeHtml, type BadgeBuildOptions } from '@/lib/badge/snippets';
import { generateQrSvg } from '@/lib/badge/qr';

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

const FONT_PRESETS: Record<string, string> = {
  system: "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
  ibm: "'IBM Plex Sans Arabic',sans-serif",
  inter: "Inter,sans-serif",
  tajawal: "Tajawal,sans-serif",
  cairo: "Cairo,sans-serif",
  georgia: "Georgia,'Times New Roman',serif",
};

/** Set/replace a meta tag in <head>. Returns the previous value (or null) for cleanup. */
function setMeta(selector: string, attrs: Record<string, string>): { restore: () => void } {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  const created = !el;
  const previous: Record<string, string | null> = {};
  if (!el) {
    el = document.createElement('meta');
    // Apply identifying attribute(s) parsed from selector like meta[property="og:title"]
    const m = /\[([^=\]]+)="([^"]+)"\]/g;
    let mm: RegExpExecArray | null;
    while ((mm = m.exec(selector))) el.setAttribute(mm[1], mm[2]);
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) {
    previous[k] = el.getAttribute(k);
    el.setAttribute(k, v);
  }
  return {
    restore: () => {
      if (created) { el?.remove(); return; }
      for (const [k, prev] of Object.entries(previous)) {
        if (prev == null) el!.removeAttribute(k); else el!.setAttribute(k, prev);
      }
    },
  };
}

const VerifyBusiness = () => {
  useNoIndex();
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const { isRTL } = useLanguage();
  const [state, setState] = useState<{ loading: boolean; data: PublicBusiness | null; error: 'not_found' | 'unknown' | null }>({
    loading: true, data: null, error: null,
  });
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const handle = (username || '').trim().replace(/^@/, '').toLowerCase();
      if (!handle) {
        if (!cancelled) setState({ loading: false, data: null, error: 'not_found' });
        return;
      }
      try {
        const { data, error } = await getPublicBusinessForVerify<PublicBusiness>(handle);
        if (cancelled) return;
        if (error || !data) {
          setState({ loading: false, data: null, error: 'not_found' });
          return;
        }
        setState({ loading: false, data, error: null });
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
    statusTitle: 'حالة التوثيق', reasonLabel: 'سبب الحالة', resultLabel: 'نتيجة الفحص',
    reasonVerified: 'استوفت المنشأة متطلبات قِطاعات للتحقق من الهوية والنشاط الفعلي.',
    reasonUnverified: 'لم يكتمل بعد إجراء التحقق من الوثائق الرسمية لهذه المنشأة.',
    reasonInactive: 'تم تعليق نشاط هذا الحساب مؤقتًا، لذلك لا يُعتبر التوثيق ساريًا حاليًا.',
    reasonNotFound: 'الرابط غير صحيح أو تم تغيير معرّف المنشأة. تحقق من الكتابة وحاول مجددًا.',
    reasonError: 'تعذّر الاتصال بسجل التحقق. يرجى المحاولة لاحقًا أو التواصل مع الدعم.',
    embedTitle: 'تضمين شارة التحقق', embedHelp: 'ألصق هذا الكود في موقع المنشأة لإظهار شارة التوثيق العامة.',
    qrTitle: 'رمز QR لرابط التحقق', qrHelp: 'يفتح هذه الصفحة عند المسح من الجوّال.',
    copyLink: 'نسخ الرابط', share: 'مشاركة', copyEmbed: 'نسخ كود التضمين', copied: 'تم النسخ',
    shareTitle: 'تحقق من توثيق المنشأة على قِطاعات',
    shareText: (n: string) => `تحقق رسميًا من توثيق ${n} عبر منصة قِطاعات:`,
    statusOk: 'موثّق', statusWarn: 'غير موثّق', statusInactive: 'غير نشط', statusError: 'خطأ', statusMissing: 'غير موجود',
  } : {
    title: 'Business Verification', sub: 'Public-safe authenticity check from the Qitaat registry',
    verified: 'Verified Business', unverified: 'This business is not verified yet',
    inactive: 'Account is currently inactive', notFound: 'No business matches this link',
    handle: 'Handle', refId: 'Reference ID', verifyNo: 'Verification No.',
    tier: 'Membership tier', region: 'Region', joined: 'Joined',
    rating: 'Rating', openProfile: 'Open business profile', loading: 'Verifying…',
    privacy: 'No contact or financial data is shown. Verification relies on the official Qitaat registry.',
    issuedBy: 'Issued by Qitaat platform', backHome: 'Back to home',
    statusTitle: 'Verification status', reasonLabel: 'Reason', resultLabel: 'Check result',
    reasonVerified: 'This business meets Qitaat\'s identity and activity verification criteria.',
    reasonUnverified: 'Official document verification has not been completed for this business yet.',
    reasonInactive: 'This account is currently suspended, so its verification is not in effect.',
    reasonNotFound: 'The link is invalid or the business handle has changed. Check the spelling and try again.',
    reasonError: 'Could not reach the verification registry. Please try again later or contact support.',
    embedTitle: 'Embed verification badge', embedHelp: 'Paste this on the business website to show the public verification badge.',
    qrTitle: 'Verification QR code', qrHelp: 'Scan with a phone to open this page.',
    copyLink: 'Copy link', share: 'Share', copyEmbed: 'Copy embed code', copied: 'Copied',
    shareTitle: 'Verify this business on Qitaat',
    shareText: (n: string) => `Officially verify ${n} on Qitaat:`,
    statusOk: 'Verified', statusWarn: 'Unverified', statusInactive: 'Inactive', statusError: 'Error', statusMissing: 'Not found',
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

  const verifyUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.href : `https://qitaat.com/v/b/${username || ''}`),
    [username],
  );

  // Allow per-link customization via URL params (?accent=#a855f7&font=cairo)
  const accentParam = searchParams.get('accent');
  const fontParam = (searchParams.get('font') || '').toLowerCase();
  const customAccent = accentParam && /^#?[0-9a-f]{6}$/i.test(accentParam)
    ? (accentParam.startsWith('#') ? accentParam : `#${accentParam}`)
    : undefined;
  const fontFamily = FONT_PRESETS[fontParam] || undefined;

  // SEO/social meta — Open Graph + Twitter Card, while keeping noindex
  useEffect(() => {
    if (!data) return;
    const safeName = displayName || data.username || 'Qitaat';
    const ogTitle = `${safeName} — ${verified ? t.verified : t.unverified} · ${t.title}`;
    const ogDesc = desc || (verified ? t.reasonVerified : t.reasonUnverified);
    const ogImage = data.logo_url || `${window.location.origin}/pwa-192.png`;
    const restorers = [
      setMeta('meta[property="og:type"]', { content: 'website' }),
      setMeta('meta[property="og:title"]', { content: ogTitle }),
      setMeta('meta[property="og:description"]', { content: ogDesc }),
      setMeta('meta[property="og:url"]', { content: verifyUrl }),
      setMeta('meta[property="og:image"]', { content: ogImage }),
      setMeta('meta[property="og:site_name"]', { content: 'Qitaat · قِطاعات' }),
      setMeta('meta[name="twitter:card"]', { content: 'summary' }),
      setMeta('meta[name="twitter:title"]', { content: ogTitle }),
      setMeta('meta[name="twitter:description"]', { content: ogDesc }),
      setMeta('meta[name="twitter:image"]', { content: ogImage }),
    ];
    const prevTitle = document.title;
    document.title = ogTitle;
    return () => { restorers.forEach((r) => r.restore()); document.title = prevTitle; };
  }, [data, displayName, desc, verified, verifyUrl, t]);

  // Generate QR for the verification URL
  useEffect(() => {
    let cancelled = false;
    generateQrSvg(verifyUrl, 200).then((svg) => { if (!cancelled) setQrSvg(svg); }).catch(() => {});
    return () => { cancelled = true; };
  }, [verifyUrl]);

  // Logo as data URL (fetched client-side) so the embed badge stays self-contained.
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    if (!data?.logo_url) { setLogoDataUrl(undefined); return; }
    fetch(data.logo_url, { mode: 'cors' })
      .then((r) => r.ok ? r.blob() : Promise.reject(new Error('logo')))
      .then((b) => new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result || ''));
        fr.onerror = () => rej(new Error('reader'));
        fr.readAsDataURL(b);
      }))
      .then((url) => { if (!cancelled) setLogoDataUrl(url); })
      .catch(() => { if (!cancelled) setLogoDataUrl(undefined); });
    return () => { cancelled = true; };
  }, [data?.logo_url]);

  const badgeOpts: BadgeBuildOptions | null = data?.username ? {
    username: data.username,
    displayName: displayName,
    variant: 'light',
    size: 'md',
    accent: 'emerald',
    isRTL,
    showSubLabel: true,
    customAccent,
    fontFamily,
    logoDataUrl,
  } : null;

  const embedHtml = badgeOpts ? buildBadgeHtml(badgeOpts) : '';

  // Status / check-result rows shown inside the diagnostics block.
  type StatusKind = 'ok' | 'warn' | 'error' | 'loading';
  const checks: Array<{ label: string; result: string; kind: StatusKind; reason: string }> = [];
  if (loading) {
    checks.push({ label: t.statusTitle, result: t.loading, kind: 'loading', reason: t.loading });
  } else if (error === 'not_found' || !data) {
    checks.push({ label: t.statusTitle, result: t.statusMissing, kind: 'error', reason: t.reasonNotFound });
  } else if (error === 'unknown') {
    checks.push({ label: t.statusTitle, result: t.statusError, kind: 'error', reason: t.reasonError });
  } else if (data.is_active === false) {
    checks.push({ label: t.statusTitle, result: t.statusInactive, kind: 'warn', reason: t.reasonInactive });
  } else if (!data.is_verified) {
    checks.push({ label: t.statusTitle, result: t.statusWarn, kind: 'warn', reason: t.reasonUnverified });
  } else {
    checks.push({ label: t.statusTitle, result: t.statusOk, kind: 'ok', reason: t.reasonVerified });
  }

  const copyTo = useCallback(async (text: string, key: 'link' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch { /* ignore */ }
  }, []);

  const onShare = useCallback(async () => {
    const text = `${t.shareText(displayName || data?.username || 'Qitaat')} ${verifyUrl}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share({ title: t.shareTitle, text, url: verifyUrl }); return; } catch { /* fall through */ }
    }
    void copyTo(text, 'link');
  }, [copyTo, displayName, data?.username, verifyUrl, t]);

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
            ) : data.is_active === false ? (
              <ShieldAlert className="w-12 h-12 text-amber-600 shrink-0" />
            ) : !data.is_verified ? (
              <ShieldAlert className="w-12 h-12 text-amber-600 shrink-0" />
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

              {/* Detailed verification status diagnostic */}
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">{t.statusTitle}</div>
                {checks.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 inline-flex w-2 h-2 rounded-full shrink-0 ${
                      c.kind === 'ok' ? 'bg-emerald-500' :
                      c.kind === 'warn' ? 'bg-amber-500' :
                      c.kind === 'error' ? 'bg-red-500' : 'bg-muted-foreground/50'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{c.label}</span>
                        <span className={`font-semibold ${
                          c.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-300' :
                          c.kind === 'warn' ? 'text-amber-700 dark:text-amber-300' :
                          c.kind === 'error' ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'
                        }`}>{c.result}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed mt-0.5">{c.reason}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Row label={t.verifyNo} value={verifyNo} mono />
              <Row label={t.handle} value={`@${data.username || '—'}`} mono />
              {data.ref_id && <Row label={t.refId} value={data.ref_id} mono />}
              {data.membership_tier && <Row label={t.tier} value={String(data.membership_tier)} />}
              {data.region && (
                <Row label={t.region} value={data.region} icon={<MapPin className="w-3.5 h-3.5 text-muted-foreground" />} />
              )}
              <Row label={t.rating} value={rating} icon={<Star className="w-3.5 h-3.5 text-amber-500" />} />
              <Row label={t.joined} value={joined} />

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {data.username && (
                  <Link
                    to={`/${data.username}`}
                    className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition"
                  >
                    <ExternalLink className="w-4 h-4" />{t.openProfile}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => copyTo(verifyUrl, 'link')}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted transition"
                >
                  {copied === 'link' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied === 'link' ? t.copied : t.copyLink}
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted transition"
                >
                  <Share2 className="w-4 h-4" />{t.share}
                </button>
              </div>

              {/* Live badge preview using business logo + (optional) ?accent / ?font params */}
              {badgeOpts && embedHtml && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                      <BadgeCheck className="w-3.5 h-3.5" />{t.embedTitle}
                    </div>
                    <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: embedHtml }} />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {/* Embed code */}
                    <div className="rounded-xl border border-border bg-muted/30 p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5" />HTML
                        </span>
                        <button
                          type="button"
                          onClick={() => copyTo(embedHtml, 'embed')}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 h-7 rounded-md border border-border bg-background hover:bg-muted transition"
                        >
                          {copied === 'embed' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied === 'embed' ? t.copied : t.copyEmbed}
                        </button>
                      </div>
                      <pre className="text-[11px] leading-relaxed bg-background border border-border rounded-md p-2 overflow-auto max-h-40 tech-content" dir="ltr"><code>{embedHtml}</code></pre>
                      <p className="text-[11px] text-muted-foreground">{t.embedHelp}</p>
                    </div>

                    {/* QR code */}
                    <div className="rounded-xl border border-border bg-muted/30 p-3 flex flex-col items-center gap-2">
                      <div className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1.5 self-start">
                        <QrCode className="w-3.5 h-3.5" />{t.qrTitle}
                      </div>
                      {qrSvg ? (
                        <div className="bg-white p-2 rounded-md border border-border" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                      ) : (
                        <div className="w-[180px] h-[180px] bg-background rounded-md border border-border flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground text-center">{t.qrHelp}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!data && !loading && (
            <div className="p-6 space-y-3">
              <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error === 'unknown' ? t.reasonError : t.reasonNotFound}</span>
              </div>
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