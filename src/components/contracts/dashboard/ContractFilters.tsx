import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export type ContractSortKey = 'date' | 'amount' | 'status' | 'health';

interface StatusCounts {
  total: number;
  active: number;
  pendingApproval: number;
  completed: number;
  draft: number;
}

interface ContractFiltersProps {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  sortBy: ContractSortKey;
  onSortChange: (value: ContractSortKey) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  counts: StatusCounts;
  isRTL: boolean;
}

/**
 * Status pills + sort selector + search input for the contracts list.
 * Extracted from DashboardContracts (Phase 2A) — behavior unchanged.
 */
export function ContractFilters({
  statusFilter, onStatusChange,
  sortBy, onSortChange,
  searchQuery, onSearchChange,
  counts, isRTL,
}: ContractFiltersProps) {
  const filters = [
    { key: 'all', label: isRTL ? 'الكل' : 'All', count: counts.total },
    { key: 'active', label: isRTL ? 'نشط' : 'Active', count: counts.active },
    { key: 'pending_approval', label: isRTL ? 'بانتظار' : 'Pending', count: counts.pendingApproval },
    { key: 'completed', label: isRTL ? 'مكتمل' : 'Done', count: counts.completed },
    { key: 'draft', label: isRTL ? 'مسودة' : 'Draft', count: counts.draft },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={isRTL ? 'تصفية حسب الحالة' : 'Filter by status'}>
        {filters.map((f) => {
          const active = statusFilter === f.key;
          return (
            <Button
              key={f.key}
              variant={active ? 'default' : 'outline'}
              size="sm"
              className="text-[10px] gap-1 h-8 px-3 rounded-lg"
              aria-pressed={active}
              onClick={() => onStatusChange(f.key)}
            >
              {f.label}
              <Badge variant={active ? 'outline' : 'secondary'} className="text-[8px] px-1 py-0 h-4 ms-0.5">{f.count}</Badge>
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as ContractSortKey)}>
          <SelectTrigger className="h-8 text-[10px] w-28 px-2.5 rounded-lg" aria-label={isRTL ? 'الترتيب' : 'Sort by'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date" className="text-xs">{isRTL ? 'التاريخ' : 'Date'}</SelectItem>
            <SelectItem value="amount" className="text-xs">{isRTL ? 'المبلغ' : 'Amount'}</SelectItem>
            <SelectItem value="status" className="text-xs">{isRTL ? 'الحالة' : 'Status'}</SelectItem>
            <SelectItem value="health" className="text-xs">{isRTL ? 'الصحة' : 'Health'}</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative sm:max-w-xs w-full">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder={isRTL ? 'بحث بالعنوان، الرقم...' : 'Search title, number...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ps-9 h-8 text-xs rounded-lg"
            aria-label={isRTL ? 'بحث في العقود' : 'Search contracts'}
          />
        </div>
      </div>
    </div>
  );
}