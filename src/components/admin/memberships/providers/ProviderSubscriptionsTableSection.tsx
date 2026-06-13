/**
 * Phase 7G — Presentational table for provider subscriptions.
 * Pure UI: no Supabase, no queries, no mutations. Rows + callbacks
 * are provided by the parent page.
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Eye } from 'lucide-react';
import { TierChip } from '@/components/admin/memberships/shared';
import { ReferenceBadge } from '@/components/reference/ReferenceBadge';
import { ReferenceLinkCopy } from '@/components/reference/ReferenceLinkCopy';

export interface ProviderSubscriptionRow {
  id: string;
  ref_id: string | null;
  business_id: string;
  status: string;
  lead_credits_balance: number;
  updated_at: string;
  plan: { name_ar: string } | null;
  business: {
    ref_id: string | null;
    name_ar: string;
    membership_tier: string | null;
  } | null;
}

export interface ProviderSubscriptionsTableSectionProps {
  rows: ProviderSubscriptionRow[];
  editId: string | null;
  isLoading: boolean;
  statusLabel: Record<string, string>;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

export const ProviderSubscriptionsTableSection: React.FC<ProviderSubscriptionsTableSectionProps> = ({
  rows,
  editId,
  isLoading,
  statusLabel,
  onEdit,
  onView,
}) => {
  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-3">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">لا توجد عضويات.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-start py-2 px-2">المنشأة</th>
                  <th className="text-start py-2 px-2">المرجع</th>
                  <th className="text-start py-2 px-2">خطة المزود</th>
                  <th className="text-start py-2 px-2">حالة خطة المزود</th>
                  <th className="text-start py-2 px-2">عضوية المنصة</th>
                  <th className="text-start py-2 px-2">الرصيد</th>
                  <th className="text-start py-2 px-2">آخر تحديث</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-t border-border cursor-pointer hover:bg-muted/40 ${editId === s.id ? 'bg-primary/5' : ''}`}
                    onClick={() => onEdit(s.id)}
                  >
                    <td className="py-2 px-2 font-medium truncate max-w-[200px]">
                      <div>{s.business?.name_ar ?? '—'}</div>
                      {s.business?.ref_id && (
                        <div className="tech-content text-[10px] text-muted-foreground">{s.business.ref_id}</div>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {s.ref_id ? (
                        <span onClick={(e) => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-1">
                            <ReferenceBadge refId={s.ref_id} />
                            <ReferenceLinkCopy refId={s.ref_id} isRTL={true} />
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2">{s.plan?.name_ar ?? '—'}</td>
                    <td className="py-2 px-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/50">
                        {statusLabel[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <TierChip tier={s.business?.membership_tier ?? 'free'} isRTL={true} />
                    </td>
                    <td className="py-2 px-2 tech-content font-medium">{s.lead_credits_balance}</td>
                    <td className="py-2 px-2 tech-content text-muted-foreground">
                      {new Date(s.updated_at).toLocaleDateString('ar-SA-u-nu-latn')}
                    </td>
                    <td className="py-2 px-2 text-end">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onView(s.id); }}
                          className="p-1 rounded hover:bg-muted/60 text-muted-foreground"
                          title="عرض التفاصيل"
                          aria-label="عرض التفاصيل"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderSubscriptionsTableSection;