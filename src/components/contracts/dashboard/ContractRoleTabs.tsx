import { Inbox, LayoutGrid, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type ContractRoleFilter = 'all' | 'provider' | 'client';

interface ContractRoleTabsProps {
  value: ContractRoleFilter;
  onChange: (value: ContractRoleFilter) => void;
  counts: { all: number; provider: number; client: number };
  isRTL: boolean;
}

/**
 * Presentational role-scope tab strip for the contracts list.
 * Extracted from DashboardContracts (Phase 2A) — behavior unchanged.
 */
export function ContractRoleTabs({ value, onChange, counts, isRTL }: ContractRoleTabsProps) {
  const tabs = [
    { key: 'all' as const, label: isRTL ? 'الكل' : 'All', count: counts.all, icon: LayoutGrid,
      hint: isRTL ? 'جميع العقود' : 'All contracts' },
    { key: 'provider' as const, label: isRTL ? 'صادرة' : 'Outgoing', count: counts.provider, icon: Send,
      hint: isRTL ? 'عقود أنشأتها وأرسلتها للطرف الآخر للموافقة' : 'Contracts you issued and sent for approval' },
    { key: 'client' as const, label: isRTL ? 'واردة' : 'Incoming', count: counts.client, icon: Inbox,
      hint: isRTL ? 'عقود استلمتها من طرف آخر للموافقة عليها' : 'Contracts received from another party for your approval' },
  ];
  return (
    <div
      className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/30 w-fit"
      role="tablist"
      aria-label={isRTL ? 'نطاق العقود' : 'Contracts scope'}
    >
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            title={tab.hint}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />
            {tab.label}
            <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4">{tab.count}</Badge>
          </button>
        );
      })}
    </div>
  );
}