/**
 * IdentityIntegrityPanel
 * ──────────────────────
 * Super-admin diagnostics tab for /admin/identity. Surfaces two read-only
 * server reports and inline repair actions:
 *
 *   1. Duplicates  → public.admin_identity_duplicates_report()
 *        - duplicate emails / usernames / phones inside profiles
 *        - auth.users vs profiles email mismatches
 *   2. Integrity   → public.admin_identity_integrity_report()
 *        - missing profiles, missing emails, role/business presence
 *
 * Repair action available inline (no popups):
 *   - "Sync profile email from login" → admin_sync_profile_email_from_auth
 *
 * Strict no-popup rule: every action is inline with status badges.
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  AlertTriangle, Mail, AtSign, Phone, Link2, RefreshCw, ShieldCheck,
  Users, Wand2, FileDown, ExternalLink, Database, CheckCircle2,
} from 'lucide-react';
import {
  getAdminIdentityDuplicatesReport,
  type IdentityDuplicateRow,
  type IdentityDuplicateKind,
  getAdminIdentityIntegrityReport,
  type IdentityIntegrityRow,
  syncProfileEmailFromAuth,
} from '@/modules/identity';

interface Props { isRTL: boolean }

const KIND_META: Record<IdentityDuplicateKind, { icon: React.ElementType; ar: string; en: string; tone: string }> = {
  email:    { icon: Mail,        ar: 'بريد مكرّر',           en: 'Duplicate email',          tone: 'bg-destructive/10 text-destructive border-destructive/30' },
  username: { icon: AtSign,      ar: 'اسم مستخدم مكرّر',     en: 'Duplicate username',       tone: 'bg-warning/10 text-warning border-warning/30' },
  phone:    { icon: Phone,       ar: 'هاتف مكرّر',           en: 'Duplicate phone',          tone: 'bg-warning/10 text-warning border-warning/30' },
  auth_profile_email_mismatch: {
    icon: Link2, ar: 'تعارض بريد الدخول/الملف', en: 'Login vs profile mismatch',
    tone: 'bg-info/10 text-info border-info/30',
  },
};

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const IdentityIntegrityPanel: React.FC<Props> = ({ isRTL }) => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'duplicates' | 'integrity'>('duplicates');
  const [filter, setFilter] = useState('');

  const dupsQuery = useQuery({
    queryKey: ['admin-identity', 'duplicates'],
    queryFn: async () => {
      const { data, error } = await getAdminIdentityDuplicatesReport();
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const integrityQuery = useQuery({
    queryKey: ['admin-identity', 'integrity'],
    queryFn: async () => {
      const { data, error } = await getAdminIdentityIntegrityReport();
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const syncEmail = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await syncProfileEmailFromAuth(userId);
      if (error) throw error;
      if (!data?.success) throw new Error(data?.reason || 'unknown_error');
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: isRTL ? 'تم إصلاح البريد' : 'Email synced',
        description: `${data?.old ?? '—'} → ${data?.new ?? '—'}`,
      });
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

  const dups = dupsQuery.data ?? [];
  const integ = integrityQuery.data ?? [];

  const filteredDups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return dups;
    return dups.filter(d =>
      d.value?.toLowerCase().includes(q) ||
      d.kind.toLowerCase().includes(q) ||
      d.user_ids.some(u => u.toLowerCase().includes(q)),
    );
  }, [dups, filter]);

  const filteredInteg = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const base = integ.filter(r => r.mismatch_type !== 'ok');
    if (!q) return base;
    return base.filter(r =>
      r.masked_email.toLowerCase().includes(q) ||
      r.user_id.toLowerCase().includes(q) ||
      r.mismatch_type.toLowerCase().includes(q),
    );
  }, [integ, filter]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const byKind: Record<IdentityDuplicateKind, number> = {
      email: 0, username: 0, phone: 0, auth_profile_email_mismatch: 0,
    };
    for (const d of dups) byKind[d.kind] += 1;
    const integIssues = integ.filter(r => r.mismatch_type !== 'ok').length;
    return { ...byKind, integIssues, totalAccounts: integ.length };
  }, [dups, integ]);

  const loading = dupsQuery.isLoading || integrityQuery.isLoading;

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card to-muted/20 p-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-heading font-bold text-sm">
              {isRTL ? 'سلامة الهوية وكشف التكرار' : 'Identity integrity & duplicates'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isRTL
                ? 'فحص شامل عبر auth.users و profiles لكشف ازدواج البريد/اسم المستخدم/الهاتف وعدم التطابق مع بيانات الدخول.'
                : 'Full audit across auth.users and profiles to detect duplicate emails / usernames / phones and login mismatches.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-xl"
              onClick={() => { dupsQuery.refetch(); integrityQuery.refetch(); }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs rounded-xl"
              onClick={() => downloadJson(
                `identity-report-${new Date().toISOString().slice(0,10)}.json`,
                { duplicates: dups, integrity: integ },
              )}>
              <FileDown className="w-3.5 h-3.5" />
              {isRTL ? 'تصدير JSON' : 'Export'}
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
          <KpiPill icon={Users}     label={isRTL ? 'حسابات تسجيل' : 'Auth accounts'} value={kpis.totalAccounts} tone="primary" />
          <KpiPill icon={Mail}      label={isRTL ? 'بريد مكرّر' : 'Dup emails'}      value={kpis.email}        tone={kpis.email ? 'destructive' : 'success'} />
          <KpiPill icon={AtSign}    label={isRTL ? 'مستخدم مكرّر' : 'Dup usernames'} value={kpis.username}     tone={kpis.username ? 'warning' : 'success'} />
          <KpiPill icon={Phone}     label={isRTL ? 'هاتف مكرّر' : 'Dup phones'}      value={kpis.phone}        tone={kpis.phone ? 'warning' : 'success'} />
          <KpiPill icon={Link2}     label={isRTL ? 'تعارض بريد' : 'Email mismatch'} value={kpis.auth_profile_email_mismatch + kpis.integIssues} tone={(kpis.auth_profile_email_mismatch + kpis.integIssues) ? 'info' : 'success'} />
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          dir="auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={isRTL ? 'بحث في البريد/المستخدم/المعرّف…' : 'Filter email / username / id…'}
          className="h-10 rounded-xl tech-content"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'duplicates' | 'integrity')} className="w-full">
        <TabsList className="bg-card border border-border/30 rounded-2xl p-1.5 h-auto">
          <TabsTrigger value="duplicates" className="rounded-xl gap-1.5 py-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            {isRTL ? 'التكرار' : 'Duplicates'}
            <Badge variant="outline" className="ms-1 h-4 text-[10px] px-1">{filteredDups.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="integrity" className="rounded-xl gap-1.5 py-2 text-xs">
            <Database className="w-3.5 h-3.5" />
            {isRTL ? 'سلامة الهوية' : 'Integrity'}
            <Badge variant="outline" className="ms-1 h-4 text-[10px] px-1">{filteredInteg.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="duplicates" className="mt-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : filteredDups.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={isRTL ? 'لا يوجد تكرار' : 'No duplicates'}
              hint={isRTL ? 'جميع بيانات الدخول فريدة عبر القاعدة.' : 'All login identifiers are unique across the database.'}
            />
          ) : (
            <div className="space-y-2">
              {filteredDups.map((d, i) => <DuplicateCard key={`${d.kind}-${d.value}-${i}`} row={d} isRTL={isRTL} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="integrity" className="mt-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : filteredInteg.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={isRTL ? 'لا توجد مشاكل سلامة' : 'No integrity issues'}
              hint={isRTL ? 'كل حساب لديه ملف شخصي وبريد متطابق.' : 'Every account has a matching profile and email.'}
            />
          ) : (
            <div className="space-y-2">
              {filteredInteg.map(r => (
                <IntegrityCard
                  key={r.user_id}
                  row={r}
                  isRTL={isRTL}
                  onSyncEmail={() => syncEmail.mutate(r.user_id)}
                  syncing={syncEmail.isPending && syncEmail.variables === r.user_id}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ─── Sub-components ─── */

const KpiPill: React.FC<{ icon: React.ElementType; label: string; value: number; tone: string }> = ({
  icon: Icon, label, value, tone,
}) => {
  const toneCls = {
    primary:     'text-primary bg-primary/10 border-primary/20',
    destructive: 'text-destructive bg-destructive/10 border-destructive/30',
    warning:     'text-warning bg-warning/10 border-warning/30',
    info:        'text-info bg-info/10 border-info/30',
    success:     'text-success bg-success/10 border-success/30',
  }[tone] ?? 'text-foreground bg-muted border-border/30';
  return (
    <div className={`flex items-center gap-2 rounded-xl border p-2.5 ${toneCls}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none tech-content">{value}</p>
        <p className="text-[10px] opacity-80 truncate mt-0.5">{label}</p>
      </div>
    </div>
  );
};

const DuplicateCard: React.FC<{ row: IdentityDuplicateRow; isRTL: boolean }> = ({ row, isRTL }) => {
  const meta = KIND_META[row.kind];
  const Icon = meta.icon;
  const details = row.details ?? {};
  return (
    <div className="rounded-2xl border border-border/30 bg-card p-3 hover-lift">
      <div className="flex items-start gap-3 flex-wrap">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${meta.tone}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${meta.tone}`}>
              {isRTL ? meta.ar : meta.en}
            </Badge>
            <span className="text-sm font-semibold tech-content break-all">{row.value || '—'}</span>
            <Badge variant="secondary" className="text-[10px]">
              {row.occurrences} {isRTL ? 'حساب' : 'accounts'}
            </Badge>
          </div>

          {row.kind === 'auth_profile_email_mismatch' && (
            <div className="text-[11px] text-muted-foreground mt-1 grid gap-0.5">
              <span><strong>{isRTL ? 'بريد الدخول' : 'Login'}:</strong> <span className="tech-content">{String(details.auth_email ?? '—')}</span></span>
              <span><strong>{isRTL ? 'بريد الملف' : 'Profile'}:</strong> <span className="tech-content">{String(details.profile_email ?? '—')}</span></span>
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {row.user_ids.slice(0, 4).map(uid => (
              <Link
                key={uid}
                to={`/admin/users?focus=${uid}`}
                className="inline-flex items-center gap-1 text-[10px] rounded-md bg-muted/40 hover:bg-accent/10 hover:text-accent px-2 py-0.5 transition-colors tech-content"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                {uid.slice(0, 8)}…
              </Link>
            ))}
            {row.user_ids.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{row.user_ids.length - 4}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MISMATCH_TONE: Record<string, string> = {
  email_mismatch:         'bg-info/10 text-info border-info/30',
  profile_missing_email:  'bg-warning/10 text-warning border-warning/30',
  no_email:               'bg-destructive/10 text-destructive border-destructive/30',
};

const IntegrityCard: React.FC<{
  row: IdentityIntegrityRow;
  isRTL: boolean;
  onSyncEmail: () => void;
  syncing: boolean;
}> = ({ row, isRTL, onSyncEmail, syncing }) => {
  const tone = MISMATCH_TONE[row.mismatch_type] ?? 'bg-muted text-foreground border-border/30';
  const labelMap: Record<string, { ar: string; en: string }> = {
    email_mismatch:         { ar: 'تعارض البريد', en: 'Email mismatch' },
    profile_missing_email:  { ar: 'ملف بلا بريد', en: 'Profile missing email' },
    no_email:               { ar: 'لا يوجد بريد', en: 'No email' },
    ok:                     { ar: 'سليم', en: 'OK' },
  };
  const lbl = labelMap[row.mismatch_type] ?? { ar: row.mismatch_type, en: row.mismatch_type };
  return (
    <div className="rounded-2xl border border-border/30 bg-card p-3 hover-lift">
      <div className="flex items-start gap-3 flex-wrap">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${tone}`}>
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${tone}`}>{isRTL ? lbl.ar : lbl.en}</Badge>
            <span className="text-sm font-semibold tech-content break-all">{row.masked_email || '—'}</span>
            {row.has_business && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'منشأة' : 'has biz'}</Badge>}
            {row.has_role && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'دور' : 'role'}</Badge>}
            {row.synthetic_or_test && <Badge variant="outline" className="text-[10px] border-dashed text-muted-foreground">{isRTL ? 'تجريبي' : 'synthetic'}</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 tech-content">
            <span className="opacity-70">user_id:</span> {row.user_id}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button asChild size="sm" variant="ghost" className="h-8 text-xs rounded-lg">
            <Link to={`/admin/users?focus=${row.user_id}`}>
              <ExternalLink className="w-3 h-3 me-1" />
              {isRTL ? 'فتح' : 'Open'}
            </Link>
          </Button>
          {row.recommended_action === 'sync_profile_email_from_auth' && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs rounded-lg gap-1.5"
              onClick={onSyncEmail}
              disabled={syncing}
            >
              <Wand2 className={`w-3 h-3 ${syncing ? 'animate-pulse' : ''}`} />
              {isRTL ? 'مزامنة البريد' : 'Sync email'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ icon: React.ElementType; title: string; hint: string }> = ({ icon: Icon, title, hint }) => (
  <div className="rounded-2xl border border-dashed border-border/40 bg-muted/10 p-10 text-center">
    <Icon className="w-8 h-8 text-success mx-auto mb-3" />
    <p className="text-sm font-semibold">{title}</p>
    <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
  </div>
);

export default IdentityIntegrityPanel;