/**
 * Advanced filters bar for AdminProviderLeads — status pills, city
 * select, completeness range, sort, and a free-text search.
 * Pure UI — state lives in the parent page.
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Download, X } from 'lucide-react';
import { Bi } from '@/components/common/Bilingual';
import type { ProviderLeadStatus } from '@/modules/providers';
import { STATUS_LABEL, STATUS_ORDER, STATUS_TONE } from './providerLeadHelpers';

export type SortKey = 'newest' | 'oldest' | 'completeness_desc' | 'completeness_asc' | 'name';

interface Props {
  status: ProviderLeadStatus | 'all';
  onStatus: (s: ProviderLeadStatus | 'all') => void;
  city: string | 'all';
  onCity: (c: string | 'all') => void;
  cities: string[];
  minCompleteness: number;
  onMinCompleteness: (n: number) => void;
  search: string;
  onSearch: (s: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
  totalCount: number;
  filteredCount: number;
  statusCounts: Record<ProviderLeadStatus | 'all', number>;
}

export const ProviderLeadsFilters: React.FC<Props> = (p) => {
  const hasFilter =
    p.status !== 'all' ||
    p.city !== 'all' ||
    p.minCompleteness > 0 ||
    p.search.trim().length > 0;

  const clearAll = () => {
    p.onStatus('all');
    p.onCity('all');
    p.onMinCompleteness(0);
    p.onSearch('');
  };

  return (
    <div className="mb-5 space-y-3">
      {/* Search + actions row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={p.search}
            onChange={(e) => p.onSearch(e.target.value)}
            placeholder="بحث بالاسم، البريد، الجوال، السجل التجاري…"
            className="h-10 rounded-xl ps-9"
          />
        </div>
        <select
          value={p.sort}
          onChange={(e) => p.onSort(e.target.value as SortKey)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          aria-label="Sort"
        >
          <option value="newest">الأحدث أولاً</option>
          <option value="oldest">الأقدم أولاً</option>
          <option value="completeness_desc">الأكثر اكتمالاً</option>
          <option value="completeness_asc">الأقل اكتمالاً</option>
          <option value="name">الاسم</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={p.onExport}
          className="h-10 rounded-xl"
          disabled={p.filteredCount === 0}
        >
          <Download className="me-1.5 h-4 w-4" aria-hidden />
          <Bi ar="تصدير CSV" en="Export CSV" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={p.onRefresh}
          disabled={p.loading}
          className="h-10 w-10 rounded-xl"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${p.loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => p.onStatus('all')}
          className={`rounded-xl border px-3 py-1.5 text-xs transition ${
            p.status === 'all'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-background hover:bg-muted'
          }`}
        >
          <Bi ar="الكل" en="All" /> · {p.statusCounts.all}
        </button>
        {STATUS_ORDER.map((s) => {
          const active = p.status === s;
          return (
            <button
              key={s}
              onClick={() => p.onStatus(s)}
              className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                active ? STATUS_TONE[s] + ' font-semibold' : 'bg-background hover:bg-muted'
              }`}
            >
              {STATUS_LABEL[s].ar} · {p.statusCounts[s]}
            </button>
          );
        })}
      </div>

      {/* Secondary filters: city + completeness */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-2.5">
        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">المدينة:</span>
          <select
            value={p.city}
            onChange={(e) => p.onCity(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
          >
            <option value="all">الكل</option>
            {p.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">حد أدنى للاكتمال:</span>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={p.minCompleteness}
            onChange={(e) => p.onMinCompleteness(Number(e.target.value))}
            className="accent-primary"
          />
          <span className="tech-content w-9 text-end font-semibold">{p.minCompleteness}%</span>
        </label>
        <Badge variant="outline" className="ms-auto text-[11px]">
          {p.filteredCount} / {p.totalCount}
        </Badge>
        {hasFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 rounded-lg text-[11px]"
          >
            <X className="me-1 h-3 w-3" aria-hidden />
            مسح الفلاتر
          </Button>
        )}
      </div>
    </div>
  );
};