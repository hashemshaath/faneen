import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Mail } from 'lucide-react';
import { EmailOverviewCards } from '@/components/admin/email-center/EmailOverviewCards';
import { EmailTemplateLibrary } from '@/components/admin/email-center/EmailTemplateLibrary';
import { EmailTemplatePreview } from '@/components/admin/email-center/EmailTemplatePreview';
import { EmailDeliveryLogs } from '@/components/admin/email-center/EmailDeliveryLogs';
import { EmailDlqMonitor } from '@/components/admin/email-center/EmailDlqMonitor';
import { EmailSuppressionCenter } from '@/components/admin/email-center/EmailSuppressionCenter';
import { EmailQueueHealth } from '@/components/admin/email-center/EmailQueueHealth';
import { EmailConfigurationPanel } from '@/components/admin/email-center/EmailConfigurationPanel';
import { EmailReports } from '@/components/admin/email-center/EmailReports';
import { EmailHealthAlerts } from '@/components/admin/email-center/EmailHealthAlerts';
import type { EmailTemplateMeta } from '@/lib/email-center/email-template-catalog';

const AdminEmailCenter: React.FC = () => {
  useNoIndex();
  const { isRTL } = useLanguage();
  const [previewing, setPreviewing] = useState<EmailTemplateMeta | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-7xl mx-auto">
        <header className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
            <Mail className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{isRTL ? 'مركز عمليات البريد' : 'Email Operations Center'}</h1>
            <p className="text-xs text-muted-foreground">{isRTL ? 'مراقبة، معاينة، وإدارة جميع رسائل قِطاعات' : 'Monitor, preview and manage all Qitaat emails'}</p>
          </div>
        </header>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto justify-start gap-1">
            <TabsTrigger value="overview">{isRTL ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
            <TabsTrigger value="alerts">{isRTL ? 'التنبيهات' : 'Alerts'}</TabsTrigger>
            <TabsTrigger value="library">{isRTL ? 'مكتبة القوالب' : 'Templates'}</TabsTrigger>
            <TabsTrigger value="logs">{isRTL ? 'سجل التسليم' : 'Logs'}</TabsTrigger>
            <TabsTrigger value="dlq">DLQ</TabsTrigger>
            <TabsTrigger value="suppression">{isRTL ? 'المنع' : 'Suppression'}</TabsTrigger>
            <TabsTrigger value="queue">{isRTL ? 'الطابور' : 'Queue'}</TabsTrigger>
            <TabsTrigger value="config">{isRTL ? 'الإعدادات' : 'Config'}</TabsTrigger>
            <TabsTrigger value="reports">{isRTL ? 'التقارير' : 'Reports'}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><EmailOverviewCards /></TabsContent>
          <TabsContent value="alerts"><EmailHealthAlerts /></TabsContent>
          <TabsContent value="library" className="space-y-4">
            {previewing && <EmailTemplatePreview template={previewing} onClose={() => setPreviewing(null)} />}
            <EmailTemplateLibrary onPreview={setPreviewing} />
          </TabsContent>
          <TabsContent value="logs"><EmailDeliveryLogs /></TabsContent>
          <TabsContent value="dlq"><EmailDlqMonitor /></TabsContent>
          <TabsContent value="suppression"><EmailSuppressionCenter /></TabsContent>
          <TabsContent value="queue"><EmailQueueHealth /></TabsContent>
          <TabsContent value="config"><EmailConfigurationPanel /></TabsContent>
          <TabsContent value="reports"><EmailReports /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminEmailCenter;