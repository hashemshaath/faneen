import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';

const ApprovalsLanding = () => {
  const { isRTL } = useLanguage();
  const items = [
    { key: 'center', to: '/admin/approvals', icon: ShieldCheck, title: { ar: 'مركز الموافقات', en: 'Approvals Center' }, desc: { ar: 'كل الموافقات الإدارية الموحّدة.', en: 'Unified admin approvals queue.' } },
    { key: 'contracts', to: '/admin/contracts?tab=contracts', icon: FileText, title: { ar: 'موافقات العقود', en: 'Contract Approvals' }, desc: { ar: 'الموافقات المرتبطة بسير العقد تُدار من صفحة العقد.', en: 'Contract-level approvals are handled inside each contract.' } },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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

export default ApprovalsLanding;