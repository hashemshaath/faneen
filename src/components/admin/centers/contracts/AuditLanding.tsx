import { Link } from 'react-router-dom';
import { ClipboardList, FileBarChart, Activity, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

const AuditLanding = () => {
  const { isRTL } = useLanguage();
  const items = [
    { key: 'audit-log', to: '/admin/audit-log', icon: ClipboardList, title: { ar: 'سجل التدقيق الموحّد', en: 'Unified Audit Log' }, desc: { ar: 'إداري، منشآت، أمني، وتعديلات العقود.', en: 'Admin, business, security, and contract amendments.' } },
    { key: 'pdf-audit', to: '/admin/contracts?tab=exports', icon: FileBarChart, title: { ar: 'تدقيق تصدير PDF', en: 'PDF Export Audit' }, desc: { ar: 'كل عمليات تصدير PDF للعقود.', en: 'All contract PDF export events.' } },
    { key: 'activity', to: '/admin/activity-log', icon: Activity, title: { ar: 'سجل النشاط الإداري', en: 'Admin Activity Log' }, desc: { ar: 'العمليات الإدارية بشكل عام.', en: 'General admin activity stream.' } },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => {
        const Icon = t.icon;
        return (
          <Link key={t.key} to={t.to} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div>
                <CardTitle className="flex flex-1 items-center justify-between gap-2 text-base">
                  <span className="truncate">{isRTL ? t.title.ar : t.title.en}</span>
                  <ArrowRight className={`size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">{isRTL ? t.desc.ar : t.desc.en}</CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

export default AuditLanding;