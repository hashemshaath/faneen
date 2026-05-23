import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMembershipUpgradeRequests,
  updateMembershipUpgradeRequestById,
  subscribeToPlan,
} from '@/modules/memberships';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { createNotification } from '@/modules/notifications/services/createNotification';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, X, Loader2, Inbox, ArrowUpRight, Clock, AlertTriangle, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

type UpgradeRequest = {
  id: string;
  user_id: string;
  business_id: string;
  current_tier: string | null;
  requested_tier: string;
  requested_plan_id: string | null;
  billing_cycle: string;
  status: string;
  note: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  business?: { name_ar: string | null; name_en: string | null } | null;
  profile?: { full_name: string | null; ref_id: string | null; email: string | null } | null;
};

const statusBadge: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export function AdminUpgradeRequestsPanel({ isRTL }: { isRTL: boolean }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const { data: requests = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-upgrade-requests', filter],
    queryFn: async () => {
      const { data, error } = await listMembershipUpgradeRequests<UpgradeRequest>({
        select: '*, business:businesses(name_ar, name_en), profile:profiles!membership_upgrade_requests_user_id_fkey(full_name, ref_id, email)',
        orderBy: { column: 'created_at', ascending: false },
        limit: 200,
        status: filter === 'pending' ? 'pending' : undefined,
      });
      if (error) {
        // Fallback if FK alias name fails — fetch without profile join.
        const { data: d2, error: e2 } = await listMembershipUpgradeRequests<UpgradeRequest>({
          select: '*, business:businesses(name_ar, name_en)',
          orderBy: { column: 'created_at', ascending: false },
          limit: 200,
        });
        if (e2) throw e2;
        return (d2 ?? []) as unknown as UpgradeRequest[];
      }
      return (data ?? []) as unknown as UpgradeRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (req: UpgradeRequest) => {
      if (!req.requested_plan_id) throw new Error('Missing plan id');
      const { error: rpcErr } = await subscribeToPlan({
        _user_id: req.user_id,
        _plan_id: req.requested_plan_id,
        _business_id: req.business_id,
        _billing_cycle: (req.billing_cycle === 'yearly' ? 'yearly' : 'monthly'),
      });
      if (rpcErr) throw rpcErr;
      const { error: updErr } = await updateMembershipUpgradeRequestById({
        id: req.id,
        values: {
          status: 'approved',
          admin_note: adminNote || null,
          reviewed_at: new Date().toISOString(),
        },
      });
      if (updErr) throw updErr;
      // Best-effort: in-app notification + provider email. Never blocks approval.
      const businessName = req.business?.name_ar || req.business?.name_en || undefined;
      try {
        await createNotification({
          user_id: req.user_id,
          title_ar: 'تمت الموافقة على ترقية باقتك',
          title_en: 'Your upgrade has been approved',
          body_ar: 'تم تفعيل الباقة الجديدة على حسابك.',
          body_en: 'Your new plan is now active on your account.',
          notification_type: 'system',
          reference_type: 'membership_upgrade_approved',
          reference_id: req.id,
          action_url: '/dashboard',
        });
      } catch (err) { console.warn('[AdminUpgrade] notification failed', err); }
      if (req.profile?.email) {
        try {
          await sendTransactionalEmail({
            templateName: 'membership-upgrade-request-approved',
            recipientEmail: req.profile.email,
            idempotencyKey: `membership-upgrade-approved-${req.id}`,
            templateData: {
              recipientName: req.profile.full_name ?? undefined,
              businessName,
              approvedTier: req.requested_tier,
            },
          });
        } catch (err) { console.warn('[AdminUpgrade] approve email failed', err); }
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تمت الموافقة وتفعيل الباقة' : 'Approved and activated');
      setActiveId(null); setAdminNote('');
      qc.invalidateQueries({ queryKey: ['admin-upgrade-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (req: UpgradeRequest) => {
      const { error } = await updateMembershipUpgradeRequestById({
        id: req.id,
        values: {
          status: 'rejected',
          admin_note: adminNote || null,
          reviewed_at: new Date().toISOString(),
        },
      });
      if (error) throw error;
      const businessName = req.business?.name_ar || req.business?.name_en || undefined;
      try {
        await createNotification({
          user_id: req.user_id,
          title_ar: 'تحديث بخصوص طلب ترقية الباقة',
          title_en: 'Update on your upgrade request',
          body_ar: 'لم يتم اعتماد طلب ترقية الباقة حالياً. يمكنك التواصل مع فريق قِطاعات لمزيد من التفاصيل.',
          body_en: 'Your upgrade request was not approved at this time. Please contact the Qitaat team for more details.',
          notification_type: 'system',
          reference_type: 'membership_upgrade_rejected',
          reference_id: req.id,
          action_url: '/membership',
        });
      } catch (err) { console.warn('[AdminUpgrade] notification failed', err); }
      if (req.profile?.email) {
        try {
          await sendTransactionalEmail({
            templateName: 'membership-upgrade-request-rejected',
            recipientEmail: req.profile.email,
            idempotencyKey: `membership-upgrade-rejected-${req.id}`,
            templateData: {
              recipientName: req.profile.full_name ?? undefined,
              businessName,
              requestedTier: req.requested_tier,
            },
          });
        } catch (err) { console.warn('[AdminUpgrade] reject email failed', err); }
      }
    },
    onSuccess: () => {
      toast.success(isRTL ? 'تم رفض الطلب' : 'Request rejected');
      setActiveId(null); setAdminNote('');
      qc.invalidateQueries({ queryKey: ['admin-upgrade-requests'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="py-12 text-center text-xs text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />{isRTL ? 'جاري التحميل…' : 'Loading…'}</div>;
  }

  if (isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-foreground mb-2">{isRTL ? 'تعذّر تحميل طلبات الترقية.' : 'Failed to load upgrade requests.'}</p>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => refetch()}>
              <RefreshCcw className="w-3 h-3" />{isRTL ? 'إعادة المحاولة' : 'Retry'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          <button onClick={() => setFilter('pending')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${filter === 'pending' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
            {isRTL ? 'المعلّقة' : 'Pending'}
          </button>
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${filter === 'all' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
            {isRTL ? 'الكل' : 'All'}
          </button>
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />{isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          <Inbox className="w-6 h-6 mx-auto mb-2 opacity-50" />
          {isRTL ? 'لا توجد طلبات ترقية حالياً.' : 'No upgrade requests.'}
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => {
            const open = activeId === r.id;
            const businessName = isRTL ? (r.business?.name_ar || r.business?.name_en) : (r.business?.name_en || r.business?.name_ar);
            const isPending = r.status === 'pending';
            return (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className={`text-[10px] h-5 ${statusBadge[r.status] || ''}`}>{r.status}</Badge>
                        <span className="text-xs font-medium text-foreground truncate">{businessName || r.business_id.slice(0, 8)}</span>
                        {r.profile?.ref_id && (
                          <span className="text-[10px] text-muted-foreground tech-content">{r.profile.ref_id}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        <span className="capitalize">{r.current_tier || 'free'}</span>
                        <ArrowUpRight className="w-3 h-3" />
                        <span className="capitalize font-medium text-foreground">{r.requested_tier}</span>
                        <span>·</span>
                        <span>{r.billing_cycle}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span className="tech-content">{format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')}</span>
                      </div>
                      {r.admin_note && (
                        <p className="text-[11px] mt-1.5 text-muted-foreground italic line-clamp-2">{r.admin_note}</p>
                      )}
                    </div>
                    {isPending && !open && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setActiveId(r.id); setAdminNote(''); }}>
                          {isRTL ? 'مراجعة' : 'Review'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {isPending && open && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <Textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder={isRTL ? 'ملاحظة للسجل (اختيارية)' : 'Internal note (optional)'}
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          onClick={() => approveMutation.mutate(r)}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isRTL ? 'موافقة وتفعيل' : 'Approve & activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs gap-1.5"
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate(r)}
                        >
                          <X className="w-3.5 h-3.5" />
                          {isRTL ? 'رفض' : 'Reject'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setActiveId(null); setAdminNote(''); }}>
                          {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminUpgradeRequestsPanel;