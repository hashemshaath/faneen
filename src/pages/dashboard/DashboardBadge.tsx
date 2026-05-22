import React, { useEffect, useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import {
  ShieldCheck, Copy, Check, ExternalLink, AlertCircle, Code2, BarChart3,
  MousePointerClick, Globe, Eye, Percent, MessageSquare, CalendarClock,
  Phone, ArrowRight, QrCode, Download, Share2, Mail, Sparkles, Target,
  TrendingUp, TrendingDown, Activity, FileText, Palette, Stethoscope,
  CircleDot, Database, RefreshCw, Upload, X, Type as TypeIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import {
  Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  buildBadgeHtml, buildBadgeMarkdown, buildBadgeJsx, buildBadgeIframe,
  buildEmailSignature, buildBadgeSvg, buildProfileLink, svgToPngBlob,
  type BadgeVariant, type BadgeSize, type BadgeAccent,
} from '@/lib/badge/snippets';
import { exportRowsToCsv } from '@/lib/badge/csv';
import { generateQrSvg, downloadQrPng } from '@/lib/badge/qr';

interface BusinessRow {
  id: string;
  username: string;
  name_ar: string;
  name_en: string | null;
  is_verified: boolean | null;
}

type SnippetKind = 'html' | 'md' | 'jsx' | 'iframe' | 'email' | 'link' | 'svg';

const ACCENT_SWATCHES: { id: BadgeAccent; hex: string; ar: string; en: string }[] = [
  { id: 'emerald', hex: '#10b981', ar: 'زمردي', en: 'Emerald' },
  { id: 'brand',   hex: '#1f8a4c', ar: 'العلامة', en: 'Brand' },
  { id: 'blue',    hex: '#2563eb', ar: 'أزرق',  en: 'Blue' },
  { id: 'slate',   hex: '#475569', ar: 'رمادي', en: 'Slate' },
];

const VARIANTS: { id: BadgeVariant; ar: string; en: string }[] = [
  { id: 'light',    ar: 'فاتح',    en: 'Light' },
  { id: 'dark',     ar: 'داكن',    en: 'Dark' },
  { id: 'gradient', ar: 'متدرّج',  en: 'Gradient' },
  { id: 'compact',  ar: 'مضغوط',   en: 'Compact' },
  { id: 'minimal',  ar: 'بسيط',    en: 'Minimal' },
];

const SIZES: { id: BadgeSize; ar: string; en: string }[] = [
  { id: 'sm', ar: 'صغير',  en: 'Small' },
  { id: 'md', ar: 'متوسط', en: 'Medium' },
  { id: 'lg', ar: 'كبير',  en: 'Large' },
];

const FONT_PRESETS: { id: string; ar: string; en: string; css: string }[] = [
  { id: 'system',     ar: 'النظام (افتراضي)', en: 'System (default)',     css: "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif" },
  { id: 'plex',       ar: 'IBM Plex عربي',    en: 'IBM Plex Sans Arabic', css: "'IBM Plex Sans Arabic',-apple-system,sans-serif" },
  { id: 'inter',      ar: 'Inter',             en: 'Inter',                css: "Inter,-apple-system,Segoe UI,sans-serif" },
  { id: 'tajawal',    ar: 'Tajawal',           en: 'Tajawal',              css: "Tajawal,-apple-system,Segoe UI,sans-serif" },
  { id: 'cairo',      ar: 'Cairo',             en: 'Cairo',                css: "Cairo,-apple-system,Segoe UI,sans-serif" },
  { id: 'georgia',    ar: 'Georgia (كلاسيكي)', en: 'Georgia (classic)',    css: "Georgia,'Times New Roman',serif" },
];

function relativeTime(iso: string, isRTL: boolean): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const fmt = (n: number, ar: string, en: string) =>
    isRTL ? `قبل ${Math.floor(n)} ${ar}` : `${Math.floor(n)} ${en} ago`;
  if (diff < 60) return isRTL ? 'الآن' : 'just now';
  if (diff < 3600) return fmt(diff / 60, 'دقيقة', 'min');
  if (diff < 86400) return fmt(diff / 3600, 'ساعة', 'h');
  if (diff < 604800) return fmt(diff / 86400, 'يوم', 'd');
  return new Date(iso).toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-US');
}

const DashboardBadge: React.FC = () => {
  useNoIndex();
  const { user } = useAuth();
  const { isRTL, language } = useLanguage();

  // Customization state
  const [variant, setVariant] = useState<BadgeVariant>('light');
  const [size, setSize] = useState<BadgeSize>('md');
  const [accent, setAccent] = useState<BadgeAccent>('emerald');
  const [customAccent, setCustomAccent] = useState<string>('');
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [fontId, setFontId] = useState<string>('system');
  const [showSubLabel, setShowSubLabel] = useState(true);
  const [forceLang, setForceLang] = useState<'auto' | 'ar' | 'en'>('auto');
  const [snippetKind, setSnippetKind] = useState<SnippetKind>('html');
  const [copied, setCopied] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string>('');

  // Resolve every business this user can act on:
  //   1. businesses they OWN (businesses.user_id = me)
  //   2. businesses where they are active staff (business_staff.user_id = me)
  // Then pick the one chosen via the active-business switcher; otherwise the first.
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['badge-generator-businesses', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Owned
      const ownedReq = listOwnerBusinesses<BusinessRow>({
        userId: user!.id,
        select: 'id, username, name_ar, name_en, is_verified',
      });
      // Staff-linked → fetch business ids first, then their rows
      const staffReq = supabase
        .from('business_staff')
        .select('business_id')
        .eq('user_id', user!.id)
        .eq('is_active', true);

      const [{ data: owned }, { data: staffRows }] = await Promise.all([ownedReq, staffReq]);
      const staffIds = (staffRows ?? []).map((r) => r.business_id);
      let staffBusinesses: BusinessRow[] = [];
      if (staffIds.length > 0) {
        const { data } = await listBusinessesByIds<BusinessRow>({
          ids: staffIds,
          select: 'id, username, name_ar, name_en, is_verified',
        });
        staffBusinesses = (data ?? []) as BusinessRow[];
      }
      const merged = [...((owned ?? []) as BusinessRow[]), ...staffBusinesses];
      // Dedupe by id
      const seen = new Set<string>();
      return merged.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
    },
  });

  const availableIds = useMemo(() => businesses.map((b) => b.id), [businesses]);
  const { activeBusinessId } = useActiveBusiness(availableIds);
  const business = useMemo<BusinessRow | null>(() => {
    if (businesses.length === 0) return null;
    return businesses.find((b) => b.id === activeBusinessId) ?? businesses[0];
  }, [businesses, activeBusinessId]);

  const { data: clicks = [], isLoading: clicksLoading, isError: clicksError, dataUpdatedAt: clicksUpdatedAt, refetch: refetchClicks } = useQuery({
    queryKey: ['badge-clicks', business?.id],
    enabled: !!business?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('badge_clicks')
        .select('id, referrer, utm_source, utm_campaign, created_at')
        .eq('business_id', business!.id)
        .order('created_at', { ascending: false })
        .limit(2000);
      return data ?? [];
    },
  });

  const { data: impressions = [], isLoading: impressionsLoading, isError: impressionsError, dataUpdatedAt: impressionsUpdatedAt, refetch: refetchImpressions } = useQuery({
    queryKey: ['badge-impressions', business?.id],
    enabled: !!business?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('badge_impressions')
        .select('id, variant, referrer_host, created_at')
        .eq('business_id', business!.id)
        .order('created_at', { ascending: false })
        .limit(5000);
      return data ?? [];
    },
  });

  const { data: conversions = [], isLoading: conversionsLoading, isError: conversionsError, dataUpdatedAt: conversionsUpdatedAt, refetch: refetchConversions } = useQuery({
    queryKey: ['badge-conversions', business?.id],
    enabled: !!business?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('badge_conversions')
        .select('id, session_token, event_type, source_page, created_at')
        .eq('business_id', business!.id)
        .order('created_at', { ascending: false })
        .limit(5000);
      return data ?? [];
    },
  });

  const displayName = useMemo(() => {
    if (!business) return '';
    return language === 'ar' ? business.name_ar : (business.name_en || business.name_ar);
  }, [business, language]);

  const badgeIsRTL = forceLang === 'auto' ? isRTL : forceLang === 'ar';

  const buildOpts = useMemo(() => business?.username ? {
    username: business.username,
    displayName,
    variant,
    size,
    accent,
    isRTL: badgeIsRTL,
    showSubLabel,
    customAccent: /^#?[0-9a-f]{6}$/i.test(customAccent.trim()) ? (customAccent.startsWith('#') ? customAccent : `#${customAccent}`) : undefined,
    logoDataUrl: logoDataUrl || undefined,
    fontFamily: FONT_PRESETS.find(f => f.id === fontId)?.css,
  } : null, [business?.username, displayName, variant, size, accent, badgeIsRTL, showSubLabel, customAccent, logoDataUrl, fontId]);

  const html = useMemo(() => buildOpts ? buildBadgeHtml(buildOpts) : '', [buildOpts]);
  const markdown = useMemo(() => buildOpts ? buildBadgeMarkdown(buildOpts) : '', [buildOpts]);
  const jsx = useMemo(() => buildOpts ? buildBadgeJsx(buildOpts) : '', [buildOpts]);
  const iframe = useMemo(() => buildOpts ? buildBadgeIframe(buildOpts) : '', [buildOpts]);
  const emailSig = useMemo(() => buildOpts ? buildEmailSignature(buildOpts) : '', [buildOpts]);
  const svgStandalone = useMemo(() => buildOpts ? buildBadgeSvg(buildOpts) : '', [buildOpts]);

  const profileLink = business?.username ? buildProfileLink(business.username) : '';

  // QR generation — re-runs when profile link changes.
  useEffect(() => {
    if (!profileLink) { setQrSvg(''); return; }
    let cancelled = false;
    generateQrSvg(profileLink, 220).then((svg) => { if (!cancelled) setQrSvg(svg); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [profileLink]);

  // Bucket impressions + clicks by day for the last 30 days.
  const dailySeries = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days: { date: string; label: string; impressions: number; clicks: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        impressions: 0,
        clicks: 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    for (const i of impressions) {
      const k = i.created_at.slice(0, 10);
      const j = idx.get(k); if (j !== undefined) days[j].impressions++;
    }
    for (const c of clicks) {
      const k = c.created_at.slice(0, 10);
      const j = idx.get(k); if (j !== undefined) days[j].clicks++;
    }
    return days;
  }, [impressions, clicks]);

  const periodStats = useMemo(() => {
    const day = 86400000;
    const now = Date.now();
    const inWindow = <T extends { created_at: string }>(arr: T[], from: number, to: number) =>
      arr.filter((x) => {
        const t = new Date(x.created_at).getTime();
        return t >= from && t < to;
      }).length;
    const last7 = { from: now - 7 * day, to: now };
    const prev7 = { from: now - 14 * day, to: now - 7 * day };
    const last30 = { from: now - 30 * day, to: now };
    const prev30 = { from: now - 60 * day, to: now - 30 * day };
    const ctr = (c: number, i: number) => i > 0 ? (c / i) * 100 : 0;
    const iL7 = inWindow(impressions, last7.from, last7.to);
    const iP7 = inWindow(impressions, prev7.from, prev7.to);
    const cL7 = inWindow(clicks, last7.from, last7.to);
    const cP7 = inWindow(clicks, prev7.from, prev7.to);
    const iL30 = inWindow(impressions, last30.from, last30.to);
    const iP30 = inWindow(impressions, prev30.from, prev30.to);
    const cL30 = inWindow(clicks, last30.from, last30.to);
    const cP30 = inWindow(clicks, prev30.from, prev30.to);
    const delta = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
    return {
      total: { impressions: impressions.length, clicks: clicks.length, ctr: ctr(clicks.length, impressions.length) },
      last7: { impressions: iL7, clicks: cL7, ctr: ctr(cL7, iL7) },
      last30: { impressions: iL30, clicks: cL30, ctr: ctr(cL30, iL30) },
      delta7: { impressions: delta(iL7, iP7), clicks: delta(cL7, cP7), ctr: delta(ctr(cL7, iL7), ctr(cP7, iP7)) },
      delta30: { impressions: delta(iL30, iP30), clicks: delta(cL30, cP30), ctr: delta(ctr(cL30, iL30), ctr(cP30, iP30)) },
    };
  }, [impressions, clicks]);

  const referrerStats = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clicks) {
      let host = '—';
      if (c.referrer) { try { host = new URL(c.referrer).hostname.replace(/^www\./, ''); } catch { /* ignore */ } }
      m.set(host, (m.get(host) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [clicks]);

  const sourcePageStats = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of conversions) {
      const k = c.source_page || '—';
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [conversions]);

  const funnel = useMemo(() => {
    const uniq = (type: string) =>
      new Set(conversions.filter((c) => c.event_type === type).map((c) => c.session_token)).size;
    const profileViews = uniq('profile_view');
    const phoneReveals = uniq('phone_reveal');
    const emailReveals = uniq('email_reveal');
    const bookings = uniq('booking');
    const anyContact = new Set(
      conversions.filter((c) => ['contact', 'phone_reveal', 'email_reveal'].includes(c.event_type)).map((c) => c.session_token),
    ).size;
    const base = clicks.length || profileViews || 1;
    return {
      profileViews, phoneReveals, emailReveals, bookings, anyContact,
      contactRate: (anyContact / base) * 100,
      bookingRate: (bookings / base) * 100,
    };
  }, [conversions, clicks.length]);

  const recentActivity = useMemo(() => {
    type Ev = { id: string; ts: string; kind: 'click' | 'impression' | 'conversion'; meta: string };
    const items: Ev[] = [];
    for (const c of clicks.slice(0, 20)) {
      let host = '—';
      if (c.referrer) { try { host = new URL(c.referrer).hostname.replace(/^www\./, ''); } catch { /* ignore */ } }
      items.push({ id: `c-${c.id}`, ts: c.created_at, kind: 'click', meta: host });
    }
    for (const i of impressions.slice(0, 20)) {
      items.push({ id: `i-${i.id}`, ts: i.created_at, kind: 'impression', meta: i.referrer_host || (i.variant ?? '—') });
    }
    for (const cv of conversions.slice(0, 20)) {
      items.push({ id: `v-${cv.id}`, ts: cv.created_at, kind: 'conversion', meta: cv.event_type });
    }
    return items.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 15);
  }, [clicks, impressions, conversions]);

  // Goals — persisted per-business in localStorage.
  const goalsKey = business?.id ? `qitaat_badge_goals_${business.id}` : '';
  const [goalImpr, setGoalImpr] = useState<number>(1000);
  const [goalClicks, setGoalClicks] = useState<number>(100);
  useEffect(() => {
    if (!goalsKey) return;
    try {
      const raw = localStorage.getItem(goalsKey);
      if (raw) {
        const v = JSON.parse(raw) as { impressions?: number; clicks?: number };
        if (typeof v.impressions === 'number') setGoalImpr(v.impressions);
        if (typeof v.clicks === 'number') setGoalClicks(v.clicks);
      }
    } catch { /* ignore */ }
  }, [goalsKey]);
  useEffect(() => {
    if (!goalsKey) return;
    try { localStorage.setItem(goalsKey, JSON.stringify({ impressions: goalImpr, clicks: goalClicks })); } catch { /* ignore */ }
  }, [goalsKey, goalImpr, goalClicks]);

  const copy = async (text: string, kind: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast.success(isRTL ? 'تم النسخ' : 'Copied');
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error(isRTL ? 'تعذّر النسخ' : 'Copy failed');
    }
  };

  const shareUrl = encodeURIComponent(profileLink);
  const shareText = encodeURIComponent(isRTL
    ? `تعرّف على ورشتنا الموثّقة على قِطاعات: ${displayName}`
    : `Check out our verified workshop on Qitaat: ${displayName}`);

  const downloadSvg = () => {
    const blob = new Blob([svgStandalone], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qitaat-badge-${variant}-${size}.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPng = async () => {
    const blob = await svgToPngBlob(svgStandalone, 3);
    if (!blob) {
      toast.error(isRTL ? 'تعذّر إنشاء PNG (قد يكون الشعار من نطاق خارجي)' : 'PNG export failed (logo may be cross-origin)');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qitaat-badge-${variant}-${size}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(isRTL ? 'تم تنزيل PNG' : 'PNG downloaded');
  };

  const handleLogoFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 200 * 1024) {
      toast.error(isRTL ? 'الحد الأقصى 200KB' : 'Max 200KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => toast.error(isRTL ? 'تعذّر قراءة الملف' : 'Could not read file');
    reader.readAsDataURL(file);
  };

  const snippetMap: Record<SnippetKind, string> = {
    html, md: markdown, jsx, iframe, email: emailSig, link: profileLink, svg: svgStandalone,
  };
  const currentSnippet = snippetMap[snippetKind];

  // Open a self-contained embed preview window with the rendered badge,
  // the HTML embed snippet, and the QR code — each instantly copyable.
  const openEmbedPreview = () => {
    if (!business || !html) {
      toast.error(isRTL ? 'الشارة غير جاهزة بعد' : 'Badge is not ready yet');
      return;
    }
    const title = isRTL ? `معاينة شارة التوثيق · @${business.username}` : `Verification badge preview · @${business.username}`;
    const tHeading = isRTL ? 'شارة التوثيق — معاينة التضمين' : 'Verification Badge — Embed preview';
    const tBadge = isRTL ? 'الشارة المرسومة' : 'Rendered badge';
    const tEmbed = isRTL ? 'كود HTML للتضمين' : 'HTML embed code';
    const tQr = isRTL ? 'رمز QR (SVG)' : 'QR code (SVG)';
    const tCopy = isRTL ? 'نسخ' : 'Copy';
    const tCopied = isRTL ? 'تم النسخ ✓' : 'Copied ✓';
    const tOpen = isRTL ? 'فتح صفحة المنشأة' : 'Open business page';
    const tHint = isRTL
      ? 'الصق الكود في موقعك أو وقّع به بريدك. بدون CSS أو JS خارجي.'
      : 'Paste the code on your site or email signature. No external CSS/JS.';
    const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const doc = `<!doctype html><html lang="${isRTL ? 'ar' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${escText(title)}</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#0f172a;--muted:#64748b;--border:#e2e8f0;--brand:#1f8a4c;--brand-ink:#fff;--code:#0b1220;--code-ink:#e2e8f0}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,'IBM Plex Sans Arabic',Segoe UI,Roboto,sans-serif}
.wrap{max-width:920px;margin:0 auto;padding:24px}
h1{font-size:18px;margin:0 0 4px;font-weight:700}
p.lead{margin:0 0 20px;color:var(--muted);font-size:13px}
.grid{display:grid;gap:16px}
@media(min-width:760px){.grid-2{grid-template-columns:1fr 1fr}}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px}
.card h2{font-size:13px;font-weight:600;margin:0 0 10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:flex;align-items:center;justify-content:space-between;gap:8px}
.preview{display:flex;align-items:center;justify-content:center;min-height:120px;background:#fff;border:1px dashed var(--border);border-radius:10px;padding:18px}
.preview.dark{background:#0f172a}
textarea{width:100%;min-height:140px;font:12px/1.55 ui-monospace,Menlo,Consolas,monospace;background:var(--code);color:var(--code-ink);border:0;border-radius:10px;padding:12px;resize:vertical;direction:ltr;text-align:left}
.qr{display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px;min-height:240px}
.qr svg{max-width:220px;height:auto}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
button,.btn{appearance:none;border:1px solid var(--border);background:#fff;color:var(--ink);padding:8px 14px;border-radius:9px;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-decoration:none}
button.primary,.btn.primary{background:var(--brand);color:var(--brand-ink);border-color:var(--brand)}
button:hover{background:#f1f5f9}button.primary:hover{filter:brightness(.95)}
.ok{color:#059669}
.foot{margin-top:18px;font-size:11.5px;color:var(--muted);text-align:center}
</style></head><body><div class="wrap">
<header style="margin-bottom:16px">
  <h1>${escText(tHeading)}</h1>
  <p class="lead">${escText(tHint)}</p>
  <a class="btn" href="${escAttr(profileLink)}" target="_blank" rel="noopener">${escText(tOpen)} ↗</a>
</header>
<div class="grid grid-2">
  <section class="card">
    <h2>${escText(tBadge)}</h2>
    <div class="preview">${html}</div>
    <div class="preview dark" style="margin-top:10px">${html}</div>
  </section>
  <section class="card">
    <h2>${escText(tQr)} <button data-copy="qr" class="btn" type="button">${escText(tCopy)}</button></h2>
    <div class="qr" id="qrBox">${qrSvg || ''}</div>
  </section>
</div>
<section class="card" style="margin-top:16px">
  <h2>${escText(tEmbed)} <button data-copy="html" class="btn primary" type="button">${escText(tCopy)}</button></h2>
  <textarea id="snip" readonly>${escText(html)}</textarea>
</section>
<p class="foot">Qitaat · قِطاعات</p>
</div>
<script>
(function(){
  function flash(btn,label){var o=btn.textContent;btn.textContent=label;btn.classList.add('ok');setTimeout(function(){btn.textContent=o;btn.classList.remove('ok')},1600)}
  function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText){return navigator.clipboard.writeText(t)}return new Promise(function(res,rej){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');res()}catch(e){rej(e)}finally{document.body.removeChild(ta)}})}
  document.querySelectorAll('[data-copy]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var k=btn.getAttribute('data-copy');var txt='';
      if(k==='html'){txt=document.getElementById('snip').value}
      else if(k==='qr'){var s=document.querySelector('#qrBox svg');txt=s?s.outerHTML:''}
      if(!txt)return;copyText(txt).then(function(){flash(btn,${JSON.stringify(tCopied)})})
    })
  });
  var ta=document.getElementById('snip');if(ta){ta.addEventListener('focus',function(){ta.select()})}
})();
</script></body></html>`;
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'noopener');
    if (!win) {
      toast.error(isRTL ? 'منع المتصفح فتح النافذة' : 'Browser blocked the preview window');
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast.success(isRTL ? 'تم فتح معاينة كود التضمين' : 'Embed preview opened');
  };

  // Today's stats for hero
  const today = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const t = start.getTime();
    const i = impressions.filter((x) => new Date(x.created_at).getTime() >= t).length;
    const c = clicks.filter((x) => new Date(x.created_at).getTime() >= t).length;
    return { impressions: i, clicks: c, ctr: i > 0 ? (c / i) * 100 : 0 };
  }, [impressions, clicks]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        {isLoading ? (
          <Skeleton className="h-72 rounded-2xl" />
        ) : !business ? (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-warning mx-auto" />
              <div className="space-y-1">
                <h2 className="text-base font-semibold">
                  {isRTL ? 'لا توجد منشأة مرتبطة بحسابك بعد' : 'No business linked to your account yet'}
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {isRTL
                    ? 'أنشئ ملف منشأتك لتفعيل شارة التوثيق، أو اطلب من صاحب المنشأة إضافتك كموظف ثم اختر المنشأة من المُبدّل أعلى الصفحة.'
                    : 'Create your business profile to enable the verified badge, or ask the owner to invite you as staff — then pick the business from the switcher above.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Button asChild size="sm" className="rounded-xl">
                  <a href="/dashboard/business-edit">
                    {isRTL ? 'إنشاء ملف المنشأة' : 'Create business profile'}
                    <ArrowRight className="w-3.5 h-3.5 ms-1.5 rtl:rotate-180" />
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <a href="/dashboard/diagnostics">
                    {isRTL ? 'تشخيص حسابي' : 'Account diagnostics'}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-success/10 via-primary/5 to-background p-5 sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--success)/0.15),transparent_60%)] pointer-events-none" />
              <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-success/15 text-success grid place-items-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-heading font-bold truncate">
                        {isRTL ? 'شارة التوثيق' : 'Verification Badge'}
                      </h1>
                      {business.is_verified
                        ? <VerifiedBadge size="sm" />
                        : <Badge variant="outline" className="text-warning border-warning/40 bg-warning/5">{isRTL ? 'بانتظار التوثيق' : 'Pending verification'}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {displayName} · <span className="tech-content" dir="ltr">@{business.username}</span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 lg:gap-3 shrink-0">
                  {[
                    { icon: Eye, label: isRTL ? 'انطباعات اليوم' : 'Impr. today', value: today.impressions, tone: 'text-foreground' },
                    { icon: MousePointerClick, label: isRTL ? 'نقرات اليوم' : 'Clicks today', value: today.clicks, tone: 'text-primary' },
                    { icon: Percent, label: 'CTR', value: `${today.ctr.toFixed(1)}%`, tone: 'text-success' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-card/80 backdrop-blur border px-3 py-2 min-w-[88px]">
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <s.icon className="w-3 h-3" />{s.label}
                      </div>
                      <div className={`text-lg font-heading font-bold tech-content ${s.tone}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Quick profile link chip */}
              <div className="relative mt-4 flex items-center gap-2 rounded-xl border bg-card/70 backdrop-blur px-3 py-2">
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs tech-content truncate flex-1" dir="ltr">{profileLink}</span>
                <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => copy(profileLink, 'hero-link')}>
                  {copied === 'hero-link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1" asChild>
                  <a href={profileLink} target="_blank" rel="noopener"><ExternalLink className="w-3.5 h-3.5" /></a>
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="generator" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="generator" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" />{isRTL ? 'المولّد' : 'Generator'}</TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />{isRTL ? 'التحليلات' : 'Analytics'}</TabsTrigger>
                <TabsTrigger value="share" className="gap-1.5"><Share2 className="w-3.5 h-3.5" />{isRTL ? 'المشاركة' : 'Share'}</TabsTrigger>
                <TabsTrigger value="playbook" className="gap-1.5"><Target className="w-3.5 h-3.5" />{isRTL ? 'الدليل' : 'Playbook'}</TabsTrigger>
                <TabsTrigger value="diag" className="gap-1.5"><Stethoscope className="w-3.5 h-3.5" />{isRTL ? 'التشخيص' : 'Diagnostics'}</TabsTrigger>
              </TabsList>

              {/* GENERATOR */}
              <TabsContent value="generator" className="space-y-4 mt-4">
                <div className="grid lg:grid-cols-[1.2fr,1fr] gap-4">
                  {/* Customization */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" />{isRTL ? 'تخصيص الشارة' : 'Customize'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">{isRTL ? 'الأسلوب' : 'Style'}</Label>
                        <div className="flex flex-wrap gap-2">
                          {VARIANTS.map((v) => (
                            <button key={v.id} type="button" onClick={() => setVariant(v.id)} aria-pressed={variant === v.id} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
                              <Badge variant={variant === v.id ? 'default' : 'secondary'} className="px-3 py-1.5 cursor-pointer">{isRTL ? v.ar : v.en}</Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">{isRTL ? 'الحجم' : 'Size'}</Label>
                        <div className="flex flex-wrap gap-2">
                          {SIZES.map((s) => (
                            <button key={s.id} type="button" onClick={() => setSize(s.id)} aria-pressed={size === s.id} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
                              <Badge variant={size === s.id ? 'default' : 'secondary'} className="px-3 py-1.5 cursor-pointer">{isRTL ? s.ar : s.en}</Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">{isRTL ? 'اللون' : 'Accent'}</Label>
                        <div className="flex flex-wrap gap-2">
                          {ACCENT_SWATCHES.map((a) => (
                            <button key={a.id} type="button" onClick={() => { setAccent(a.id); setCustomAccent(''); }} aria-pressed={accent === a.id && !customAccent} title={isRTL ? a.ar : a.en}
                              className={`relative h-9 w-9 rounded-full border-2 transition-all hover-lift ${accent === a.id ? 'border-foreground scale-110' : 'border-transparent'}`}
                              style={{ background: a.hex }}>
                              {accent === a.id && !customAccent && <Check className="absolute inset-0 m-auto w-4 h-4 text-white" />}
                            </button>
                          ))}
                          <div className="flex items-center gap-2 ms-2">
                            <input
                              type="color"
                              value={customAccent || ACCENT_SWATCHES.find(a => a.id === accent)?.hex || '#10b981'}
                              onChange={(e) => setCustomAccent(e.target.value)}
                              className="h-9 w-9 rounded-full border-2 border-border cursor-pointer p-0 bg-transparent"
                              aria-label={isRTL ? 'لون مخصص' : 'Custom color'}
                            />
                            <Input
                              value={customAccent}
                              onChange={(e) => setCustomAccent(e.target.value)}
                              placeholder="#a855f7"
                              className="h-9 w-28 font-mono text-xs tech-content"
                              dir="ltr"
                            />
                            {customAccent && (
                              <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => setCustomAccent('')} aria-label={isRTL ? 'إزالة اللون المخصص' : 'Clear custom color'}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">{isRTL ? 'اختر من اللوحة أو ألصق Hex مخصص (#RRGGBB).' : 'Pick a swatch or paste a custom hex (#RRGGBB).'}</p>
                      </div>

                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block flex items-center gap-1.5">
                          <Upload className="w-3 h-3" />{isRTL ? 'شعار الورشة' : 'Workshop logo'}
                        </Label>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-dashed cursor-pointer hover:bg-muted text-xs">
                            <Upload className="w-3.5 h-3.5" />
                            {isRTL ? 'رفع شعار (PNG/SVG)' : 'Upload logo (PNG/SVG)'}
                            <input type="file" accept="image/png,image/svg+xml,image/jpeg" className="hidden" onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)} />
                          </label>
                          {logoDataUrl && (
                            <>
                              <span className="inline-flex h-9 w-9 rounded-full overflow-hidden border bg-card">
                                <img src={logoDataUrl} alt="logo preview" className="h-full w-full object-cover" />
                              </span>
                              <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => setLogoDataUrl('')} aria-label={isRTL ? 'إزالة الشعار' : 'Remove logo'}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">{isRTL ? 'يُستبدل أيقونة الدرع. الحد الأقصى 200KB، يُقصّ دائريًا.' : 'Replaces the shield icon. Max 200KB, cropped to a circle.'}</p>
                      </div>

                      <div>
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block flex items-center gap-1.5">
                          <TypeIcon className="w-3 h-3" />{isRTL ? 'خط الاسم' : 'Name font'}
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {FONT_PRESETS.map((f) => (
                            <button key={f.id} type="button" onClick={() => setFontId(f.id)} aria-pressed={fontId === f.id}
                              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${fontId === f.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted border-border'}`}
                              style={{ fontFamily: f.css }}>
                              {isRTL ? f.ar : f.en}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                          <div className="text-sm">
                            <div className="font-medium">{isRTL ? 'إظهار العنوان الفرعي' : 'Show sub-label'}</div>
                            <div className="text-xs text-muted-foreground">{isRTL ? 'اسم الورشة تحت العنوان' : 'Workshop name under title'}</div>
                          </div>
                          <Switch checked={showSubLabel} onCheckedChange={setShowSubLabel} />
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="text-sm font-medium mb-2">{isRTL ? 'لغة الشارة' : 'Badge language'}</div>
                          <div className="flex gap-1">
                            {(['auto', 'ar', 'en'] as const).map((l) => (
                              <button key={l} type="button" onClick={() => setForceLang(l)} aria-pressed={forceLang === l}
                                className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${forceLang === l ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
                                {l === 'auto' ? (isRTL ? 'تلقائي' : 'Auto') : l.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Live preview on dual canvases */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4" />{isRTL ? 'معاينة مباشرة' : 'Live preview'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-xl border bg-white p-6 flex items-center justify-center min-h-[110px]" dangerouslySetInnerHTML={{ __html: html }} />
                      <div className="rounded-xl border bg-slate-900 p-6 flex items-center justify-center min-h-[110px]" dangerouslySetInnerHTML={{ __html: html }} />
                      <p className="text-[11px] text-muted-foreground text-center">{isRTL ? 'معاينة على خلفية فاتحة وداكنة' : 'Preview on light + dark backgrounds'}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Snippets */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2"><Code2 className="w-4 h-4" />{isRTL ? 'كود الإلصاق' : 'Embed code'}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={openEmbedPreview} className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        {isRTL ? 'معاينة الكود' : 'Preview embed'}
                      </Button>
                      <Button size="sm" onClick={() => copy(currentSnippet, snippetKind)} className="gap-2">
                        {copied === snippetKind ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {isRTL ? (copied === snippetKind ? 'تم النسخ' : 'نسخ') : (copied === snippetKind ? 'Copied' : 'Copy')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(['html', 'md', 'jsx', 'iframe', 'email', 'link', 'svg'] as SnippetKind[]).map((k) => (
                        <button key={k} type="button" onClick={() => setSnippetKind(k)} aria-pressed={snippetKind === k}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${snippetKind === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted border-border'}`}>
                          {k === 'md' ? 'Markdown' : k === 'jsx' ? 'React/JSX' : k === 'email' ? (isRTL ? 'توقيع بريد' : 'Email sig') : k === 'link' ? (isRTL ? 'رابط' : 'Link') : k.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <Textarea value={currentSnippet} readOnly rows={snippetKind === 'svg' || snippetKind === 'jsx' ? 12 : 8}
                      className="font-mono text-xs tech-content" dir="ltr"
                      onClick={(e) => (e.currentTarget as HTMLTextAreaElement).select()} />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-2" onClick={downloadSvg}>
                        <Download className="w-3.5 h-3.5" />{isRTL ? 'تنزيل SVG' : 'Download SVG'}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={downloadPng}>
                        <Download className="w-3.5 h-3.5" />{isRTL ? 'تنزيل PNG' : 'Download PNG'}
                      </Button>
                      <p className="text-xs text-muted-foreground self-center">
                        {isRTL ? 'بدون CSS أو JS خارجي. كل الأكواد تتضمن تتبع تلقائي.' : 'No external CSS/JS. All snippets include attribution tracking.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ANALYTICS */}
              <TabsContent value="analytics" className="space-y-4 mt-4">
                {/* KPI grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { icon: Eye, label: isRTL ? 'انطباعات (30 يوم)' : 'Impressions (30d)', value: periodStats.last30.impressions, delta: periodStats.delta30.impressions, tone: 'text-foreground' },
                    { icon: MousePointerClick, label: isRTL ? 'نقرات (30 يوم)' : 'Clicks (30d)', value: periodStats.last30.clicks, delta: periodStats.delta30.clicks, tone: 'text-primary' },
                    { icon: Percent, label: 'CTR (30d)', value: `${periodStats.last30.ctr.toFixed(1)}%`, delta: periodStats.delta30.ctr, tone: 'text-success' },
                    { icon: CalendarClock, label: isRTL ? 'حجوزات' : 'Bookings', value: funnel.bookings, delta: 0, tone: 'text-success' },
                  ].map((k) => (
                    <Card key={k.label} className="hover-lift">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground"><k.icon className="w-3 h-3" />{k.label}</div>
                        <div className={`mt-1 text-2xl font-heading font-bold tech-content ${k.tone}`}>{k.value}</div>
                        {k.delta !== 0 && (
                          <div className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${k.delta >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {k.delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {k.delta >= 0 ? '+' : ''}{k.delta.toFixed(0)}%
                            <span className="text-muted-foreground font-normal">{isRTL ? 'مقابل السابق' : 'vs prev'}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" />{isRTL ? 'آخر 30 يومًا' : 'Last 30 days'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailySeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="clkGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={4} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={28} allowDecimals={false} />
                          <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                          <Area type="monotone" dataKey="impressions" stroke="hsl(var(--success))" fill="url(#impGrad)" strokeWidth={2} name={isRTL ? 'انطباعات' : 'Impressions'} />
                          <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="url(#clkGrad)" strokeWidth={2} name={isRTL ? 'نقرات' : 'Clicks'} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{isRTL ? 'مسار التحويل من الشارة' : 'Conversion funnel'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { icon: MousePointerClick, label: isRTL ? 'نقرات' : 'Clicks', value: clicks.length },
                        { icon: Eye, label: isRTL ? 'زيارات الملف' : 'Profile views', value: funnel.profileViews },
                        { icon: MessageSquare, label: isRTL ? 'تواصل' : 'Contacts', value: funnel.anyContact },
                        { icon: CalendarClock, label: isRTL ? 'حجوزات' : 'Bookings', value: funnel.bookings },
                      ].map((s, i, arr) => (
                        <div key={s.label} className="relative rounded-xl border bg-card p-3">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            <s.icon className="w-3 h-3" />{s.label}
                          </div>
                          <div className="mt-1 text-2xl font-heading font-bold tech-content">{s.value}</div>
                          {i < arr.length - 1 && (
                            <ArrowRight className={`hidden sm:block absolute top-1/2 -translate-y-1/2 ${isRTL ? '-start-3 rotate-180' : '-end-3'} w-4 h-4 text-muted-foreground/40`} />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center justify-between">
                        <span className="text-muted-foreground">{isRTL ? 'تواصل ÷ نقرات' : 'Contact rate'}</span>
                        <span className="font-heading font-bold text-primary tech-content">{funnel.contactRate.toFixed(1)}%</span>
                      </div>
                      <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center justify-between">
                        <span className="text-muted-foreground">{isRTL ? 'حجز ÷ نقرات' : 'Booking rate'}</span>
                        <span className="font-heading font-bold text-success tech-content">{funnel.bookingRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    {(funnel.phoneReveals > 0 || funnel.emailReveals > 0) && (
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{isRTL ? `كشف هاتف: ${funnel.phoneReveals}` : `Phone reveals: ${funnel.phoneReveals}`}</span>
                        <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{isRTL ? `كشف بريد: ${funnel.emailReveals}` : `Email reveals: ${funnel.emailReveals}`}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Referrers + Source pages */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />{isRTL ? 'أهم المواقع المُحيلة' : 'Top referrers'}</CardTitle></CardHeader>
                    <CardContent>
                      {referrerStats.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد نقرات بعد.' : 'No clicks yet.'}</p>
                      ) : (
                        <ul className="divide-y rounded-xl border bg-card">
                          {referrerStats.map(([host, count]) => (
                            <li key={host} className="flex items-center justify-between px-3 py-2 text-sm">
                              <span className="font-mono text-xs tech-content truncate" dir="ltr">{host}</span>
                              <Badge variant="secondary" className="tech-content">{count}</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" />{isRTL ? 'الصفحات المصدر' : 'Top source pages'}</CardTitle></CardHeader>
                    <CardContent>
                      {sourcePageStats.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد بيانات بعد.' : 'No data yet.'}</p>
                      ) : (
                        <ul className="divide-y rounded-xl border bg-card">
                          {sourcePageStats.map(([page, count]) => (
                            <li key={page} className="flex items-center justify-between px-3 py-2 text-sm gap-2">
                              <span className="font-mono text-xs tech-content truncate" dir="ltr">{page}</span>
                              <Badge variant="secondary" className="tech-content shrink-0">{count}</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent activity + CSV */}
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" />{isRTL ? 'النشاط الأخير' : 'Recent activity'}</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportRowsToCsv(clicks, `badge-clicks-${business.username}.csv`)} disabled={!clicks.length}>
                        <Download className="w-3.5 h-3.5" />{isRTL ? 'نقرات CSV' : 'Clicks CSV'}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportRowsToCsv(conversions, `badge-conversions-${business.username}.csv`)} disabled={!conversions.length}>
                        <Download className="w-3.5 h-3.5" />{isRTL ? 'تحويلات CSV' : 'Conv. CSV'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentActivity.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{isRTL ? 'لا يوجد نشاط بعد.' : 'No activity yet.'}</p>
                    ) : (
                      <ul className="divide-y rounded-xl border">
                        {recentActivity.map((e) => {
                          const Icon = e.kind === 'click' ? MousePointerClick : e.kind === 'impression' ? Eye : Sparkles;
                          const tone = e.kind === 'click' ? 'text-primary' : e.kind === 'impression' ? 'text-success' : 'text-foreground';
                          return (
                            <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                              <Icon className={`w-3.5 h-3.5 ${tone} shrink-0`} />
                              <span className="text-xs text-muted-foreground capitalize">{e.kind}</span>
                              <span className="font-mono text-xs tech-content truncate flex-1" dir="ltr">{e.meta}</span>
                              <span className="text-[11px] text-muted-foreground shrink-0">{relativeTime(e.ts, isRTL)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SHARE */}
              <TabsContent value="share" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4" />{isRTL ? 'رمز QR' : 'QR code'}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-center rounded-xl border bg-white p-4 min-h-[220px] items-center" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                      <p className="text-xs text-muted-foreground text-center">{isRTL ? 'اطبعه على البطاقات والمنشورات' : 'Print on cards and flyers'}</p>
                      <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => downloadQrPng(profileLink, `qitaat-qr-${business.username}.png`)}>
                        <Download className="w-3.5 h-3.5" />{isRTL ? 'تنزيل PNG' : 'Download PNG'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Share2 className="w-4 h-4" />{isRTL ? 'مشاركة سريعة' : 'Quick share'}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {[
                        { label: 'WhatsApp', href: `https://wa.me/?text=${shareText}%20${shareUrl}`, color: 'bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20' },
                        { label: 'X / Twitter', href: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, color: 'bg-foreground/5 hover:bg-foreground/10' },
                        { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, color: 'bg-[#0077B5]/10 text-[#0077B5] hover:bg-[#0077B5]/20' },
                        { label: isRTL ? 'البريد الإلكتروني' : 'Email', href: `mailto:?subject=${shareText}&body=${shareUrl}`, color: 'bg-muted hover:bg-muted/70' },
                      ].map((s) => (
                        <a key={s.label} href={s.href} target="_blank" rel="noopener" className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-colors ${s.color}`}>
                          <span>{s.label}</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4" />{isRTL ? 'توقيع البريد الإلكتروني' : 'Email signature'}</CardTitle>
                    <Button size="sm" onClick={() => copy(emailSig, 'email-sig')} className="gap-2">
                      {copied === 'email-sig' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {isRTL ? 'نسخ' : 'Copy'}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-xl border bg-card p-4" dangerouslySetInnerHTML={{ __html: emailSig }} />
                    <Textarea value={emailSig} readOnly rows={4} className="font-mono text-xs tech-content" dir="ltr" onClick={(e) => (e.currentTarget as HTMLTextAreaElement).select()} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PLAYBOOK */}
              <TabsContent value="playbook" className="space-y-4 mt-4">
                {!business.is_verified && (
                  <Card className="border-warning/30 bg-warning/5">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                      <div className="text-sm flex-1">
                        <p className="font-semibold">{isRTL ? 'وثّق ورشتك أولاً' : 'Get verified first'}</p>
                        <p className="text-muted-foreground mt-1">
                          {isRTL ? 'لا تنشر الشارة قبل توثيق ورشتك من فريق قِطاعات لتفادي تضليل العملاء.' : 'Do not publish the badge before your workshop is verified by the Qitaat team.'}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild><a href="/dashboard/settings">{isRTL ? 'ابدأ التوثيق' : 'Start verification'}</a></Button>
                    </CardContent>
                  </Card>
                )}

                {/* Goals */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" />{isRTL ? 'أهداف الشهر' : 'Monthly goals'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs">{isRTL ? 'هدف الانطباعات (30 يوم)' : 'Impression goal (30d)'}</Label>
                          <Input type="number" value={goalImpr} onChange={(e) => setGoalImpr(Math.max(0, Number(e.target.value) || 0))} className="h-8 w-24 text-end tech-content" />
                        </div>
                        <Progress value={Math.min(100, (periodStats.last30.impressions / Math.max(goalImpr, 1)) * 100)} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span className="tech-content">{periodStats.last30.impressions} / {goalImpr}</span>
                          <span>{((periodStats.last30.impressions / Math.max(goalImpr, 1)) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs">{isRTL ? 'هدف النقرات (30 يوم)' : 'Click goal (30d)'}</Label>
                          <Input type="number" value={goalClicks} onChange={(e) => setGoalClicks(Math.max(0, Number(e.target.value) || 0))} className="h-8 w-24 text-end tech-content" />
                        </div>
                        <Progress value={Math.min(100, (periodStats.last30.clicks / Math.max(goalClicks, 1)) * 100)} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span className="tech-content">{periodStats.last30.clicks} / {goalClicks}</span>
                          <span>{((periodStats.last30.clicks / Math.max(goalClicks, 1)) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tips */}
                <Card>
                  <CardHeader><CardTitle className="text-base">{isRTL ? 'أين تعرض الشارة لأقصى أثر؟' : 'Where to display for maximum impact'}</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                      {(isRTL ? [
                        'فوتر موقع ورشتك الإلكتروني',
                        'صفحتي "من نحن" و "تواصل معنا"',
                        'توقيع البريد الإلكتروني (الأسلوب المضغوط)',
                        'Google Business Profile و LinkedIn',
                        'عروض الأسعار وملفات PDF التعريفية',
                        'بطاقات العمل والمنشورات الورقية (QR)',
                      ] : [
                        'Your workshop website footer',
                        'About and Contact pages',
                        'Email signature (Compact style)',
                        'Google Business Profile and LinkedIn',
                        'Quotation PDFs and company profiles',
                        'Business cards and printed flyers (QR)',
                      ]).map((t, i) => (
                        <li key={i} className="flex items-start gap-2 rounded-lg border bg-card p-3">
                          <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DIAGNOSTICS */}
              <TabsContent value="diag" className="space-y-4 mt-4">
                {(() => {
                  const lastImpression = impressions[0]?.created_at ?? null;
                  const lastClick = clicks[0]?.created_at ?? null;
                  const lastConversion = conversions[0]?.created_at ?? null;
                  const anyLoading = clicksLoading || impressionsLoading || conversionsLoading;
                  const anyError = clicksError || impressionsError || conversionsError;
                  const anyData = impressions.length + clicks.length + conversions.length > 0;
                  const maskedId = business.id.slice(0, 8) + '…';
                  const lastUpdated = Math.max(clicksUpdatedAt || 0, impressionsUpdatedAt || 0, conversionsUpdatedAt || 0);
                  const refreshAll = () => { void refetchClicks(); void refetchImpressions(); void refetchConversions(); };
                  return (
                    <>
                      <Card>
                        <CardHeader className="flex-row items-center justify-between gap-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Stethoscope className="w-4 h-4" />{isRTL ? 'تشخيص الشارة' : 'Badge diagnostics'}
                          </CardTitle>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={refreshAll} aria-label={isRTL ? 'تحديث' : 'Refresh'}>
                            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                            {isRTL ? 'تحديث' : 'Refresh'}
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Status */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              {
                                label: isRTL ? 'حالة التتبع' : 'Tracking status',
                                value: anyError ? (isRTL ? 'خطأ' : 'Error') : anyLoading ? (isRTL ? 'يحمّل…' : 'Loading…') : anyData ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'بانتظار أحداث' : 'Awaiting events'),
                                tone: anyError ? 'text-destructive' : anyData ? 'text-success' : 'text-muted-foreground',
                              },
                              {
                                label: isRTL ? 'مرات الظهور' : 'Impressions',
                                value: impressions.length.toLocaleString(),
                                tone: 'text-foreground',
                              },
                              {
                                label: isRTL ? 'النقرات' : 'Clicks',
                                value: clicks.length.toLocaleString(),
                                tone: 'text-primary',
                              },
                              {
                                label: isRTL ? 'التحويلات' : 'Conversions',
                                value: conversions.length.toLocaleString(),
                                tone: 'text-success',
                              },
                            ].map((s) => (
                              <div key={s.label} className="rounded-xl border bg-card p-3">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                                <div className={`mt-1 text-lg font-heading font-bold tech-content ${s.tone}`}>{s.value}</div>
                              </div>
                            ))}
                          </div>

                          {anyError && (
                            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                              <p className="text-xs text-destructive">
                                {isRTL ? 'تعذر تحميل بيانات التتبع. حاول التحديث أو راجع الاتصال بالشبكة.' : 'Could not load tracking data. Try refreshing or check your network connection.'}
                              </p>
                            </div>
                          )}

                          {/* Last activity */}
                          <div className="rounded-xl border bg-card p-3">
                            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                              <Activity className="w-3 h-3" aria-hidden="true" />{isRTL ? 'آخر نشاط' : 'Last activity'}
                            </div>
                            <ul className="space-y-1.5 text-xs">
                              <li className="flex items-center justify-between">
                                <span className="text-muted-foreground inline-flex items-center gap-1.5"><Eye className="w-3 h-3" aria-hidden="true" />{isRTL ? 'آخر ظهور' : 'Last impression'}</span>
                                <span className="tech-content font-medium">{lastImpression ? relativeTime(lastImpression, isRTL) : (isRTL ? 'لا يوجد' : '—')}</span>
                              </li>
                              <li className="flex items-center justify-between">
                                <span className="text-muted-foreground inline-flex items-center gap-1.5"><MousePointerClick className="w-3 h-3" aria-hidden="true" />{isRTL ? 'آخر نقرة' : 'Last click'}</span>
                                <span className="tech-content font-medium">{lastClick ? relativeTime(lastClick, isRTL) : (isRTL ? 'لا يوجد' : '—')}</span>
                              </li>
                              <li className="flex items-center justify-between">
                                <span className="text-muted-foreground inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" aria-hidden="true" />{isRTL ? 'آخر تحويل' : 'Last conversion'}</span>
                                <span className="tech-content font-medium">{lastConversion ? relativeTime(lastConversion, isRTL) : (isRTL ? 'لا يوجد' : '—')}</span>
                              </li>
                            </ul>
                          </div>

                          {/* Data source */}
                          <div className="rounded-xl border bg-card p-3">
                            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                              <Database className="w-3 h-3" aria-hidden="true" />{isRTL ? 'مصدر البيانات' : 'Data source'}
                            </div>
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <dt className="text-muted-foreground">{isRTL ? 'الورشة' : 'Workshop'}</dt>
                                <dd className="tech-content font-mono" dir="ltr">@{business.username}</dd>
                              </div>
                              <div className="flex items-center justify-between">
                                <dt className="text-muted-foreground">{isRTL ? 'مُعرّف داخلي' : 'Internal ID'}</dt>
                                <dd className="tech-content font-mono text-muted-foreground" dir="ltr" title={isRTL ? 'مُختصر لأغراض الخصوصية' : 'Truncated for privacy'}>{maskedId}</dd>
                              </div>
                              <div className="flex items-center justify-between">
                                <dt className="text-muted-foreground">{isRTL ? 'موثّقة' : 'Verified'}</dt>
                                <dd>
                                  {business.is_verified
                                    ? <Badge className="bg-success text-success-foreground">{isRTL ? 'نعم' : 'Yes'}</Badge>
                                    : <Badge variant="outline" className="text-warning border-warning/40">{isRTL ? 'لا' : 'No'}</Badge>}
                                </dd>
                              </div>
                              <div className="flex items-center justify-between">
                                <dt className="text-muted-foreground">{isRTL ? 'سكربت التتبع' : 'Tracking script'}</dt>
                                <dd className="inline-flex items-center gap-1">
                                  <CircleDot className="w-3 h-3 text-success" aria-hidden="true" />
                                  <span className="text-success font-semibold">{isRTL ? 'مُضمّن في الكود' : 'Embedded'}</span>
                                </dd>
                              </div>
                              <div className="flex items-center justify-between">
                                <dt className="text-muted-foreground">{isRTL ? 'استلام الأحداث' : 'Receiving events'}</dt>
                                <dd className={anyData ? 'text-success font-semibold' : 'text-muted-foreground'}>
                                  {anyData ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا (انتظر بعد النشر)' : 'No (wait after embedding)')}
                                </dd>
                              </div>
                              <div className="flex items-center justify-between">
                                <dt className="text-muted-foreground">{isRTL ? 'آخر مزامنة' : 'Last sync'}</dt>
                                <dd className="tech-content">{lastUpdated ? relativeTime(new Date(lastUpdated).toISOString(), isRTL) : '—'}</dd>
                              </div>
                            </dl>
                          </div>

                          {!anyData && !anyLoading && !anyError && (
                            <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center">
                              <p className="text-xs text-muted-foreground">
                                {isRTL
                                  ? 'لم تُسجَّل أحداث بعد. انسخ كود الشارة من تبويب «المولّد» وألصقه في موقعك؛ ستظهر الأحداث هنا خلال دقائق.'
                                  : 'No events recorded yet. Copy the badge code from the Generator tab into your site; events will appear here within minutes.'}
                              </p>
                            </div>
                          )}

                          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
                            {isRTL
                              ? 'تُستخدم هذه البيانات لأغراض التشخيص فقط. لا تُعرض أي مفاتيح أو رموز خاصة.'
                              : 'This panel is for diagnostics only. No private tokens or secrets are exposed.'}
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardBadge;
