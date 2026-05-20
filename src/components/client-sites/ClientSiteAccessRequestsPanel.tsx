/**
 * Client Sites Phase 2.5B — Owner inbox for incoming access requests (inline panel).
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox, Check, X, EyeOff, RotateCcw, Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Status = 'requested' | 'approved' | 'rejected' | 'revoked' | 'ignored';
type Level = 'limited' | 'quote' | 'service' | 'contract' | 'admin';

interface GrantRow {
  grant_id: string;
  site_id: string;
  site_ref: string;
  site_name: string | null;
  site_type: string | null;
  provider_business_id: string;
  provider_business_name: string | null;
  status: Status;
  access_level: Level;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  revoked_at: string | null;
  ignored_at: string | null;
  reason: string | null;
}

interface Props {
  isRTL: boolean;
  siteId: string;
}

const LEVEL_LABELS: Record<Level, { ar: string; en: string }> = {
  limited: { ar: 'محدود', en: 'Limited' },
  quote: { ar: 'تسعير', en: 'Quote' },
  service: { ar: 'تنفيذ', en: 'Service' },
  contract: { ar: 'عقد', en: 'Contract' },
  admin: { ar: 'إدارة', en: 'Admin' },
};

const STATUS_VARIANT: Record<Status, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  requested: 'default',
  approved: 'secondary',
  rejected: 'destructive',
  revoked: 'outline',
  ignored: 'outline',
};

export const ClientSiteAccessRequestsPanel: React.FC<Props> = ({ isRTL, siteId }) => {
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [levelDraft, setLevelDraft] = useState<Record<string, Level>>({});

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['client-site-access-requests', siteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_site_access_requests_for_owner', { _site_id: siteId });
      if (error) throw error;
      return (data ?? []) as GrantRow[];
    },
  });

  const mut = useMutation({
    mutationFn: async (p: {
      action: 'approve' | 'reject' | 'revoke' | 'ignore';
      grant_id: string;
      level?: Level;
    }) => {
      const fn =
        p.action === 'approve' ? 'approve_client_site_access'
        : p.action === 'reject' ? 'reject_client_site_access'
        : p.action === 'revoke' ? 'revoke_client_site_access'
        : 'ignore_client_site_access';
      const args: Record<string, unknown> = { _grant_id: p.grant_id };
      if (p.action === 'approve') args._access_level = p.level ?? 'quote';
      const { data, error } = await supabase.rpc(fn, args as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-site-access-requests', siteId] });
      toast.success(isRTL ? 'تم التحديث' : 'Updated');
    },
    onError: (e: Error) => toast.error(isRTL ? `فشل: ${e.message}` : `Failed: ${e.message}`),
    onSettled: () => setPendingId(null),
  });

  const doAction = (g: GrantRow, action: 'approve' | 'reject' | 'revoke' | 'ignore') => {
    setPendingId(g.grant_id);
    mut.mutate({ action, grant_id: g.grant_id, level: levelDraft[g.grant_id] ?? 'quote' });
  };

  return (
    <section className="space-y-3 p-4 rounded-xl border border-border/40 bg-muted/10" aria-labelledby="csar-heading">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Inbox className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <h3 id="csar-heading" className="text-sm font-semibold">
            {isRTL ? 'طلبات الوصول للموقع' : 'Site access requests'}
          </h3>
          {rows.length > 0 && (
            <Badge variant="outline" size="sm" className="text-[9px]">{rows.length}</Badge>
          )}
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => refetch()}>
          {isRTL ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {isRTL ? 'جارٍ التحميل…' : 'Loading…'}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {isRTL ? 'لا توجد طلبات وصول حالياً.' : 'No access requests yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((g) => {
            const busy = pendingId === g.grant_id && mut.isPending;
            const level = levelDraft[g.grant_id] ?? (g.access_level as Level) ?? 'quote';
            const isPending = g.status === 'requested';
            const isApproved = g.status === 'approved';
            return (
              <li key={g.grant_id} className="p-3 rounded-lg border border-border/40 bg-background/60 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{g.provider_business_name ?? (isRTL ? 'مزود' : 'Provider')}</span>
                      <Badge variant={STATUS_VARIANT[g.status]} size="sm" className="text-[9px]">
                        {g.status}
                      </Badge>
                      <Badge variant="outline" size="sm" className="text-[9px]">
                        {isRTL ? LEVEL_LABELS[g.access_level].ar : LEVEL_LABELS[g.access_level].en}
                      </Badge>
                    </div>
                    {g.reason && (
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed" dir="auto">
                        {g.reason}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5 tech-content" dir="ltr">
                      {new Date(g.requested_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {(isPending || isApproved) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {isPending && (
                      <select
                        value={level}
                        onChange={(e) =>
                          setLevelDraft((d) => ({ ...d, [g.grant_id]: e.target.value as Level }))
                        }
                        disabled={busy}
                        aria-label={isRTL ? 'مستوى الوصول' : 'Access level'}
                        className="h-8 text-[11px] rounded-md border border-border/40 bg-background px-2"
                      >
                        {(['limited', 'quote', 'service', 'contract', 'admin'] as Level[]).map((l) => (
                          <option key={l} value={l}>
                            {isRTL ? LEVEL_LABELS[l].ar : LEVEL_LABELS[l].en}
                          </option>
                        ))}
                      </select>
                    )}
                    {isPending && (
                      <>
                        <Button type="button" size="sm" variant="hero" className="h-8 gap-1 text-[11px]"
                          disabled={busy} onClick={() => doAction(g, 'approve')}>
                          <Check className="w-3 h-3" />
                          {isRTL ? 'موافقة' : 'Approve'}
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-[11px]"
                          disabled={busy} onClick={() => doAction(g, 'reject')}>
                          <X className="w-3 h-3" />
                          {isRTL ? 'رفض' : 'Reject'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 text-[11px]"
                          disabled={busy} onClick={() => doAction(g, 'ignore')}>
                          <EyeOff className="w-3 h-3" />
                          {isRTL ? 'تجاهل' : 'Ignore'}
                        </Button>
                      </>
                    )}
                    {isApproved && (
                      <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-[11px]"
                        disabled={busy} onClick={() => doAction(g, 'revoke')}>
                        <RotateCcw className="w-3 h-3" />
                        {isRTL ? 'إلغاء الوصول' : 'Revoke'}
                      </Button>
                    )}
                    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default ClientSiteAccessRequestsPanel;