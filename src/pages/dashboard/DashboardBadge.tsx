import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, Copy, Check, ExternalLink, AlertCircle, Code2, BarChart3, MousePointerClick, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';

type BadgeVariant = 'light' | 'dark' | 'compact';

interface BusinessRow {
  id: string;
  username: string;
  name_ar: string;
  name_en: string | null;
  is_verified: boolean | null;
}

const SITE_URL = 'https://qitaat.com';
// Public edge function that records an impression and returns a 1×1 GIF.
const PIXEL_URL = `https://hckpxwhjycmdflaneihd.supabase.co/functions/v1/badge-pixel`;

/**
 * Build a self-contained inline-SVG anchor — no external CSS, safe to paste
 * into any CMS, WordPress widget, Wix block, or HTML email signature.
 * The anchor always points to the live profile with `?ref=badge` so
 * traffic from these badges is attributable in analytics.
 */
function buildBadgeHtml(opts: {
  username: string;
  displayName: string;
  variant: BadgeVariant;
  isRTL: boolean;
}): string {
  const { username, displayName, variant, isRTL } = opts;
  const href = `${SITE_URL}/${username}?ref=badge&utm_source=workshop_site&utm_medium=badge&utm_campaign=verified`;
  const label = isRTL ? 'موثّق على قِطاعات' : 'Verified on Qitaat';
  const sub = isRTL ? `قِطاعات · ${displayName}` : `Qitaat · ${displayName}`;
  const safeName = displayName.replace(/"/g, '&quot;');
  // Tracking pixel — fires one `badge_impressions` row per render. Hidden,
  // no layout impact, never blocks the badge from showing.
  const pixel = `<img src="${PIXEL_URL}?u=${encodeURIComponent(username)}&v=${variant}" alt="" width="1" height="1" style="position:absolute;width:1px;height:1px;opacity:0;border:0;pointer-events:none;" referrerpolicy="no-referrer-when-downgrade" loading="eager" />`;

  if (variant === 'compact') {
    // 28px tall, just the seal + word — perfect for email signatures
    return `<a href="${href}" target="_blank" rel="noopener" title="${safeName} — ${label}" style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid #d1fae5;border-radius:9999px;background:#ecfdf5;color:#065f46;font:600 12px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;text-decoration:none;">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/></svg>
  <span>${label}</span>
  ${pixel}
</a>`;
  }

  const isDark = variant === 'dark';
  const bg = isDark ? '#0f172a' : '#ffffff';
  const border = isDark ? '#1e293b' : '#e2e8f0';
  const fg = isDark ? '#f8fafc' : '#0f172a';
  const subFg = isDark ? '#94a3b8' : '#64748b';
  const sealBg = '#10b981';
  const dir = isRTL ? 'rtl' : 'ltr';

  return `<a href="${href}" target="_blank" rel="noopener" title="${safeName} — ${label}" dir="${dir}" style="display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid ${border};border-radius:12px;background:${bg};color:${fg};font:600 13px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.04);">
  <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:${sealBg};color:#fff;flex:none;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/></svg>
  </span>
  <span style="display:inline-flex;flex-direction:column;gap:2px;line-height:1.15;">
    <span style="font-size:13px;font-weight:700;">${label}</span>
    <span style="font-size:11px;font-weight:500;color:${subFg};">${sub}</span>
  </span>
  ${pixel}
</a>`;
}

const DashboardBadge: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();
  const [variant, setVariant] = useState<BadgeVariant>('light');
  const [copied, setCopied] = useState<'html' | 'link' | 'md' | null>(null);

  const { data: business, isLoading } = useQuery({
    queryKey: ['badge-generator-business', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, username, name_ar, name_en, is_verified')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data as BusinessRow | null;
    },
  });

  // Click analytics — every visit landing on the profile with `?ref=badge`
  // is recorded in `badge_clicks`. Owners see only their own rows (RLS).
  const { data: clicks = [] } = useQuery({
    queryKey: ['badge-clicks', business?.id],
    enabled: !!business?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('badge_clicks')
        .select('id, referrer, utm_source, utm_campaign, created_at')
        .eq('business_id', business!.id)
        .order('created_at', { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const clickStats = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const last7 = clicks.filter((c) => now - new Date(c.created_at).getTime() <= 7 * day).length;
    const last30 = clicks.filter((c) => now - new Date(c.created_at).getTime() <= 30 * day).length;
    const referrerMap = new Map<string, number>();
    for (const c of clicks) {
      let host = '—';
      if (c.referrer) {
        try { host = new URL(c.referrer).hostname.replace(/^www\./, ''); } catch { /* keep dash */ }
      }
      referrerMap.set(host, (referrerMap.get(host) ?? 0) + 1);
    }
    const topReferrers = [...referrerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { total: clicks.length, last7, last30, topReferrers };
  }, [clicks]);

  const displayName = useMemo(() => {
    if (!business) return '';
    return language === 'ar' ? business.name_ar : (business.name_en || business.name_ar);
  }, [business, language]);

  const html = useMemo(() => {
    if (!business?.username) return '';
    return buildBadgeHtml({
      username: business.username,
      displayName,
      variant,
      isRTL,
    });
  }, [business?.username, displayName, variant, isRTL]);

  const profileLink = business?.username
    ? `${SITE_URL}/${business.username}?ref=badge`
    : '';

  const markdown = business?.username
    ? `[![${isRTL ? 'موثّق على قِطاعات' : 'Verified on Qitaat'}](https://qitaat.com/badge/verified.svg)](${profileLink})`
    : '';

  const copy = async (text: string, kind: 'html' | 'link' | 'md') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast.success(isRTL ? 'تم النسخ إلى الحافظة' : 'Copied to clipboard');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error(isRTL ? 'تعذّر النسخ' : 'Copy failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-success" />
            <h1 className="text-2xl font-heading font-bold">
              {isRTL ? 'مولّد شارة الورشة الموثّقة' : 'Verified Workshop Badge Generator'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? 'انسخ كود HTML جاهز وألصقه في موقع ورشتك أو توقيع البريد للحصول على باك لينك صحيح إلى صفحتك على قِطاعات.'
              : 'Copy ready-to-paste HTML and embed it on your workshop website or email signature for a correct backlink to your Qitaat profile.'}
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : !business ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-warning mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? 'لم نعثر على ورشة مرتبطة بحسابك. أنشئ ملف الورشة أولاً ثم عُد إلى هذه الصفحة.'
                  : 'No workshop is linked to your account yet. Create your workshop profile first.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Status banner */}
            {!business.is_verified && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">
                      {isRTL ? 'حسابك ليس موثّقاً بعد' : 'Your account is not verified yet'}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {isRTL
                        ? 'يمكنك إنشاء الكود الآن للمعاينة، لكن استخدم الشارة فقط بعد توثيق ورشتك من فريق قِطاعات.'
                        : 'You can preview the code now, but only display the badge after your workshop is verified by the Qitaat team.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Variant picker */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isRTL ? 'اختر شكل الشارة' : 'Pick a badge style'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(['light', 'dark', 'compact'] as BadgeVariant[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVariant(v)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                      aria-pressed={variant === v}
                    >
                      <Badge
                        variant={variant === v ? 'default' : 'secondary'}
                        className="px-4 py-2 cursor-pointer text-sm"
                      >
                        {v === 'light' && (isRTL ? 'فاتح' : 'Light')}
                        {v === 'dark' && (isRTL ? 'داكن' : 'Dark')}
                        {v === 'compact' && (isRTL ? 'مضغوط' : 'Compact')}
                      </Badge>
                    </button>
                  ))}
                </div>

                {/* Live preview — render the actual HTML the user will copy */}
                <div className="border rounded-xl p-6 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {isRTL ? 'معاينة مباشرة' : 'Live preview'}
                  </p>
                  <div
                    className="flex items-center gap-3 flex-wrap"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Click analytics — `?ref=badge` events recorded on the public profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  {isRTL ? 'تحليلات نقرات الشارة' : 'Badge click analytics'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: isRTL ? 'إجمالي النقرات' : 'Total clicks', value: clickStats.total },
                    { label: isRTL ? 'آخر 7 أيام' : 'Last 7 days', value: clickStats.last7 },
                    { label: isRTL ? 'آخر 30 يومًا' : 'Last 30 days', value: clickStats.last30 },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border bg-card p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        <MousePointerClick className="w-3 h-3" />
                        {s.label}
                      </div>
                      <div className="mt-1 text-2xl font-heading font-bold tech-content">{s.value}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    {isRTL ? 'أهم المواقع المُحيلة' : 'Top referrers'}
                  </h3>
                  {clickStats.topReferrers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {isRTL
                        ? 'لا توجد نقرات بعد. الصق كود الشارة على موقعك ثم عُد لاحقًا.'
                        : 'No clicks yet. Embed the badge on your site, then check back later.'}
                    </p>
                  ) : (
                    <ul className="divide-y rounded-xl border bg-card">
                      {clickStats.topReferrers.map(([host, count]) => (
                        <li key={host} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="font-mono text-xs tech-content truncate" dir="ltr">{host}</span>
                          <Badge variant="secondary" className="tech-content">{count}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {clicks.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {isRTL
                      ? `آخر نقرة: ${new Date(clicks[0].created_at).toLocaleString('ar-SA')}`
                      : `Last click: ${new Date(clicks[0].created_at).toLocaleString()}`}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* HTML snippet */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  {isRTL ? 'كود HTML الجاهز' : 'Ready-to-paste HTML'}
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => copy(html, 'html')}
                  className="gap-2"
                >
                  {copied === 'html' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {isRTL ? (copied === 'html' ? 'تم النسخ' : 'نسخ HTML') : (copied === 'html' ? 'Copied' : 'Copy HTML')}
                </Button>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={html}
                  readOnly
                  rows={10}
                  className="font-mono text-xs tech-content"
                  dir="ltr"
                  onClick={(e) => (e.currentTarget as HTMLTextAreaElement).select()}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {isRTL
                    ? 'الصق الكود في صفحة "من نحن" أو الفوتر بموقعك. لا يحتاج CSS أو JavaScript خارجي.'
                    : 'Paste this on your About page or footer. No external CSS or JavaScript required.'}
                </p>
              </CardContent>
            </Card>

            {/* Plain link + Markdown */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {isRTL ? 'رابط ملفك على قِطاعات' : 'Your Qitaat profile link'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs font-mono break-all tech-content" dir="ltr">
                    {profileLink}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => copy(profileLink, 'link')}
                  >
                    {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isRTL ? (copied === 'link' ? 'تم النسخ' : 'نسخ الرابط') : (copied === 'link' ? 'Copied' : 'Copy link')}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    Markdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs font-mono break-all tech-content" dir="ltr">
                    {markdown}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => copy(markdown, 'md')}
                  >
                    {copied === 'md' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isRTL ? (copied === 'md' ? 'تم النسخ' : 'نسخ Markdown') : (copied === 'md' ? 'Copied' : 'Copy markdown')}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Usage tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isRTL ? 'أين يمكنك استخدام الشارة؟' : 'Where to use this badge'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {(isRTL
                    ? [
                        'فوتر موقع ورشتك الإلكتروني',
                        'صفحة "من نحن" وصفحة "تواصل معنا"',
                        'توقيع البريد الإلكتروني (استخدم الشكل المضغوط)',
                        'بطاقات Google Business Profile و LinkedIn',
                        'عروض الأسعار وملفات PDF التعريفية',
                      ]
                    : [
                        'Your workshop website footer',
                        'About and Contact pages',
                        'Email signature (use the Compact style)',
                        'Google Business Profile and LinkedIn',
                        'Quotation PDFs and company profiles',
                      ]
                  ).map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardBadge;
