import { useQuery } from '@tanstack/react-query';
import { listRecentMembershipSubscriptionEvents } from '@/modules/memberships';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History } from 'lucide-react';

interface EventRow {
  id: string;
  subscription_id: string;
  user_id: string;
  business_id: string | null;
  action: string;
  actor_user_id: string | null;
  from_tier: string | null;
  to_tier: string | null;
  to_plan_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTION_TONE: Record<string, string> = {
  cancel_at_period_end: 'bg-destructive/10 text-destructive border-destructive/30',
  resume_renewal: 'bg-success/10 text-success border-success/30',
  downgrade_target_changed: 'bg-info/10 text-info border-info/30',
  expired_downgraded: 'bg-warning/10 text-warning border-warning/30',
};

const AdminMembershipEvents = () => {
  const { isRTL } = useLanguage();
  usePageMeta({ title: isRTL ? 'سجل أحداث الاشتراكات' : 'Subscription Events Log' });
  useNoIndex();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-msub-events'],
    queryFn: async () => {
      const { data, error } = await listRecentMembershipSubscriptionEvents<EventRow>({ limit: 500 });
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });

  return (
    <div className="container px-4 py-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5" />
            {isRTL ? 'سجل أحداث الاشتراكات (إلغاء/استئناف/انتهاء)' : 'Subscription events (cancel/resume/expiry)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{isRTL ? 'الإجراء' : 'Action'}</TableHead>
                  <TableHead>{isRTL ? 'من' : 'From'}</TableHead>
                  <TableHead>{isRTL ? 'إلى' : 'To'}</TableHead>
                  <TableHead>{isRTL ? 'المستخدم' : 'User'}</TableHead>
                  <TableHead>{isRTL ? 'الاشتراك' : 'Subscription'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tech-content text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ACTION_TONE[r.action] || ''}>{r.action}</Badge>
                    </TableCell>
                    <TableCell className="tech-content text-xs">{r.from_tier || '—'}</TableCell>
                    <TableCell className="tech-content text-xs">{r.to_tier || '—'}</TableCell>
                    <TableCell className="tech-content text-[10px] font-mono">{r.user_id.slice(0, 8)}…</TableCell>
                    <TableCell className="tech-content text-[10px] font-mono">{r.subscription_id.slice(0, 8)}…</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">{isRTL ? 'لا توجد أحداث' : 'No events'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMembershipEvents;
