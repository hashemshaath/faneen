import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listMembershipPromoCodes,
  listMembershipPromoCodeAttempts,
} from '@/modules/memberships';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Gift, Loader2 } from 'lucide-react';

interface Props { isRTL: boolean }

type PromoCode = {
  id: string;
  code: string;
  type: string;
  target_tier: string | null;
  duration_days: number | null;
  discount_percent: number | null;
  max_redemptions: number;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
};

type Attempt = {
  id: string;
  code: string;
  promo_code_id: string | null;
  user_id: string | null;
  success: boolean;
  rejection_reason: string | null;
  created_at: string;
};

function deriveStatus(c: PromoCode): { key: string; ar: string; en: string; tone: string } {
  if (!c.is_active) return { key: 'inactive', ar: 'غير مفعّل', en: 'Inactive', tone: 'bg-muted text-muted-foreground' };
  const now = Date.now();
  if (new Date(c.valid_from).getTime() > now) return { key: 'not_started', ar: 'لم يبدأ', en: 'Not started', tone: 'bg-info/10 text-info' };
  if (c.valid_until && new Date(c.valid_until).getTime() < now)
    return { key: 'expired', ar: 'منتهي', en: 'Expired', tone: 'bg-destructive/10 text-destructive' };
  if (c.used_count >= c.max_redemptions) return { key: 'fully_redeemed', ar: 'مستنفد', en: 'Fully used', tone: 'bg-warning/10 text-warning' };
  if (c.used_count > 0) return { key: 'partially_used', ar: 'مستعمل جزئياً', en: 'Partially used', tone: 'bg-accent/10 text-accent' };
  return { key: 'active', ar: 'نشط', en: 'Active', tone: 'bg-success/10 text-success' };
}

function csv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const out = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + out], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export const AdminPromoCodesPanel: React.FC<Props> = ({ isRTL }) => {
  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: async () => {
      const { data } = await listMembershipPromoCodes<PromoCode>();
      return (data ?? []) as PromoCode[];
    },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['admin-promo-attempts'],
    queryFn: async () => {
      const { data } = await listMembershipPromoCodeAttempts<Attempt>();
      return (data ?? []) as Attempt[];
    },
  });

  const attemptsByCode = useMemo(() => {
    const m = new Map<string, { total: number; failed: number; lastReason: string | null }>();
    for (const a of attempts) {
      const key = a.promo_code_id ?? `code:${a.code}`;
      const cur = m.get(key) ?? { total: 0, failed: 0, lastReason: null };
      cur.total += 1;
      if (!a.success) {
        cur.failed += 1;
        if (!cur.lastReason) cur.lastReason = a.rejection_reason;
      }
      m.set(key, cur);
    }
    return m;
  }, [attempts]);

  const exportAttempts = () =>
    csv(
      attempts.map((a) => ({
        date: a.created_at,
        code: a.code,
        success: a.success,
        rejection_reason: a.rejection_reason ?? '',
        user_id: a.user_id ?? '',
      })),
      `promo-attempts-${new Date().toISOString().slice(0, 10)}.csv`,
    );

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2">
            <Gift className="w-4 h-4 text-accent" />
            {isRTL ? `أكواد ترويجية (${codes.length})` : `Promo Codes (${codes.length})`}
          </h3>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={exportAttempts} disabled={attempts.length === 0}>
            <Download className="w-3.5 h-3.5" />
            {isRTL ? 'تصدير المحاولات' : 'Export attempts'}
          </Button>
        </div>

        {codes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {isRTL ? 'لا توجد أكواد ترويجية.' : 'No promo codes.'}
          </p>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-start">
                    <th className="px-2 py-2 font-medium">{isRTL ? 'الكود' : 'Code'}</th>
                    <th className="px-2 py-2 font-medium">{isRTL ? 'النوع' : 'Type'}</th>
                    <th className="px-2 py-2 font-medium">{isRTL ? 'الباقة' : 'Tier'}</th>
                    <th className="px-2 py-2 font-medium">{isRTL ? 'الاستخدامات' : 'Uses'}</th>
                    <th className="px-2 py-2 font-medium">{isRTL ? 'المحاولات' : 'Attempts'}</th>
                    <th className="px-2 py-2 font-medium">{isRTL ? 'سبب الفشل الأخير' : 'Last failure'}</th>
                    <th className="px-2 py-2 font-medium">{isRTL ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => {
                    const s = deriveStatus(c);
                    const ag = attemptsByCode.get(c.id);
                    return (
                      <tr key={c.id} className="border-t border-border/40">
                        <td className="px-2 py-1.5 tech-content font-medium">{c.code}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{c.type}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{c.target_tier ?? '—'}</td>
                        <td className="px-2 py-1.5 tech-content">
                          {c.used_count}/{c.max_redemptions}
                        </td>
                        <td className="px-2 py-1.5 tech-content">
                          {ag ? `${ag.total} (${ag.failed} ✗)` : '0'}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{ag?.lastReason ?? '—'}</td>
                        <td className="px-2 py-1.5">
                          <Badge className={`text-[10px] ${s.tone}`}>{isRTL ? s.ar : s.en}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};