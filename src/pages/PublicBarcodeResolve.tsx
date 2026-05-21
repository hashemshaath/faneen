/**
 * Phase 3 — Unified barcode resolver at /q/:barcode_code.
 *
 * Hard rules (mirror /s/:token):
 *  - anon-callable RPC; no address / phone / map / coords / token / hash ever rendered.
 *  - never reveals whether the code exists, is private, frozen, revoked, or archived.
 *  - noindex; not in sitemap; robots disallows /q/.
 */
import React, { useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Building2, ExternalLink, FileCheck2, Loader2, MapPin, ShieldCheck, ListChecks, CheckCircle2, Clock, Inbox, Hammer, ChefHat, Frame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { BrandLogo } from '@/components/common/BrandLogo';

type ResolveResult =
  | { status: 'unavailable' }
  | {
      status: 'available';
      barcode_code: string;
      entity_type: 'client_site' | 'contract' | 'business';
      visibility: string;
      title: string | null;
      subtitle: string | null;
      data: Record<string, unknown>;
    };

const PublicBarcodeResolve: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { barcode_code: rawCode } = useParams<{ barcode_code: string }>();
  const code = (rawCode ?? '').trim();

  const { data, isLoading } = useQuery({
    queryKey: ['resolve-barcode', code],
    enabled: code.length >= 4,
    retry: false,
    queryFn: async (): Promise<ResolveResult> => {
      const { data, error } = await supabase.rpc('resolve_barcode', { _code: code });
      if (error) throw error;
      return (data as unknown as ResolveResult) ?? { status: 'unavailable' };
    },
  });

  useEffect(() => {
    const prev = document.title;
    document.title = bi('كود — قِطاعات', 'Code — Qitaat');
    return () => { document.title = prev; };
  }, [bi]);

  const unavailable = !isLoading && (!data || data.status !== 'available');

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="border-b border-border/40 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 hover-lift">
            <BrandLogo size={28} />
          </Link>
          <Badge variant="outline" size="sm" className="text-[10px]">
            <ShieldCheck className="w-3 h-3 me-1" />
            {bi('كود قِطاعات', 'Qitaat code')}
          </Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{bi('جارٍ التحميل…', 'Loading…')}</span>
          </div>
        )}

        {unavailable && !isLoading && (
          <section className="p-6 rounded-xl border border-border/40 bg-muted/20 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
            <h1 className="text-base font-semibold">
              {bi('الكود غير متاح', 'Code unavailable')}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {bi('الكود غير متاح أو تم إيقافه.', 'This code is unavailable or has been disabled.')}
            </p>
            <Button asChild variant="outline" size="sm" className="h-9 text-xs">
              <Link to="/">{bi('العودة للرئيسية', 'Back to home')}</Link>
            </Button>
          </section>
        )}

        {data && data.status === 'available' && (
          <ResolvedCard data={data} isRTL={isRTL} />
        )}
      </main>
    </div>
  );
};

interface ResolvedCardProps {
  data: Extract<ResolveResult, { status: 'available' }>;
  isRTL: boolean;
}

