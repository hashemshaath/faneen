import {
  Activity,
  ShieldCheck,
  Bell,
  Clock,
  CheckCircle2,
  ScrollText,
  Mail,
  ListChecks,
  Terminal,
  Boxes,
  Wrench,
  LayoutDashboard,
} from 'lucide-react';
import { TabbedShell } from '@/components/dashboard/TabbedShell';

/**
 * ADMIN UX RECONSOLIDATION PHASE 3 — Operations Center consolidation.
 *
 * Thin presentational shell. Each tab lazy-loads an existing admin page
 * that already owns its queries, mutations, CSV exports and privacy
 * masking. NO logic, queries, mutations or service calls are moved or
 * altered in this shell. The trailing `console` / `rentals` / `assets`
 * tabs are preserved to keep legacy `?tab=` deep links functional.
 */
const AdminOperationsHub = () => (
  <TabbedShell
    icon={Activity}
    title={{ ar: 'مركز العمليات', en: 'Operations Center' }}
    description={{
      ar: 'العمليات اليومية، SLA، التنبيهات، الجدولة، السجلات، البريد، والقوائم — في مكان واحد.',
      en: 'Daily operations, SLA, notifications, cron, logs, email, and queues — unified.',
    }}
    noIndex
    tabs={[
      { key: 'overview',      label: { ar: 'نظرة عامة',     en: 'Overview' },      icon: LayoutDashboard, loader: () => import('@/components/admin/centers/operations/OperationsOverviewLanding') },
      { key: 'sla',           label: { ar: 'SLA',           en: 'SLA' },           icon: ShieldCheck,     loader: () => import('./AdminOperations') },
      { key: 'approvals',     label: { ar: 'الموافقات',     en: 'Approvals' },     icon: CheckCircle2,    loader: () => import('./AdminApprovalsCenter') },
      { key: 'notifications', label: { ar: 'التنبيهات',     en: 'Notifications' }, icon: Bell,            loader: () => import('./AdminContactNotificationLog') },
      { key: 'cron',          label: { ar: 'الجدولة',       en: 'Cron & Jobs' },   icon: Clock,           loader: () => import('./AdminCronRuns') },
      { key: 'logs',          label: { ar: 'السجلات',       en: 'Logs' },          icon: ScrollText,      loader: () => import('@/components/admin/centers/operations/OperationsLogsLanding') },
      { key: 'email',         label: { ar: 'البريد',        en: 'Email Health' },  icon: Mail,            loader: () => import('./AdminEmailHub') },
      { key: 'queues',        label: { ar: 'القوائم',       en: 'Queues' },        icon: ListChecks,      loader: () => import('./AdminProviderGrowthQueue') },
      { key: 'console',       label: { ar: 'وحدة التحكم',   en: 'Console' },       icon: Terminal,        loader: () => import('./AdminOperationsConsole') },
      { key: 'rentals',       label: { ar: 'التأجير',       en: 'Rentals' },       icon: Boxes,           loader: () => import('./AdminOperationsRentals') },
      { key: 'assets',        label: { ar: 'الأصول',        en: 'Assets' },        icon: Wrench,          loader: () => import('./AdminOperationsAssets') },
    ]}
  />
);

export default AdminOperationsHub;