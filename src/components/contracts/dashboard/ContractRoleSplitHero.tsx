import React, { useMemo } from 'react';
import { Send, Inbox, LayoutGrid, Clock, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
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
  const NextIcon = isRTL ? ArrowLeft : ArrowRight;

  const Card = ({
    side, active, onClick, icon: Icon, title, subtitle, data, accent,
  }: {
    side: 'provider' | 'client';
    active: boolean;
    onClick: () => void;
    icon: typeof Send;
    title: string;
    subtitle: string;
    data: { total: number; pending: number; active: number; amount: number; currency: string };
    accent: 'accent' | 'primary';
  }) => (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'group relative flex-1 min-w-0 text-start rounded-2xl border p-4 sm:p-5 transition-all overflow-hidden',
        'bg-gradient-to-br from-card to-card hover:shadow-[var(--elev-2)]',
        active
          ? (accent === 'accent'
              ? 'border-accent/60 shadow-[var(--elev-2)] ring-2 ring-accent/30 bg-gradient-to-br from-accent/[0.08] to-card'
              : 'border-primary/60 shadow-[var(--elev-2)] ring-2 ring-primary/30 bg-gradient-to-br from-primary/[0.08] to-card')
          : 'border-border/50 hover:border-border',
      ].join(' ')}
      data-side={side}
    >
      <div
        className={[
          'pointer-events-none absolute -top-12 -end-12 w-40 h-40 rounded-full blur-3xl transition-opacity',
          accent === 'accent' ? 'bg-accent/20' : 'bg-primary/20',
          active ? 'opacity-100' : 'opacity-40 group-hover:opacity-70',
        ].join(' ')}
        aria-hidden="true"
      />
      <div className="relative flex items-start gap-3">
        <div
          className={[
            'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg',
            accent === 'accent'
              ? 'bg-gradient-to-br from-accent to-accent/70 text-accent-foreground shadow-accent/30'
              : 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-primary/30',
          ].join(' ')}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-bold text-sm sm:text-base leading-tight">{title}</h3>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 tech-content">
              {data.total}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-background/60 border border-border/40 px-2 py-1.5">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wide">
                <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                {isRTL ? 'بانتظار' : 'Pending'}
              </div>
              <div className="font-bold text-sm tech-content text-warning">{data.pending}</div>
            </div>
            <div className="rounded-lg bg-background/60 border border-border/40 px-2 py-1.5">
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase tracking-wide">
                <CheckCircle2 className="w-2.5 h-2.5" aria-hidden="true" />
                {isRTL ? 'نشطة' : 'Active'}
              </div>
              <div className="font-bold text-sm tech-content text-success">{data.active}</div>
            </div>
            <div className="rounded-lg bg-background/60 border border-border/40 px-2 py-1.5">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                {isRTL ? 'القيمة' : 'Value'}
              </div>
              <div className="font-bold text-xs tech-content truncate" title={`${data.amount} ${data.currency}`}>
                {data.amount.toLocaleString()}
                <span className="text-[9px] text-muted-foreground ms-1 font-normal">{data.currency}</span>
              </div>
            </div>
          </div>
        </div>
        <NextIcon
          className={[
            'w-4 h-4 shrink-0 transition-all',
            active ? (accent === 'accent' ? 'text-accent' : 'text-primary') : 'text-muted-foreground/40 group-hover:text-foreground',
          ].join(' ')}
          aria-hidden="true"
        />
      </div>
    </button>
  );

  return (
    <div className="space-y-2.5" role="tablist" aria-label={isRTL ? 'نطاق العقود' : 'Contracts scope'}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="font-medium">
            {isRTL ? 'صنّف العقود حسب الطرف' : 'Filter contracts by party'}
          </span>
        </div>
        <button
          type="button"
          role="tab"
          aria-selected={value === 'all'}
          onClick={() => onChange('all')}
          className={[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border',
            value === 'all'
              ? 'bg-foreground text-background border-foreground shadow-sm'
              : 'bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border',
          ].join(' ')}
        >
          <LayoutGrid className="w-3 h-3" aria-hidden="true" />
          {isRTL ? 'عرض الكل' : 'Show all'}
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 tech-content">{allTotal}</Badge>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <Card
          side="provider"
          active={value === 'provider'}
          onClick={() => onChange('provider')}
          icon={Send}
          title={isRTL ? 'عقود صادرة' : 'Outgoing contracts'}
          subtitle={isRTL ? 'عقود أنشأتها وأرسلتها للطرف الآخر للموافقة' : 'Contracts you issued and sent for the other party to approve'}
          data={agg.provider}
          accent="accent"
        />
        <Card
          side="client"
          active={value === 'client'}
          onClick={() => onChange('client')}
          icon={Inbox}
          title={isRTL ? 'عقود واردة' : 'Incoming contracts'}
          subtitle={isRTL ? 'عقود استلمتها من طرف آخر لمراجعتها والموافقة عليها' : 'Contracts received from another party for your review and approval'}
          data={agg.client}
          accent="primary"
        />
      </div>
    </div>
  );
});