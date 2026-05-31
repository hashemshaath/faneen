import React, { Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { AdminEmbeddedContext } from '@/contexts/AdminTabsContext';
import { lazyRetry } from '@/lib/lazyRetry';
import { Loader2, Inbox, Settings, ShieldAlert, TrendingUp, Mail } from 'lucide-react';

/**
 * Phase B — Admin Contact Center.
 * Consolidates 5 previously scattered admin contact pages into a single
 * tabbed surface. Each tab lazy-loads the original page component, which
 * detects the AdminEmbeddedContext flag and skips its own DashboardLayout
 * wrapper, preserving 100% of existing logic, RLS, and permissions.
 */
const InboxPage          = lazyRetry(() => import('./AdminContactMessages'));
const SettingsPage       = lazyRetry(() => import('./AdminContactInboxSettings'));
const AuditPage          = lazyRetry(() => import('./AdminContactAuditLog'));
const SlaPage            = lazyRetry(() => import('./AdminContactSlaDashboard'));
const NotificationsPage  = lazyRetry(() => import('./AdminContactNotificationLog'));

type TabKey = 'inbox' | 'settings' | 'audit' | 'sla' | 'notifications';
const VALID: TabKey[] = ['inbox', 'settings', 'audit', 'sla', 'notifications'];

const PanelFallback: React.FC = () => (
  <div className="flex items-center justify-center py-16 text-muted-foreground">
    <Loader2 className="size-5 animate-spin" />
  </div>
);

const AdminContactCenter: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabKey = (VALID as string[]).includes(raw ?? '') ? (raw as TabKey) : 'inbox';

  const labels = useMemo(() => ({
    inbox:         { ar: 'الصندوق',    en: 'Inbox',         icon: Inbox },
    settings:      { ar: 'الإعدادات',  en: 'Settings',      icon: Settings },
    audit:         { ar: 'سجل التدقيق', en: 'Audit Log',     icon: ShieldAlert },
    sla:           { ar: 'امتثال SLA', en: 'SLA',           icon: TrendingUp },
    notifications: { ar: 'الإشعارات',  en: 'Notifications', icon: Mail },
  } as const), []);

  const onChange = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'inbox') next.delete('tab'); else next.set('tab', v);
    setParams(next, { replace: true });
  };

  return (
    <DashboardLayout>
      <AdminEmbeddedContext.Provider value={true}>
        <div className="space-y-4 max-w-7xl mx-auto">
          <header className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
              <Inbox className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">{isRTL ? 'مركز التواصل' : 'Contact Center'}</h1>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'صندوق الرسائل، الإعدادات، التدقيق، SLA، والإشعارات في مكان واحد' : 'Inbox, settings, audit, SLA, and notifications — unified'}
              </p>
            </div>
          </header>

          <Tabs value={tab} onValueChange={onChange} className="space-y-4">
            <TabsList className="flex flex-wrap h-auto justify-start gap-1">
              {VALID.map((k) => {
                const L = labels[k];
                const Icon = L.icon;
                return (
                  <TabsTrigger key={k} value={k} className="gap-1.5">
                    <Icon className="size-3.5" />
                    {isRTL ? L.ar : L.en}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="inbox">
              <Suspense fallback={<PanelFallback />}><InboxPage /></Suspense>
            </TabsContent>
            <TabsContent value="settings">
              <Suspense fallback={<PanelFallback />}><SettingsPage /></Suspense>
            </TabsContent>
            <TabsContent value="audit">
              <Suspense fallback={<PanelFallback />}><AuditPage /></Suspense>
            </TabsContent>
            <TabsContent value="sla">
              <Suspense fallback={<PanelFallback />}><SlaPage /></Suspense>
            </TabsContent>
            <TabsContent value="notifications">
              <Suspense fallback={<PanelFallback />}><NotificationsPage /></Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </AdminEmbeddedContext.Provider>
    </DashboardLayout>
  );
};

export default AdminContactCenter;