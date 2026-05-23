import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listAccessKeyUsageLog,
  listMembershipInviteRedemptions,
} from '@/modules/memberships';
import { Button } from '@/components/ui/button';
import { Download, Activity, Loader2 } from 'lucide-react';

interface Props {
  isRTL: boolean;
  businessId: string;
}

type AccessUsageRow = {
  id: string;
  access_key_id: string;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  membership_access_keys?: { name: string; key_prefix: string } | null;
};

type InviteRedemptionRow = {
  id: string;
  invite_key_id: string;
  redeemed_by_user_id: string;
  business_staff_id: string | null;
  created_at: string;
  membership_invite_keys?: { code: string; role: string } | null;
};

function toCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const MembershipKeyUsageLog: React.FC<Props> = ({ isRTL, businessId }) => {
  const { data: accessUsage = [], isLoading: l1 } = useQuery({
    queryKey: ['access-key-usage', businessId],
    queryFn: async () => {
      const { data } = await listAccessKeyUsageLog<AccessUsageRow>({ businessId, limit: 500 });
      return (data ?? []) as unknown as AccessUsageRow[];
    },
  });

  const { data: inviteRedemptions = [], isLoading: l2 } = useQuery({
    queryKey: ['invite-redemptions', businessId],
    queryFn: async () => {
      const { data } = await listMembershipInviteRedemptions<InviteRedemptionRow>({ businessId, limit: 500 });
      return (data ?? []) as unknown as InviteRedemptionRow[];
    },
  });

  const callCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of accessUsage) map.set(r.access_key_id, (map.get(r.access_key_id) ?? 0) + 1);
    return map;
  }, [accessUsage]);

  const exportAccess = () =>
    toCsv(
      accessUsage.map((r) => ({
        date: r.created_at,
        key_name: r.membership_access_keys?.name ?? '',
        key_prefix: r.membership_access_keys?.key_prefix ?? '',
        endpoint: r.endpoint ?? '',
        method: r.method ?? '',
        status: r.status_code ?? '',
        ip: r.ip ?? '',
        user_agent: r.user_agent ?? '',
      })),
      `access-key-usage-${new Date().toISOString().slice(0, 10)}.csv`,
    );

  const exportInvites = () =>
    toCsv(
      inviteRedemptions.map((r) => ({
        date: r.created_at,
        invite_code: r.membership_invite_keys?.code ?? '',
        role: r.membership_invite_keys?.role ?? '',
        redeemed_by_user_id: r.redeemed_by_user_id,
        business_staff_id: r.business_staff_id ?? '',
      })),
      `invite-redemptions-${new Date().toISOString().slice(0, 10)}.csv`,
    );

  if (l1 || l2) {
    return (
      <div className="flex justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <header className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-accent" />
            {isRTL ? `استدعاءات مفاتيح API (${accessUsage.length})` : `API Key Calls (${accessUsage.length})`}
          </h4>
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={exportAccess} disabled={accessUsage.length === 0}>
            <Download className="w-3 h-3" /> CSV
          </Button>
        </header>
        {accessUsage.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-4">
            {isRTL ? 'لا توجد استدعاءات بعد.' : 'No calls recorded yet.'}
          </p>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-start">
                    <th className="px-2 py-1.5 font-medium">{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th className="px-2 py-1.5 font-medium">{isRTL ? 'المفتاح' : 'Key'}</th>
                    <th className="px-2 py-1.5 font-medium">{isRTL ? 'الاستدعاء' : 'Endpoint'}</th>
                    <th className="px-2 py-1.5 font-medium">{isRTL ? 'الحالة' : 'Status'}</th>
                    <th className="px-2 py-1.5 font-medium">{isRTL ? 'إجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {accessUsage.slice(0, 100).map((r) => (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="px-2 py-1 tech-content text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-2 py-1">{r.membership_access_keys?.name ?? '—'}</td>
                      <td className="px-2 py-1 tech-content truncate max-w-[180px]">{r.method} {r.endpoint}</td>
                      <td className="px-2 py-1 tech-content">{r.status_code ?? '—'}</td>
                      <td className="px-2 py-1 tech-content">{callCounts.get(r.access_key_id) ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section>
        <header className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-accent" />
            {isRTL ? `تفعيلات روابط الدعوة (${inviteRedemptions.length})` : `Invite Redemptions (${inviteRedemptions.length})`}
          </h4>
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={exportInvites} disabled={inviteRedemptions.length === 0}>
            <Download className="w-3 h-3" /> CSV
          </Button>
        </header>
        {inviteRedemptions.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-4">
            {isRTL ? 'لا توجد تفعيلات بعد.' : 'No redemptions yet.'}
          </p>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-start">
                    <th className="px-2 py-1.5 font-medium">{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th className="px-2 py-1.5 font-medium">{isRTL ? 'الكود' : 'Code'}</th>
                    <th className="px-2 py-1.5 font-medium">{isRTL ? 'الدور' : 'Role'}</th>
                    <th className="px-2 py-1.5 font-medium">{isRTL ? 'المستخدم' : 'User'}</th>
                  </tr>
                </thead>
                <tbody>
                  {inviteRedemptions.slice(0, 100).map((r) => (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="px-2 py-1 tech-content text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-2 py-1 tech-content">{r.membership_invite_keys?.code ?? '—'}</td>
                      <td className="px-2 py-1">{r.membership_invite_keys?.role ?? '—'}</td>
                      <td className="px-2 py-1 tech-content text-muted-foreground truncate max-w-[160px]">{r.redeemed_by_user_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};