const ResolvedCard: React.FC<ResolvedCardProps> = ({ data, isRTL }) => {
  const bi = useBi();

  const codeChip = (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" size="sm" className="tech-content text-[11px]" dir="ltr">
        {data.barcode_code}
      </Badge>
      <CopyButton value={data.barcode_code} label={bi('الكود', 'Code')} />
    </div>
  );

  if (data.entity_type === 'client_site') {
    return (
      <section className="p-5 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h1 className="text-base font-semibold truncate">
            {data.title || bi('موقع', 'Site')}
          </h1>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {bi('كود المشروع', 'Project code')}
        </p>
        {codeChip}
        {data.subtitle && (
          <p className="text-xs text-muted-foreground">{data.subtitle}</p>
        )}
        <p className="text-[11px] text-muted-foreground bg-info/5 border border-info/20 rounded-md p-2 leading-relaxed">
          {bi(
            'لا تظهر تفاصيل الموقع إلا بعد موافقة صاحب الموقع.',
            'Site details are only shown after the site owner approves access.',
          )}
        </p>
      </section>
    );
  }

  if (data.entity_type === 'contract') {
    const cstatus = String((data.data as { contract_status?: string }).contract_status ?? '');
    const provider = (data.data as { provider_name?: string | null; provider_username?: string | null });
    return (
      <section className="p-5 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-primary" />
          <h1 className="text-base font-semibold truncate">
            {data.title || bi('عقد', 'Contract')}
          </h1>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {bi('كود العقد', 'Contract code')}
        </p>
        {codeChip}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-muted-foreground">{bi('الحالة', 'Status')}:</span>
          <Badge variant="outline" size="sm" className="text-[10px]">{cstatus || '—'}</Badge>
        </div>
        {provider.provider_name && (
          <div className="text-xs flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{bi('المزوّد', 'Provider')}:</span>
            {provider.provider_username ? (
              <Link to={`/${provider.provider_username}`} className="text-primary hover:underline">
                {provider.provider_name}
              </Link>
            ) : (
              <span>{provider.provider_name}</span>
            )}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground bg-info/5 border border-info/20 rounded-md p-2 leading-relaxed">
          {bi(
            'هذه صفحة تحقق عامة لا تعرض بنود أو أسعار العقد.',
            'This is a public verification page. Contract terms and pricing are not shown.',
          )}
        </p>
      </section>
    );
  }

  if (data.entity_type === 'business') {
    const biz = data.data as {
      username?: string | null;
      public_profile_path?: string | null;
      approved?: boolean;
      contracts?: Array<{
        contract_number: string;
        title: string | null;
        status: string;
        start_date: string | null;
        end_date: string | null;
        is_closed: boolean;
      }>;
      contracts_counts?: { open: number; closed: number; total: number };
      lead_requests?: Array<{
        ref_id: string | null;
        subject: string | null;
        sector: 'aluminum' | 'blacksmith' | 'kitchens' | string;
        status: string;
        created_at: string;
      }>;
      lead_counts?: { aluminum: number; blacksmith: number; kitchens: number; total: number };
    };
    const contracts = Array.isArray(biz.contracts) ? biz.contracts : [];
    const counts = biz.contracts_counts || { open: 0, closed: 0, total: contracts.length };
    const leadRequests = Array.isArray(biz.lead_requests) ? biz.lead_requests : [];
    const leadCounts = biz.lead_counts || { aluminum: 0, blacksmith: 0, kitchens: 0, total: leadRequests.length };
    const fmtDate = (d: string | null) => {
      if (!d) return '—';
      try {
        return new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-GB', {
          year: 'numeric', month: 'short', day: 'numeric',
        });
      } catch { return d; }
    };
    const statusLabel = (s: string) => {
      const map: Record<string, [string, string]> = {
        active: ['نشط', 'Active'],
        completed: ['مكتمل', 'Completed'],
        pending_approval: ['قيد الموافقة', 'Pending'],
        cancelled: ['ملغي', 'Cancelled'],
        disputed: ['متنازع عليه', 'Disputed'],
      };
      const [ar, en] = map[s] || [s, s];
      return bi(ar, en);
    };
    const statusTone = (s: string) =>
      s === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
      : s === 'completed' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
      : s === 'pending_approval' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
      : s === 'disputed' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
      : 'bg-muted text-muted-foreground border-border/50';
    const sectorMeta = (s: string): { label: string; icon: React.ElementType; tone: string } => {
      switch (s) {
        case 'aluminum':
          return { label: bi('ألمنيوم', 'Aluminum'), icon: Frame, tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30' };
        case 'blacksmith':
          return { label: bi('حدادة', 'Blacksmith'), icon: Hammer, tone: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30' };
        case 'kitchens':
          return { label: bi('مطابخ', 'Kitchens'), icon: ChefHat, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' };
        default:
          return { label: s, icon: Inbox, tone: 'bg-muted text-muted-foreground border-border/50' };
      }
    };
    const leadStatusLabel = (s: string) => {
      const map: Record<string, [string, string]> = {
        new: ['جديد', 'New'],
        viewed: ['تمت المشاهدة', 'Viewed'],
        contacted: ['تم التواصل', 'Contacted'],
        quoted: ['تم التسعير', 'Quoted'],
        needs_info: ['بانتظار معلومات', 'Needs info'],
        qualified: ['مؤهل', 'Qualified'],
        accepted: ['مقبول', 'Accepted'],
      };
      const [ar, en] = map[s] || [s, s];
      return bi(ar, en);
    };
    // Show explicit redirect card (avoid surprise navigation in QA)
    return (
      <>
      <section className="p-5 rounded-xl border border-border/40 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h1 className="text-base font-semibold truncate">
            {data.title || bi('منشأة', 'Business')}
          </h1>
        </div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {bi('كود المنشأة', 'Business code')}
        </p>
        {codeChip}
        {biz.username && (
          <p className="text-xs text-muted-foreground tech-content" dir="ltr">@{biz.username}</p>
        )}
        {leadCounts.total > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Inbox className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-semibold">
                  {bi('طلبات العقود المفتوحة', 'Open contract requests')}
                </p>
              </div>
              <Badge variant="outline" size="sm" className="text-[10px]">
                {leadCounts.total}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['aluminum','blacksmith','kitchens'] as const).map((sec) => {
                const meta = sectorMeta(sec);
                const Icon = meta.icon;
                const n = leadCounts[sec] || 0;
                if (n === 0) return null;
                return (
                  <Badge key={sec} variant="outline" size="sm" className={`text-[10px] gap-1 ${meta.tone}`}>
                    <Icon className="w-3 h-3" />
                    {meta.label}: {n}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        {biz.approved && biz.public_profile_path ? (
          <Button asChild variant="hero" size="sm" className="h-10 w-full text-xs gap-1.5">
            <Link to={biz.public_profile_path}>
              <ExternalLink className="w-3.5 h-3.5" />
              {bi('فتح الملف العام', 'Open public profile')}
            </Link>
          </Button>
        ) : (
          <p className="text-[11px] text-muted-foreground bg-muted/30 border border-border/40 rounded-md p-2">
            {bi('الملف العام غير متاح حالياً.', 'Public profile is currently unavailable.')}
          </p>
        )}
      </section>

      {counts.total > 0 && (
        <section className="p-5 rounded-xl border border-border/40 bg-card space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">
                {bi('عقود المنشأة', 'Business contracts')}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" size="sm" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <Clock className="w-3 h-3" />
                {bi('مفتوحة', 'Open')}: {counts.open}
              </Badge>
              <Badge variant="outline" size="sm" className="text-[10px] gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
                <CheckCircle2 className="w-3 h-3" />
                {bi('مغلقة', 'Closed')}: {counts.closed}
              </Badge>
            </div>
          </div>

          <ul className="space-y-2">
            {contracts.map((c) => (
              <li
                key={c.contract_number}
                className="p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate" title={c.title || ''}>
                      {c.title || bi('عقد', 'Contract')}
                    </p>
                    <p className="text-[11px] text-muted-foreground tech-content mt-0.5" dir="ltr">
                      {c.contract_number}
                    </p>
                  </div>
                  <Badge variant="outline" size="sm" className={`text-[10px] ${statusTone(c.status)}`}>
                    {statusLabel(c.status)}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                  <span>{bi('البدء', 'Start')}: <span className="tech-content">{fmtDate(c.start_date)}</span></span>
                  <span>·</span>
                  <span>{bi('الانتهاء', 'End')}: <span className="tech-content">{fmtDate(c.end_date)}</span></span>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-[10px] text-muted-foreground bg-info/5 border border-info/20 rounded-md p-2 leading-relaxed">
            {bi(
              'صفحة تحقق عامة — لا تُعرض المبالغ أو بيانات العملاء أو بنود العقود.',
              'Public verification page — amounts, client data, and contract terms are not shown.',
            )}
          </p>
        </section>
      )}

      {leadCounts.total > 0 && (
        <section className="p-5 rounded-xl border border-border/40 bg-card space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">
                {bi('طلبات العقود المفتوحة', 'Open contract requests')}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['aluminum','blacksmith','kitchens'] as const).map((sec) => {
                const meta = sectorMeta(sec);
                const Icon = meta.icon;
                const n = leadCounts[sec] || 0;
                if (n === 0) return null;
                return (
                  <Badge key={sec} variant="outline" size="sm" className={`text-[10px] gap-1 ${meta.tone}`}>
                    <Icon className="w-3 h-3" />
                    {meta.label}: {n}
                  </Badge>
                );
              })}
            </div>
          </div>

          <ul className="space-y-2">
            {leadRequests.map((lr, idx) => {
              const meta = sectorMeta(lr.sector);
              const Icon = meta.icon;
              return (
                <li
                  key={lr.ref_id || idx}
                  className="p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" size="sm" className={`text-[10px] gap-1 ${meta.tone}`}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </Badge>
                        {lr.ref_id && (
                          <span className="text-[10px] text-muted-foreground tech-content" dir="ltr">
                            {lr.ref_id}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold truncate mt-1.5" title={lr.subject || ''}>
                        {lr.subject || bi('طلب عقد', 'Contract request')}
                      </p>
                    </div>
                    <Badge variant="outline" size="sm" className="text-[10px]">
                      {leadStatusLabel(lr.status)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                    <span>{bi('التاريخ', 'Date')}: <span className="tech-content">{fmtDate(lr.created_at)}</span></span>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-[10px] text-muted-foreground bg-info/5 border border-info/20 rounded-md p-2 leading-relaxed">
            {bi(
              'بيانات العملاء وأرقام التواصل ومحتوى الطلب لا تُعرض في الصفحة العامة.',
              'Customer details, contact numbers, and request content are not shown on this public page.',
            )}
          </p>
        </section>
      )}
      </>
    );
  }

  // Defensive fallback (should never hit — RPC returns 'unavailable' for other types)
  return <Navigate to="/" replace />;
};

export default PublicBarcodeResolve;