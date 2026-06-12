import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Mail } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Bi, useBi } from '@/components/common/Bilingual';
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
  const bi = useBi();
  const [previewing, setPreviewing] = useState<EmailTemplateMeta | null>(null);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-7xl">
        <AdminPageHeader
          tone="primary"
          icon={Mail}
          eyebrow={bi('لوحة الإدارة', 'Admin Console')}
          title={bi('مركز عمليات البريد', 'Email Operations Center')}
          subtitle={bi('مراقبة، معاينة، وإدارة جميع رسائل قِطاعات', 'Monitor, preview and manage all Qitaat emails')}
        />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto justify-start gap-1">
            <TabsTrigger value="overview"><Bi ar="نظرة عامة" en="Overview" /></TabsTrigger>
            <TabsTrigger value="alerts"><Bi ar="التنبيهات" en="Alerts" /></TabsTrigger>
            <TabsTrigger value="library"><Bi ar="مكتبة القوالب" en="Templates" /></TabsTrigger>
            <TabsTrigger value="logs"><Bi ar="سجل التسليم" en="Logs" /></TabsTrigger>
            <TabsTrigger value="dlq">DLQ</TabsTrigger>
            <TabsTrigger value="suppression"><Bi ar="المنع" en="Suppression" /></TabsTrigger>
            <TabsTrigger value="queue"><Bi ar="الطابور" en="Queue" /></TabsTrigger>
            <TabsTrigger value="config"><Bi ar="الإعدادات" en="Config" /></TabsTrigger>
            <TabsTrigger value="reports"><Bi ar="التقارير" en="Reports" /></TabsTrigger>
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