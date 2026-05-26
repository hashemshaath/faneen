import { useQuery } from '@tanstack/react-query';
import { listRecentMembershipSubscriptionEvents } from '@/modules/memberships';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNoIndex } from '@/hooks/useNoIndex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History } from 'lucide-react';
import { MembershipLifecycleJobsPanel } from '@/components/admin/MembershipLifecycleJobsPanel';
import { Link } from 'react-router-dom';

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

  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
  const subIds = Array.from(new Set(rows.map((r) => r.subscription_id).filter(Boolean)));

  const { data: userRefs = {} } = useQuery({
    queryKey: ['admin-msub-events-user-refs', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, ref_id').in('user_id', userIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p) => { if (p.ref_id) map[p.user_id] = p.ref_id; });
      return map;
    },
  });

  const { data: subRefs = {} } = useQuery({
    queryKey: ['admin-msub-events-sub-refs', subIds],
    enabled: subIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('membership_subscriptions').select('id, ref_id').in('id', subIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach((s) => { if (s.ref_id) map[s.id] = s.ref_id; });
      return map;
    },
  });

  return (
    <div className="container px-4 py-6 max-w-6xl space-y-6">
      <MembershipLifecycleJobsPanel />
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
                    <TableCell className="tech-content text-[11px] font-mono">
                      {userRefs[r.user_id] ? (
                        <Link to={`/admin/users/${r.user_id}`} className="text-accent hover:underline">{userRefs[r.user_id]}</Link>
                      ) : (
                        <span className="text-muted-foreground">{r.user_id.slice(0, 8)}…</span>
                      )}
                    </TableCell>
                    <TableCell className="tech-content text-[11px] font-mono">
                      {subRefs[r.subscription_id] || <span className="text-muted-foreground">{r.subscription_id.slice(0, 8)}…</span>}
                    </TableCell>
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
