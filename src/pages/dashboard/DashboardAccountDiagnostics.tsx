import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { getOwnerBusiness, getActiveBusinessStaffMembership } from '@/modules/businesses';
import { getUserRoles, getCurrentSession } from '@/modules/identity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BUILD_ID, BUILD_TIME } from '@/lib/buildVersion';
import { Activity, RefreshCw, ShieldCheck, Wrench, User as UserIcon, Clock, Hash, Download, Copy, Check, ShieldAlert, X, Database } from 'lucide-react';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';

const Row = ({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }) => (
  <div className="grid grid-cols-[160px_1fr] gap-2 py-1.5 border-b border-border/30 last:border-0">
    <dt className="text-xs text-muted-foreground">{k}</dt>
    <dd className={`text-xs ${mono ? 'tech-content font-mono break-all' : ''}`}>{v}</dd>
  </div>
);

const Bool = ({ v }: { v: boolean }) => (
  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${v ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>{String(v)}</span>
);

type CheckProbe = {
  rolesRows: string[];
  rolesError: string | null;
  ownsBusiness: boolean;
  businessId: string | null;
  businessError: string | null;
  staffActive: boolean;
  staffId: string | null;
  staffError: string | null;
};

const CheckRow = ({
  label, ok, source, reason, rtl,
}: { label: string; ok: boolean; source: string; reason: string; rtl: boolean }) => (
  <div className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className={`w-5 h-5 rounded-md flex items-center justify-center ${ok ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
          {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
        </span>
        <span className="text-xs font-semibold font-mono">{label}</span>
      </div>
      <Badge variant="outline" className={`text-[10px] ${ok ? 'border-success/40 text-success' : 'border-border text-muted-foreground'}`}>
        {ok ? (rtl ? 'مسموح' : 'granted') : (rtl ? 'مرفوض' : 'denied')}
      </Badge>
    </div>
    <div className="grid grid-cols-[70px_1fr] gap-x-2 gap-y-1 text-[11px]">
      <span className="text-muted-foreground">{rtl ? 'المصدر' : 'source'}</span>
      <span className="font-mono inline-flex items-center gap-1 break-all"><Database className="w-3 h-3 text-muted-foreground shrink-0" />{source}</span>
      <span className="text-muted-foreground">{rtl ? 'السبب' : 'reason'}</span>
      <span className="text-foreground/80">{reason}</span>
    </div>
  </div>
);

const DashboardAccountDiagnostics: React.FC = () => {
  useNoIndex();
  const { isRTL: rtl } = useLanguage();
  const { user, profile, roles, isAdmin, isProvider, isSuperAdmin } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState({ permissions: true, session: true, build: true });
  const [refreshing, setRefreshing] = useState(false);
  const [probe, setProbe] = useState<CheckProbe | null>(null);
  const [searchParams] = useSearchParams();

  // Inbound denial context forwarded from /forbidden
  const denial = {
    from: searchParams.get('from'),
    requiredRole: searchParams.get('requiredRole'),
    roles: (searchParams.get('roles') || '').split(',').map(r => r.trim()).filter(Boolean),
    userId: searchParams.get('user_id'),
    accountType: searchParams.get('accountType'),
  };
  const hasDenial = !!(denial.from || denial.requiredRole || denial.userId);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLoading({ permissions: true, session: true, build: true });
    // Stage 1: permissions — run live source-of-truth probes
    if (user?.id) {
      const [rolesRes, bizRes, staffRes] = await Promise.allSettled([
        getUserRoles(user.id),
        getOwnerBusiness<{ id: string }>({ userId: user.id, select: 'id', limit: 1 }),
        getActiveBusinessStaffMembership<{ id: string }>({ userId: user.id, select: 'id' }),
      ]);
      const rolesRows = rolesRes.status === 'fulfilled' ? rolesRes.value : [];
      const rolesErr = rolesRes.status === 'fulfilled' ? null : (rolesRes.reason instanceof Error ? rolesRes.reason.message : 'failed');
      const bizData = bizRes.status === 'fulfilled' ? bizRes.value.data : null;
      const bizErr = bizRes.status === 'fulfilled' ? (bizRes.value.error as { message?: string } | null)?.message ?? null : (bizRes.reason instanceof Error ? bizRes.reason.message : 'failed');
      const staffData = staffRes.status === 'fulfilled' ? staffRes.value.data : null;
      const staffErr = staffRes.status === 'fulfilled' ? (staffRes.value.error as { message?: string } | null)?.message ?? null : (staffRes.reason instanceof Error ? staffRes.reason.message : 'failed');
      setProbe({
        rolesRows: rolesRows.map((r) => r as string),
        rolesError: rolesErr,
        ownsBusiness: !!bizData?.id,
        businessId: bizData?.id ?? null,
        businessError: bizErr,
        staffActive: !!staffData?.id,
        staffId: staffData?.id ?? null,
        staffError: staffErr,
      });
    } else {
      setProbe(null);
    }
    setLoading(s => ({ ...s, permissions: false }));
    // Stage 2: session (network)
    const { data } = await getCurrentSession();
    setSession(data.session ?? null);
    setLoading(s => ({ ...s, session: false }));
    // Stage 3: build identity
    await new Promise(r => setTimeout(r, 200));
    setLoading(s => ({ ...s, build: false }));
    setRefreshedAt(new Date());
    setRefreshing(false);
  }, [user?.id]);

  // Auto-trigger refresh on mount
  useEffect(() => { refresh(); }, [refresh]);

  const buildReport = useCallback(() => ({
    generated_at: new Date().toISOString(),
    refreshed_at: refreshedAt.toISOString(),
    build: {
      id: BUILD_ID,
      time: BUILD_TIME,
      origin: typeof window !== 'undefined' ? window.location.origin : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    },
    permissions: {
      account_type: profile?.account_type ?? null,
      isAdmin,
      isProvider,
      isSuperAdmin,
      roles,
      is_onboarded: !!profile?.is_onboarded,
    },
    session: {
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      last_sign_in_at: user?.last_sign_in_at ?? null,
      expires_at: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      provider: user?.app_metadata?.provider ?? null,
    },
  }), [refreshedAt, profile, isAdmin, isProvider, isSuperAdmin, roles, user, session]);

  const exportJson = () => {
    const report = buildReport();
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `qitaat-diagnostics-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(rtl ? 'تم تصدير ملف التشخيص' : 'Diagnostics file exported');
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildReport(), null, 2));
      setCopied(true);
      toast.success(rtl ? 'تم النسخ' : 'Copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(rtl ? 'تعذّر النسخ' : 'Copy failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {hasDenial && (
          <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <ShieldAlert className="w-4 h-4" />
                {rtl ? 'سياق الرفض القادم من صفحة الحماية' : 'Denial context (from Forbidden page)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                {denial.from && <Row k={rtl ? 'المسار' : 'Path'} v={denial.from} mono />}
                {denial.requiredRole && (
                  <Row k={rtl ? 'الدور المطلوب' : 'Required role'} v={
                    <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">{denial.requiredRole}</Badge>
                  } />
                )}
                {denial.roles.length > 0 && (
                  <Row k={rtl ? 'الأدوار وقت الرفض' : 'Roles at denial'} v={
                    <div className="flex flex-wrap gap-1">
                      {denial.roles.map(r => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                    </div>
                  } />
                )}
                {denial.accountType && <Row k="account_type" v={<span className="font-mono">{denial.accountType}</span>} />}
                {denial.userId && <Row k="user_id" v={denial.userId} mono />}
              </dl>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">{rtl ? 'تشخيص الحساب' : 'Account Diagnostics'}</h1>
              <p className="text-xs text-muted-foreground">{rtl ? 'حالة الصلاحيات والجلسة وإصدار البناء' : 'Roles, session, and build identity'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={copyJson}>
              {copied ? <Check className="w-3.5 h-3.5 me-1.5" /> : <Copy className="w-3.5 h-3.5 me-1.5" />}
              {copied ? (rtl ? 'تم النسخ' : 'Copied') : (rtl ? 'نسخ JSON' : 'Copy JSON')}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={exportJson}>
              <Download className="w-3.5 h-3.5 me-1.5" />{rtl ? 'تصدير' : 'Export'}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={`w-3.5 h-3.5 me-1.5 ${refreshing ? 'animate-spin' : ''}`} />{rtl ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Roles */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />{rtl ? 'الصلاحيات' : 'Permissions'}</CardTitle></CardHeader>
            <CardContent>
              {loading.permissions ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[160px_1fr] gap-2 py-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-full max-w-[200px]" />
                    </div>
                  ))}
                </div>
              ) : (
              <dl>
                <Row k="account_type" v={<span className="font-mono">{profile?.account_type ?? '—'}</span>} />
                <Row k="isAdmin" v={<Bool v={isAdmin} />} />
                <Row k="isProvider" v={<Bool v={isProvider} />} />
                <Row k="isSuperAdmin" v={<Bool v={isSuperAdmin} />} />
                <Row k={rtl ? 'الأدوار' : 'roles[]'} v={
                  <div className="flex flex-wrap gap-1">
                    {roles.length === 0 ? <span className="text-muted-foreground italic">{rtl ? 'لا يوجد' : 'none'}</span>
                      : roles.map(r => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                  </div>
                } />
                <Row k="is_onboarded" v={<Bool v={!!profile?.is_onboarded} />} />
              </dl>
              )}
              {!loading.permissions && (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {rtl ? 'تفصيل الفحوص' : 'Check breakdown'}
                  </p>
                  {(() => {
                    const accountType = profile?.account_type ?? null;
                    const providerByAccountType = ['business', 'company', 'provider'].includes(accountType ?? '');
                    const checks = [
                      {
                        label: 'isSuperAdmin',
                        ok: isSuperAdmin,
                        source: 'public.user_roles',
                        reason: probe?.rolesError
                          ? (rtl ? `خطأ: ${probe.rolesError}` : `error: ${probe.rolesError}`)
                          : isSuperAdmin
                            ? (rtl ? "صف بدور 'super_admin' موجود" : "row with role='super_admin' present")
                            : (rtl ? "لا يوجد صف بدور 'super_admin'" : "no row with role='super_admin'"),
                      },
                      {
                        label: 'isAdmin',
                        ok: isAdmin,
                        source: 'public.user_roles',
                        reason: isSuperAdmin
                          ? (rtl ? 'موروث من super_admin' : 'inherited from super_admin')
                          : isAdmin
                            ? (rtl ? "صف بدور 'admin' موجود" : "row with role='admin' present")
                            : (rtl ? 'لا يوجد دور admin/super_admin' : 'no admin/super_admin role'),
                      },
                      {
                        label: 'isProvider',
                        ok: isProvider,
                        source: 'businesses ∪ business_staff ∪ profiles.account_type',
                        reason: (() => {
                          const parts: string[] = [];
                          if (probe?.ownsBusiness) parts.push(rtl ? `يملك منشأة (${probe.businessId?.slice(0,8)}…)` : `owns business (${probe.businessId?.slice(0,8)}…)`);
                          if (probe?.staffActive) parts.push(rtl ? 'موظف نشط في business_staff' : 'active row in business_staff');
                          if (providerByAccountType) parts.push(`account_type='${accountType}'`);
                          if (parts.length === 0) return rtl ? 'لا منشأة مملوكة، لا عضوية فريق نشطة، account_type ليس مزوّدًا' : 'no owned business, no active staff row, account_type is not provider-like';
                          return parts.join(' · ');
                        })(),
                      },
                      {
                        label: 'account_type',
                        ok: !!accountType,
                        source: 'public.profiles.account_type',
                        reason: accountType
                          ? (rtl ? `القيمة الحالية: ${accountType}` : `current value: ${accountType}`)
                          : (rtl ? 'لم يُحدَّد account_type' : 'account_type not set'),
                      },
                      {
                        label: 'is_onboarded',
                        ok: !!profile?.is_onboarded,
                        source: 'public.profiles.is_onboarded',
                        reason: profile?.is_onboarded
                          ? (rtl ? 'أكمل المستخدم التهيئة' : 'onboarding completed')
                          : (rtl ? 'لم يكتمل معالج التهيئة' : 'onboarding wizard not completed'),
                      },
                    ];
                    return checks.map(c => <CheckRow key={c.label} {...c} rtl={rtl} />);
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><UserIcon className="w-4 h-4 text-primary" />{rtl ? 'الجلسة' : 'Session'}</CardTitle></CardHeader>
            <CardContent>
              {loading.session ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[160px_1fr] gap-2 py-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-full max-w-[240px]" />
                    </div>
                  ))}
                </div>
              ) : (
              <dl>
                <Row k="user.id" v={user?.id ?? '—'} mono />
                <Row k="user.email" v={user?.email ?? '—'} mono />
                <Row k="last_sign_in_at" v={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString(rtl ? 'ar-SA' : 'en-US') : '—'} />
                <Row k="expires_at" v={session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString(rtl ? 'ar-SA' : 'en-US') : '—'} />
                <Row k={rtl ? 'محدّث في' : 'Refreshed at'} v={refreshedAt.toLocaleTimeString(rtl ? 'ar-SA' : 'en-US')} />
              </dl>
              )}
            </CardContent>
          </Card>

          {/* Build */}
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" />{rtl ? 'إصدار البناء' : 'Build identity'}</CardTitle></CardHeader>
            <CardContent>
              {loading.build ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[160px_1fr] gap-2 py-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-full max-w-[280px]" />
                    </div>
                  ))}
                </div>
              ) : (
              <dl>
                <Row k="BUILD_ID" v={<span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" /><span className="font-mono">{BUILD_ID}</span></span>} />
                <Row k="BUILD_TIME" v={<span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{BUILD_TIME}</span>} />
                <Row k={rtl ? 'الرابط' : 'origin'} v={typeof window !== 'undefined' ? window.location.origin : '—'} mono />
                <Row k={rtl ? 'وكيل المتصفح' : 'user-agent'} v={typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : '—'} mono />
              </dl>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardAccountDiagnostics;