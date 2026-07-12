/**
 * R1 — Side-by-side bid comparison matrix (RTL, Arabic-first).
 *
 * Presentational + local shortlist/award triggers. Uses ONLY existing
 * `opportunity_bids` columns — no schema changes.
 *
 * Columns  = one per bid (2..6 render inline, more scroll horizontally).
 * Rows     = criteria (sticky first column).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Loader2, Star, StarOff } from 'lucide-react';
import type { OpportunityBidRow } from './types';

interface Props {
  bids: OpportunityBidRow[];
  canAward?: boolean;
  awardedBidId?: string | null;
  onShortlistToggle?: (bid: OpportunityBidRow, next: boolean) => void;
  onAward?: (bid: OpportunityBidRow) => void;
  pendingBidId?: string | null;
  pendingKind?: 'shortlist' | 'award' | null;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function fmtDuration(v: number | null | undefined, unit: string | null | undefined): string {
  if (v == null) return '—';
  const unitAr =
    unit === 'hour'
      ? 'ساعة'
      : unit === 'day'
        ? 'يوم'
        : unit === 'week'
          ? 'أسبوع'
          : unit === 'month'
            ? 'شهر'
            : (unit ?? '');
  return `${v} ${unitAr}`.trim();
}

/** Rough day equivalence used only for "best value" comparison. */
function durationInDays(b: OpportunityBidRow): number | null {
  if (b.duration_value == null) return null;
  switch (b.duration_unit) {
    case 'hour':
      return b.duration_value / 24;
    case 'week':
      return b.duration_value * 7;
    case 'month':
      return b.duration_value * 30;
    case 'day':
    default:
      return b.duration_value;
  }
}

const STATUS_LABEL_AR: Record<string, string> = {
  draft: 'مسودة',
  submitted: 'مقدَّم',
  under_review: 'قيد المراجعة',
  shortlisted: 'في القائمة القصيرة',
  revised: 'معدَّل',
  awarded: 'الفائز',
  rejected: 'مرفوض',
  withdrawn: 'مسحوب',
};

export const BidComparisonTable: React.FC<Props> = ({
  bids,
  canAward = false,
  awardedBidId = null,
  onShortlistToggle,
  onAward,
  pendingBidId = null,
  pendingKind = null,
}) => {
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});

  // Fetch provider business names for column headers (best-effort).
  useEffect(() => {
    const ids = Array.from(
      new Set(bids.map((b) => b.provider_business_id).filter(Boolean)),
    ) as string[];
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id, name_ar, name_en')
        .in('id', ids);
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      for (const row of data as Array<{ id: string; name_ar?: string | null; name_en?: string | null }>) {
        map[row.id] = row.name_ar || row.name_en || '';
      }
      setProviderNames(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [bids]);

  const bestPriceId = useMemo(() => {
    const priced = bids
      .filter((b) => b.price_amount != null)
      .sort((a, b) => Number(a.price_amount) - Number(b.price_amount));
    return priced[0]?.id ?? null;
  }, [bids]);

  const bestDurationId = useMemo(() => {
    const withDur = bids
      .map((b) => ({ id: b.id, days: durationInDays(b) }))
      .filter((x) => x.days != null) as Array<{ id: string; days: number }>;
    withDur.sort((a, b) => a.days - b.days);
    return withDur[0]?.id ?? null;
  }, [bids]);

  const hasWinner = !!awardedBidId || bids.some((b) => b.status === 'awarded');

  const criteria: Array<{
    key: string;
    label: string;
    render: (b: OpportunityBidRow) => React.ReactNode;
    highlightId?: string | null;
  }> = [
    {
      key: 'price',
      label: 'السعر الإجمالي',
      highlightId: bestPriceId,
      render: (b) => (
        <span className="tech-content font-semibold">
          {b.price_amount != null ? Number(b.price_amount).toLocaleString() : '—'}{' '}
          <span className="text-xs font-normal text-muted-foreground">{b.currency}</span>
        </span>
      ),
    },
    {
      key: 'duration',
      label: 'مدة التنفيذ',
      highlightId: bestDurationId,
      render: (b) => <span className="tech-content">{fmtDuration(b.duration_value, b.duration_unit)}</span>,
    },
    {
      key: 'warranty',
      label: 'الضمان',
      render: (b) => <span className="whitespace-pre-wrap">{b.warranty || '—'}</span>,
    },
    {
      key: 'scope',
      label: 'نطاق العمل',
      render: (b) => <span className="whitespace-pre-wrap">{b.scope_summary || '—'}</span>,
    },
    {
      key: 'terms',
      label: 'الشروط',
      render: (b) => <span className="whitespace-pre-wrap">{b.terms || '—'}</span>,
    },
    {
      key: 'expires',
      label: 'صلاحية العرض',
      render: (b) => <span className="tech-content">{fmtDate(b.expires_at)}</span>,
    },
    {
      key: 'status',
      label: 'حالة العرض',
      render: (b) => (
        <Badge variant={b.status === 'awarded' ? 'default' : 'outline'} className={b.status === 'awarded' ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : ''}>
          {STATUS_LABEL_AR[b.status] ?? b.status}
        </Badge>
      ),
    },
    {
      key: 'submitted',
      label: 'تاريخ التقديم',
      render: (b) => <span className="tech-content">{fmtDate(b.submitted_at)}</span>,
    },
  ];

  return (
    <div dir="rtl" className="w-full overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th
              scope="col"
              className="sticky start-0 z-10 bg-muted/60 text-start p-3 font-semibold w-40 min-w-40"
            >
              معيار المقارنة
            </th>
            {bids.map((b) => {
              const isWinner = b.status === 'awarded' || (awardedBidId && b.id === awardedBidId);
              const shortlisted = b.status === 'shortlisted';
              const name = (b.provider_business_id && providerNames[b.provider_business_id]) || 'مورّد';
              return (
                <th
                  scope="col"
                  key={b.id}
                  className={`p-3 text-start align-top min-w-[180px] ${isWinner ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{name}</div>
                      {isWinner && (
                        <Badge className="mt-1 bg-emerald-600 hover:bg-emerald-600 text-white">
                          الفائز
                        </Badge>
                      )}
                    </div>
                    {onShortlistToggle && !isWinner && !hasWinner && (
                      <button
                        type="button"
                        aria-label={shortlisted ? 'إزالة من القائمة القصيرة' : 'ضم للقائمة القصيرة'}
                        onClick={() => onShortlistToggle(b, !shortlisted)}
                        disabled={pendingBidId === b.id && pendingKind === 'shortlist'}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition"
                      >
                        {pendingBidId === b.id && pendingKind === 'shortlist' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : shortlisted ? (
                          <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {criteria.map((row) => (
            <tr key={row.key} className="border-t">
              <th
                scope="row"
                className="sticky start-0 z-10 bg-card text-start p-3 font-medium text-muted-foreground align-top w-40 min-w-40"
              >
                {row.label}
              </th>
              {bids.map((b) => {
                const isBest = row.highlightId && row.highlightId === b.id && bids.length > 1;
                return (
                  <td key={b.id} className="p-3 align-top min-w-[180px]">
                    <div className="flex flex-col gap-1">
                      <div>{row.render(b)}</div>
                      {isBest && (
                        <Badge variant="secondary" className="w-fit text-[10px]">
                          أفضل قيمة
                        </Badge>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          {canAward && !hasWinner && onAward && (
            <tr className="border-t bg-muted/20">
              <th
                scope="row"
                className="sticky start-0 z-10 bg-muted/40 text-start p-3 font-medium w-40 min-w-40"
              >
                الإجراءات
              </th>
              {bids.map((b) => {
                const awardable = ['submitted', 'under_review', 'shortlisted', 'revised'].includes(
                  b.status,
                );
                return (
                  <td key={b.id} className="p-3 align-top min-w-[180px]">
                    <Button
                      size="sm"
                      onClick={() => onAward(b)}
                      disabled={
                        !awardable ||
                        (pendingBidId === b.id && pendingKind === 'award')
                      }
                      className="min-h-[36px] w-full"
                    >
                      {pendingBidId === b.id && pendingKind === 'award' ? (
                        <Loader2 className="h-4 w-4 animate-spin me-1" />
                      ) : (
                        <Award className="h-4 w-4 me-1" />
                      )}
                      تعميد العرض
                    </Button>
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BidComparisonTable;