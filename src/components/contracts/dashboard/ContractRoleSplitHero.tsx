import React, { useMemo } from 'react';
import { Send, Inbox, LayoutGrid, Clock, CheckCircle2, Wallet } from 'lucide-react';
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

  const allTotal = agg.provider.total + agg.client.total;
  const allAgg = useMemo(() => ({
    total: agg.provider.total + agg.client.total,
    pending: agg.provider.pending + agg.client.pending,
    active: agg.provider.active + agg.client.active,
    amount: agg.provider.amount + agg.client.amount,
    currency: agg.provider.currency || agg.client.currency || 'SAR',
  }), [agg]);

  type SegData = { total: number; pending: number; active: number; amount: number; currency: string };
  const Seg = ({
    side, active, onClick, icon: Icon, label, hint, data, accent,
  }: {
    side: 'all' | 'provider' | 'client';
    active: boolean;
    onClick: () => void;
    icon: typeof Send;
    label: string;
    hint: string;
    data: SegData;
    accent: 'foreground' | 'accent' | 'primary';
  }) => {
    const ring =
      accent === 'accent' ? 'ring-accent/30 border-accent/50' :
      accent === 'primary' ? 'ring-primary/30 border-primary/50' :
      'ring-foreground/20 border-foreground/40';
    const iconBg =
      accent === 'accent' ? 'bg-accent/15 text-accent' :
      accent === 'primary' ? 'bg-primary/15 text-primary' :
      'bg-foreground/10 text-foreground';
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onClick}
        title={hint}
        data-side={side}
        className={[
          'group flex-1 min-w-0 text-start rounded-xl border px-3 py-2 transition-all',
          'flex items-center gap-2.5',
          active
            ? `bg-card shadow-[var(--elev-1)] ring-2 ${ring}`
            : 'bg-transparent border-transparent hover:bg-card/60 hover:border-border/60',
        ].join(' ')}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading font-semibold text-xs sm:text-sm leading-tight truncate">{label}</span>
            <span className="text-[11px] font-bold tech-content text-foreground">{data.total}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5 text-warning" aria-hidden="true" />
              <span className="tech-content font-medium text-warning">{data.pending}</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 text-success" aria-hidden="true" />
              <span className="tech-content font-medium text-success">{data.active}</span>
            </span>
            <span className="inline-flex items-center gap-0.5 truncate">
              <Wallet className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tech-content font-medium text-foreground truncate">
                {data.amount >= 1000 ? `${(data.amount / 1000).toFixed(1)}k` : data.amount.toLocaleString()}
              </span>
              <span className="opacity-70">{data.currency}</span>
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      role="tablist"
      aria-label={isRTL ? 'نطاق العقود' : 'Contracts scope'}
      className="flex items-stretch gap-1.5 p-1 rounded-2xl border border-border/50 bg-muted/30"
    >
      <Seg
        side="all"
        active={value === 'all'}
        onClick={() => onChange('all')}
        icon={LayoutGrid}
        label={isRTL ? 'الكل' : 'All'}
        hint={isRTL ? 'كل العقود الصادرة والواردة' : 'All outgoing and incoming contracts'}
        data={allAgg}
        accent="foreground"
      />
      <Seg
        side="provider"
        active={value === 'provider'}
        onClick={() => onChange('provider')}
        icon={Send}
        label={isRTL ? 'صادرة' : 'Outgoing'}
        hint={isRTL ? 'عقود أنشأتها وأرسلتها للطرف الآخر للموافقة' : 'Contracts you issued and sent for approval'}
        data={agg.provider}
        accent="accent"
      />
      <Seg
        side="client"
        active={value === 'client'}
        onClick={() => onChange('client')}
        icon={Inbox}
        label={isRTL ? 'واردة' : 'Incoming'}
        hint={isRTL ? 'عقود استلمتها من طرف آخر لمراجعتها والموافقة عليها' : 'Contracts received from another party for your review'}
        data={agg.client}
        accent="primary"
      />
    </div>
  );
});