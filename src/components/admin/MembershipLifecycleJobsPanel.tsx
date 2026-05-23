/**
 * R4F-7: Membership Lifecycle Jobs observability panel.
 * Admin-only. Read-only. Surfaces:
 *   - pg_cron status for the 4 membership-related jobs
 *   - latest membership lifecycle email markers (deduped by message_id)
 *
 * Data sources are exposed via SECURITY DEFINER admin RPCs:
 *   - admin_get_membership_lifecycle_jobs
 *   - admin_get_membership_lifecycle_email_markers
 *
 * Recipient emails are masked in the UI. No secrets are read or rendered.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Activity, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { maskEmail } from '@/lib/masking';

export const MEMBERSHIP_LIFECYCLE_TEMPLATES = [
  'membership-subscription-expired',
  'membership-renewal-failed',
  'membership-renewal-reminder',
  'membership-promo-redeemed',
  'membership-subscription-activated',
  'membership-tier-changed-by-admin',
  'membership-cancelled-immediately',
  'membership-subscription-cancelled',
] as const;

interface JobRow {
  jobname: string;
  schedule: string;
  active: boolean;
  last_run_started: string | null;
  last_run_end: string | null;
  last_run_status: string | null;
  last_run_return_message: string | null;
  recent_failures_count: number;
  total_runs_7d: number;
}

interface MarkerRow {
  id: string;
  template_name: string;
  recipient_email: string | null;
  status: string;
  created_at: string;
  dispatch_key: string | null;
  message_id: string | null;
}

function statusTone(status: string | null): string {
  switch ((status || '').toLowerCase()) {
    case 'succeeded':
    case 'sent':
      return 'bg-success/10 text-success border-success/30';
    case 'failed':
    case 'dlq':
    case 'bounced':
    case 'complained':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'running':
    case 'pending':
      return 'bg-info/10 text-info border-info/30';
    case 'suppressed':
      return 'bg-warning/10 text-warning border-warning/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export const MembershipLifecycleJobsPanel = () => {
  const { isRTL } = useLanguage();

  const jobsQuery = useQuery({
    queryKey: ['admin-membership-lifecycle-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_membership_lifecycle_jobs');
      if (error) throw error;
      return (data ?? []) as unknown as JobRow[];
    },
    refetchInterval: 60_000,
  });

  const markersQuery = useQuery({
    queryKey: ['admin-membership-lifecycle-email-markers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'admin_get_membership_lifecycle_email_markers',
        { p_limit: 100 },
      );
      if (error) throw error;
      return (data ?? []) as unknown as MarkerRow[];
    },
    refetchInterval: 60_000,
  });

  const jobs = jobsQuery.data ?? [];
  const markers = markersQuery.data ?? [];

  const sentCount = markers.filter(m => m.status === 'sent').length;
  const failedCount = markers.filter(m =>
    ['failed', 'dlq', 'bounced', 'complained'].includes(m.status),
  ).length;

  return (
    <div className="space-y-4">
      {/* ── Cron jobs card ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5" />
            {isRTL
              ? 'مهام دورة حياة العضويات (Cron)'
              : 'Membership lifecycle jobs (cron)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobsQuery.isLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isRTL ? 'لا توجد مهام مجدولة' : 'No scheduled jobs found'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? 'المهمة' : 'Job'}</TableHead>
                  <TableHead>{isRTL ? 'الجدول' : 'Schedule'}</TableHead>
                  <TableHead>{isRTL ? 'نشطة' : 'Active'}</TableHead>
                  <TableHead>{isRTL ? 'آخر تشغيل' : 'Last run'}</TableHead>
                  <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isRTL ? 'فشل (7 أيام)' : 'Failures (7d)'}</TableHead>
                  <TableHead>{isRTL ? 'إجمالي (7 أيام)' : 'Total (7d)'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.jobname}>
                    <TableCell className="tech-content text-xs font-mono">{j.jobname}</TableCell>
                    <TableCell className="tech-content text-xs font-mono">{j.schedule}</TableCell>
                    <TableCell>
                      {j.active ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      )}
                    </TableCell>
                    <TableCell className="tech-content text-xs">
                      {j.last_run_started
                        ? new Date(j.last_run_started).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {j.last_run_status ? (
                        <Badge variant="outline" className={statusTone(j.last_run_status)}>
                          {j.last_run_status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {isRTL ? 'لم تشتغل بعد' : 'not yet run'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="tech-content text-xs">
                      <span
                        className={
                          j.recent_failures_count > 0 ? 'text-destructive font-semibold' : ''
                        }
                      >
                        {j.recent_failures_count}
                      </span>
                    </TableCell>
                    <TableCell className="tech-content text-xs">{j.total_runs_7d}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Email markers card ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-lg">
            <span className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {isRTL
                ? 'سجل بريد دورة حياة العضويات'
                : 'Membership lifecycle email markers'}
            </span>
            <span className="flex items-center gap-2 text-xs font-normal">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                {isRTL ? `مُرسل: ${sentCount}` : `sent: ${sentCount}`}
              </Badge>
              <Badge
                variant="outline"
                className="bg-destructive/10 text-destructive border-destructive/30"
              >
                {isRTL ? `فشل: ${failedCount}` : `failed: ${failedCount}`}
              </Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {markersQuery.isLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : markers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {isRTL
                ? 'لا توجد رسائل دورة حياة بعد — سيظهر السجل بعد أول إرسال.'
                : 'No lifecycle emails yet — markers appear after the first send.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{isRTL ? 'القالب' : 'Template'}</TableHead>
                  <TableHead>{isRTL ? 'المستلم' : 'Recipient'}</TableHead>
                  <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isRTL ? 'مفتاح الإرسال' : 'Dispatch key'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {markers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="tech-content text-xs">
                      {new Date(m.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="tech-content text-xs font-mono">{m.template_name}</TableCell>
                    <TableCell className="tech-content text-xs font-mono">
                      {maskEmail(m.recipient_email)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusTone(m.status)}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="tech-content text-[10px] font-mono text-muted-foreground">
                      {m.dispatch_key || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipLifecycleJobsPanel;