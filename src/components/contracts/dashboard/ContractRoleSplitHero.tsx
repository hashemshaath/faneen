import React, { useMemo } from 'react';
import { Send, Inbox, LayoutGrid, Clock, CheckCircle2, Wallet, ArrowLeftRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ContractRow = {
  id: string;
  status: string;
  total_amount: number | string;
  currency_code?: string | null;
};

export type ContractRoleFilter = 'all' | 'provider' | 'client';

interface Props {
  value: ContractRoleFilter;
  onChange: (v: ContractRoleFilter) => void;
  providerContracts: ContractRow[];
  clientContracts: ContractRow[];
  isRTL: boolean;
}

/**
 * Professional dual-card hero for /dashboard/contracts that surfaces
 * the Outgoing (provider) vs Incoming (client) split as the primary
 * navigation. Replaces the small ContractRoleTabs pill strip.
 *
 * Counts (total, pending approval, active) and aggregate amount are
 * computed locally from the already-fetched contract arrays — no
 * extra queries.
 */
export const ContractRoleSplitHero = React.memo(function ContractRoleSplitHero({
  value, onChange, providerContracts, clientContracts, isRTL,
}: Props) {
  const agg = useMemo(() => {
    const summarize = (rows: ContractRow[]) => {
      const total = rows.length;
      let pending = 0, active = 0, amount = 0;
      let currency: string | null = null;
      for (const r of rows) {
        if (r.status === 'pending_approval') pending++;
        else if (r.status === 'active') active++;
        amount += Number(r.total_amount) || 0;
        if (!currency && r.currency_code) currency = r.currency_code;
      }
      return { total, pending, active, amount, currency: currency || 'SAR' };
    };
    return {
      provider: summarize(providerContracts),
      client: summarize(clientContracts),
    };
  }, [providerContracts, clientContracts]);

  const allAgg = useMemo(() => ({
    total: agg.provider.total + agg.client.total,
    pending: agg.provider.pending + agg.client.pending,
    active: agg.provider.active + agg.client.active,
    amount: agg.provider.amount + agg.client.amount,
    currency: agg.provider.currency || agg.client.currency || 'SAR',
  }), [agg]);

  type SegData = { total: number; pending: number; active: number; amount: number; currency: string };

  const fmtAmount = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k`
    : n.toLocaleString();

  const BigCard = ({
    side, active, onClick, icon: Icon, label, sublabel, data, accent,
  }: {
    side: 'provider' | 'client';
    active: boolean;
    onClick: () => void;
    icon: typeof Send;
    label: string;
    sublabel: string;
    data: SegData;
    accent: 'accent' | 'primary';
  }) => {
    const tone =
      accent === 'accent'
        ? {
            ring: 'ring-accent/40 border-accent/60',
            soft: 'from-accent/10 via-accent/5 to-transparent',
            icon: 'bg-accent/15 text-accent',
            bar: 'bg-accent',
          }
        : {
            ring: 'ring-primary/40 border-primary/60',
            soft: 'from-primary/10 via-primary/5 to-transparent',
            icon: 'bg-primary/15 text-primary',
            bar: 'bg-primary',
          };
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onClick}
        data-side={side}
        className={[
          'group relative flex-1 min-w-0 text-start overflow-hidden rounded-2xl border bg-card transition-all',
          'p-4 md:p-5 hover-lift',
          active
            ? `shadow-[var(--elev-2)] ring-2 ${tone.ring}`
            : 'border-border/50 hover:border-border',
        ].join(' ')}
      >
        <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${tone.bar} ${active ? 'opacity-100' : 'opacity-40'}`} />
        <span aria-hidden="true" className={`absolute inset-0 bg-gradient-to-br ${tone.soft} pointer-events-none ${active ? 'opacity-100' : 'opacity-50'}`} />
        <div className="relative flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone.icon} shadow-sm`}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <div className="font-heading font-bold text-sm md:text-base leading-tight truncate">{label}</div>
                <div className="text-[10px] md:text-[11px] text-muted-foreground truncate">{sublabel}</div>
              </div>
              <div className="text-2xl md:text-3xl font-bold tech-content tracking-tight shrink-0">{data.total}</div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-background/60 border border-border/40 px-2 py-1.5">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Clock className="w-2.5 h-2.5 text-warning" aria-hidden="true" />
                  <span className="truncate">{isRTL ? 'بانتظار' : 'Pending'}</span>
                </div>
                <div className="tech-content font-bold text-warning text-sm leading-tight">{data.pending}</div>
              </div>
              <div className="rounded-lg bg-background/60 border border-border/40 px-2 py-1.5">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <CheckCircle2 className="w-2.5 h-2.5 text-success" aria-hidden="true" />
                  <span className="truncate">{isRTL ? 'نشطة' : 'Active'}</span>
                </div>
                <div className="tech-content font-bold text-success text-sm leading-tight">{data.active}</div>
              </div>
              <div className="rounded-lg bg-background/60 border border-border/40 px-2 py-1.5">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Wallet className="w-2.5 h-2.5 text-foreground/70" aria-hidden="true" />
                  <span className="truncate">{isRTL ? 'القيمة' : 'Value'}</span>
                </div>
                <div className="tech-content font-bold text-foreground text-sm leading-tight truncate">
                  {fmtAmount(data.amount)}
                  <span className="opacity-60 text-[9px] ms-1 font-normal">{data.currency}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-2.5" role="tablist" aria-label={isRTL ? 'نطاق العقود' : 'Contracts scope'}>
      {/* All toggle bar */}
      <button
        type="button"
        role="tab"
        aria-selected={value === 'all'}
        onClick={() => onChange('all')}
        className={[
          'w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-all',
          value === 'all'
            ? 'bg-card border-foreground/30 ring-1 ring-foreground/20 shadow-[var(--elev-1)]'
            : 'bg-muted/30 border-border/50 hover:bg-card/60',
        ].join(' ')}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-foreground/10 text-foreground flex items-center justify-center">
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <span className="font-heading font-semibold text-xs sm:text-sm">
            {isRTL ? 'كل العقود' : 'All contracts'}
          </span>
          <Badge variant="outline" className="text-[10px] tech-content">{allAgg.total}</Badge>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-warning" aria-hidden="true" />
            <span className="tech-content font-semibold text-warning">{allAgg.pending}</span>
            <span>{isRTL ? 'بانتظار' : 'pending'}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-success" aria-hidden="true" />
            <span className="tech-content font-semibold text-success">{allAgg.active}</span>
            <span>{isRTL ? 'نشطة' : 'active'}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Wallet className="w-3 h-3" aria-hidden="true" />
            <span className="tech-content font-semibold text-foreground">{fmtAmount(allAgg.amount)}</span>
            <span className="opacity-70">{allAgg.currency}</span>
          </span>
        </div>
        <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
      </button>

      {/* Split: Outgoing / Incoming — half + half */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <BigCard
          side="provider"
          active={value === 'provider'}
          onClick={() => onChange('provider')}
          icon={Send}
          label={isRTL ? 'العقود الصادرة' : 'Outgoing contracts'}
          sublabel={isRTL ? 'عقود أنشأتها وأرسلتها للطرف الآخر' : 'Contracts you issued to others'}
          data={agg.provider}
          accent="accent"
        />
        <BigCard
          side="client"
          active={value === 'client'}
          onClick={() => onChange('client')}
          icon={Inbox}
          label={isRTL ? 'العقود الواردة' : 'Incoming contracts'}
          sublabel={isRTL ? 'عقود استلمتها للمراجعة والموافقة' : 'Contracts you received for review'}
          data={agg.client}
          accent="primary"
        />
      </div>
    </div>
  );
});