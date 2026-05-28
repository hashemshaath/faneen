/**
 * IdentityDiagnosticsDeepPanel
 * ────────────────────────────
 * Severity-graded identity & entity health overview for /admin/identity.
 * Read-only — never performs ownership rewrites, account merges, or
 * auth.users mutations. The only inline "fix" exposed is the existing
 * safe `syncProfileEmailFromAuth` RPC.
 *
 * Privacy:
 *   - `masked_email` values come from the server RPC already redacted.
 *   - Local `maskEmail` / `maskPhone` helpers are applied to anything else.
 *   - Synthetic phone-login emails (the internal phone-auth domain) are never rendered.
 *   - No raw recovery tokens / auth metadata.
 *
 * Deep-link convention:
 *   /admin/identity?view=integrity&group=<DiagnosticGroupId>
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  ShieldAlert, AlertTriangle, Info, CheckCircle2, ExternalLink, RefreshCw, Wand2,
} from 'lucide-react';
import { maskEmail } from '@/lib/masking';
import {
  computeIdentityDiagnostics,
  type DiagnosticGroup,
  type DiagnosticGroupId,
  type DiagnosticSeverity,
} from '@/lib/identity/computeIdentityDiagnostics';
import {
  getAdminIdentityIntegrityReport,
  getAdminIdentityDuplicatesReport,
  syncProfileEmailFromAuth,
} from '@/modules/identity';
import { listAllBusinessStaffForAdmin } from '@/modules/businesses';

interface Props {
  isRTL: boolean;
  profiles: ReadonlyArray<{ user_id: string; ref_id: string | null; email: string | null; full_name: string | null }>;
  businesses: ReadonlyArray<{ id: string; user_id: string; ref_id: string | null; name_ar: string | null; name_en: string | null }>;
  roles: ReadonlyArray<{ user_id: string; role: string }>;
  /** Optional anchor group from URL (?group=...) — scrolls into view. */
  anchorGroup?: DiagnosticGroupId | null;
}

interface StaffRow {
  id: string;
  business_id: string | null;
  user_id: string | null;
  role: string | null;
  is_active: boolean;
  is_primary_manager: boolean | null;
}

const SEV_META: Record<DiagnosticSeverity, { icon: React.ElementType; tone: string; chip: string; ar: string; en: string }> = {
  critical: { icon: ShieldAlert, tone: 'border-destructive/40 bg-destructive/5',
    chip: 'bg-destructive/10 text-destructive border-destructive/30', ar: 'حرج', en: 'Critical' },
  warning:  { icon: AlertTriangle, tone: 'border-warning/40 bg-warning/5',
    chip: 'bg-warning/10 text-warning border-warning/30', ar: 'تنبيه', en: 'Warning' },
  info:     { icon: Info, tone: 'border-info/40 bg-info/5',
    chip: 'bg-info/10 text-info border-info/30', ar: 'ملاحظة', en: 'Info' },
  healthy:  { icon: CheckCircle2, tone: 'border-success/40 bg-success/5',
    chip: 'bg-success/10 text-success border-success/30', ar: 'سليم', en: 'Healthy' },
};

export const IdentityDiagnosticsDeepPanel: React.FC<Props> = ({
  isRTL, profiles, businesses, roles, anchorGroup,
}) => {
  const qc = useQueryClient();

  const integrityQ = useQuery({
    queryKey: ['admin-identity', 'integrity-deep'],
    queryFn: async () => {
      const { data, error } = await getAdminIdentityIntegrityReport();
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const duplicatesQ = useQuery({
    queryKey: ['admin-identity', 'duplicates-deep'],
    queryFn: async () => {
      const { data, error } = await getAdminIdentityDuplicatesReport();
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const staffQ = useQuery<StaffRow[]>({
    queryKey: ['admin-identity', 'staff-deep'],
    queryFn: async () => {
      const { data, error } = await listAllBusinessStaffForAdmin<StaffRow>({
        select: 'id, business_id, user_id, role, is_active, is_primary_manager',
      });
      if (error) throw error;
      return (data ?? []) as StaffRow[];
    },
    staleTime: 30_000,
  });

  const loading = integrityQ.isLoading || duplicatesQ.isLoading || staffQ.isLoading;

  const result = useMemo(() => computeIdentityDiagnostics({
    profiles,
    businesses,
    roles,
    staff: staffQ.data ?? [],
    integrity: integrityQ.data ?? [],
    duplicates: duplicatesQ.data ?? [],
  }), [profiles, businesses, roles, staffQ.data, integrityQ.data, duplicatesQ.data]);

  const grouped: Record<DiagnosticSeverity, DiagnosticGroup[]> = useMemo(() => {
    const out: Record<DiagnosticSeverity, DiagnosticGroup[]> = { critical: [], warning: [], info: [], healthy: [] };
    for (const g of result.groups) {
      if (g.count > 0 && g.severity !== 'healthy') out[g.severity].push(g);
    }
    return out;
  }, [result.groups]);

  const refreshAll = () => {
    integrityQ.refetch(); duplicatesQ.refetch(); staffQ.refetch();
  };

  const syncEmail = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await syncProfileEmailFromAuth(userId);
      if (error) throw error;
      if (!data?.success) throw new Error(data?.reason || 'unknown_error');
      return data;
    },
    onSuccess: () => {
      toast({ title: isRTL ? 'تم إصلاح البريد' : 'Email synced' });
      qc.invalidateQueries({ queryKey: ['admin-identity'] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'error';
      toast({
        title: isRTL ? 'تعذّر الإصلاح' : 'Sync failed',
        description: msg,
        variant: 'destructive',
      });
    },
  });

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-4" data-testid="identity-diagnostics-deep">
      {/* ── Severity KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['critical', 'warning', 'info', 'healthy'] as const).map((sev) => {
          const meta = SEV_META[sev];
          const value = sev === 'healthy'
            ? (result.isHealthy ? (isRTL ? 'سليم' : 'OK') : '—')
            : result.totals[sev];
          return (
            <a
              key={sev}
              href={`#diag-${sev}`}
              data-severity={sev}
              className={`group rounded-2xl border ${meta.tone} p-4 transition-all hover:shadow-md hover-lift block`}
              aria-label={isRTL ? `الانتقال إلى مجموعة ${meta.ar}` : `Jump to ${meta.en} group`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-card/60 backdrop-blur flex items-center justify-center">
                  <meta.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold font-heading leading-none tech-content text-foreground">{value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    {isRTL ? meta.ar : meta.en}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-sm">
          {isRTL ? 'مجموعات التشخيص بالخطورة' : 'Diagnostic groups by severity'}
        </h3>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-xl" onClick={refreshAll}>
          <RefreshCw className="w-3.5 h-3.5" />
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {/* ── Healthy empty state ── */}
      {result.isHealthy && (
        <div
          id="diag-healthy"
          data-testid="diag-empty-healthy"
          className="rounded-2xl border border-success/30 bg-success/5 p-10 text-center"
        >
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
          <p className="text-sm font-semibold text-success">
            {isRTL ? 'كل التشخيصات سليمة' : 'All diagnostics healthy'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {isRTL
              ? 'لم يُكتشف أي تعارض هوية أو مشكلة ملكية أو دعوة معلّقة.'
              : 'No identity mismatches, ownership issues, or pending invitations detected.'}
          </p>
        </div>
      )}

      {/* ── Severity sections ── */}
      {(['critical', 'warning', 'info'] as const).map((sev) => {
        const items = grouped[sev];
        if (items.length === 0) return null;
        const meta = SEV_META[sev];
        return (
          <section
            key={sev}
            id={`diag-${sev}`}
            data-severity-section={sev}
            className="space-y-3 scroll-mt-24"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] px-2 py-0 ${meta.chip}`}>
                {isRTL ? meta.ar : meta.en}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {isRTL ? `${items.length} مجموعة` : `${items.length} group(s)`}
              </span>
            </div>
            <div className="grid lg:grid-cols-2 gap-3">
              {items.map((g) => (
                <DiagnosticCard
                  key={g.id}
                  group={g}
                  isRTL={isRTL}
                  anchored={anchorGroup === g.id}
                  onSync={(uid) => syncEmail.mutate(uid)}
                  syncing={syncEmail.isPending}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

/* ───── card ───── */
const DiagnosticCard: React.FC<{
  group: DiagnosticGroup;
  isRTL: boolean;
  anchored: boolean;
  onSync: (userId: string) => void;
  syncing: boolean;
}> = ({ group, isRTL, anchored, onSync, syncing }) => {
  const meta = SEV_META[group.severity];
  return (
    <div
      id={`group-${group.id}`}
      data-group-id={group.id}
      className={`rounded-2xl border ${anchored ? 'border-primary/60 ring-2 ring-primary/20' : 'border-border/40'} bg-card p-4 scroll-mt-24`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.chip}`}>
          <meta.icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm">{isRTL ? group.label_ar : group.label_en}</h4>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{group.count}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isRTL ? group.description_ar : group.description_en}
          </p>
        </div>
      </div>

      {group.records.length > 0 && (
        <ul className="space-y-1.5 mb-3 max-h-56 overflow-auto pr-1">
          {group.records.slice(0, 10).map((r) => (
            <li key={r.key} className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border/30 px-2 py-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate tech-content">
                  {/* Defensive UI-side mask in case any non-masked value slipped through. */}
                  {r.label.includes('@') ? maskEmail(r.label) : r.label}
                </p>
                {r.hint && <p className="text-[10px] text-muted-foreground truncate">{r.hint}</p>}
              </div>
              {r.href && (
                <Link to={r.href} className="text-[11px] text-info hover:underline inline-flex items-center gap-0.5">
                  <ExternalLink className="w-3 h-3" />
                  {isRTL ? 'فتح' : 'Open'}
                </Link>
              )}
              {r.syncTargetUserId && (
                <Button
                  size="sm" variant="ghost"
                  className="h-7 px-2 text-[11px] gap-1"
                  disabled={syncing}
                  onClick={() => onSync(r.syncTargetUserId!)}
                >
                  <Wand2 className="w-3 h-3" />
                  {isRTL ? 'مزامنة' : 'Sync'}
                </Button>
              )}
            </li>
          ))}
          {group.records.length > 10 && (
            <li className="text-[10px] text-muted-foreground text-center pt-1">
              {isRTL ? `+${group.records.length - 10} عناصر إضافية` : `+${group.records.length - 10} more`}
            </li>
          )}
        </ul>
      )}

      {group.actions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">
            {isRTL ? 'إجراءات مقترحة:' : 'Suggested:'}
          </span>
          {group.actions.map((a) => (
            <Badge
              key={a.id}
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${a.futureOnly ? 'opacity-60 italic' : ''}`}
              title={a.futureOnly ? (isRTL ? 'إجراء مستقبلي' : 'Future action') : undefined}
            >
              {isRTL ? a.label_ar : a.label_en}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default IdentityDiagnosticsDeepPanel;
