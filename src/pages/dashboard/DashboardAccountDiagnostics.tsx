import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BUILD_ID, BUILD_TIME } from '@/lib/buildVersion';
import { Activity, RefreshCw, ShieldCheck, Wrench, User as UserIcon, Clock, Hash, Download, Copy, Check } from 'lucide-react';
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

const DashboardAccountDiagnostics: React.FC = () => {
  useNoIndex();
  const { isRTL: rtl } = useLanguage();
  const { user, profile, roles, isAdmin, isProvider, isSuperAdmin } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session ?? null);
    setRefreshedAt(new Date());
  }, []);

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
            <Button variant="outline" size="sm" className="rounded-xl" onClick={refresh}>
              <RefreshCw className="w-3.5 h-3.5 me-1.5" />{rtl ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Roles */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />{rtl ? 'الصلاحيات' : 'Permissions'}</CardTitle></CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Session */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><UserIcon className="w-4 h-4 text-primary" />{rtl ? 'الجلسة' : 'Session'}</CardTitle></CardHeader>
            <CardContent>
              <dl>
                <Row k="user.id" v={user?.id ?? '—'} mono />
                <Row k="user.email" v={user?.email ?? '—'} mono />
                <Row k="last_sign_in_at" v={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString(rtl ? 'ar-SA' : 'en-US') : '—'} />
                <Row k="expires_at" v={session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString(rtl ? 'ar-SA' : 'en-US') : '—'} />
                <Row k={rtl ? 'محدّث في' : 'Refreshed at'} v={refreshedAt.toLocaleTimeString(rtl ? 'ar-SA' : 'en-US')} />
              </dl>
            </CardContent>
          </Card>

          {/* Build */}
          <Card className="rounded-2xl lg:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" />{rtl ? 'إصدار البناء' : 'Build identity'}</CardTitle></CardHeader>
            <CardContent>
              <dl>
                <Row k="BUILD_ID" v={<span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" /><span className="font-mono">{BUILD_ID}</span></span>} />
                <Row k="BUILD_TIME" v={<span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{BUILD_TIME}</span>} />
                <Row k={rtl ? 'الرابط' : 'origin'} v={typeof window !== 'undefined' ? window.location.origin : '—'} mono />
                <Row k={rtl ? 'وكيل المتصفح' : 'user-agent'} v={typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : '—'} mono />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardAccountDiagnostics;