import { Search, LayoutGrid, List, Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export type ContractSortKey = 'date' | 'amount' | 'status' | 'health';
export type ContractViewMode = 'cards' | 'compact';

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
  viewMode?: ContractViewMode;
  onViewModeChange?: (value: ContractViewMode) => void;
  onExport?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  searchInputRef?: React.Ref<HTMLInputElement>;
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
  viewMode, onViewModeChange, onExport, onExportExcel, onExportPdf, searchInputRef,
}: ContractFiltersProps) {
  const filters = [
    { key: 'all', label: isRTL ? 'الكل' : 'All', count: counts.total },
    { key: 'active', label: isRTL ? 'نشط' : 'Active', count: counts.active },
    { key: 'pending_approval', label: isRTL ? 'بانتظار' : 'Pending', count: counts.pendingApproval },
    { key: 'completed', label: isRTL ? 'مكتمل' : 'Done', count: counts.completed },
    { key: 'draft', label: isRTL ? 'مسودة' : 'Draft', count: counts.draft },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={searchInputRef}
            placeholder={isRTL ? 'بحث بالعنوان، الرقم...' : 'Search title, number...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ps-9 h-9 text-xs rounded-lg bg-background/60 focus-visible:bg-background"
            aria-label={isRTL ? 'بحث في العقود' : 'Search contracts'}
          />
          {!searchQuery && (
            <kbd className="hidden sm:inline-flex absolute end-2 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 h-5 text-[9px] text-muted-foreground bg-muted/60 border border-border/40 rounded">
              /
            </kbd>
          )}
        </div>
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as ContractSortKey)}>
          <SelectTrigger className="h-9 text-[11px] w-32 px-2.5 rounded-lg shrink-0" aria-label={isRTL ? 'الترتيب' : 'Sort by'}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date" className="text-xs">{isRTL ? 'الأحدث' : 'Date'}</SelectItem>
            <SelectItem value="amount" className="text-xs">{isRTL ? 'المبلغ' : 'Amount'}</SelectItem>
            <SelectItem value="status" className="text-xs">{isRTL ? 'الحالة' : 'Status'}</SelectItem>
            <SelectItem value="health" className="text-xs">{isRTL ? 'الصحة' : 'Health'}</SelectItem>
          </SelectContent>
        </Select>
        {onViewModeChange && (
          <div className="hidden sm:inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-border/50 bg-muted/40 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('cards')}
              aria-pressed={viewMode === 'cards'}
              aria-label={isRTL ? 'عرض البطاقات' : 'Cards view'}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('compact')}
              aria-pressed={viewMode === 'compact'}
              aria-label={isRTL ? 'عرض مضغوط' : 'Compact view'}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'compact' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
        {(onExport || onExportExcel || onExportPdf) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2.5 gap-1 text-[11px] rounded-lg shrink-0 hidden md:inline-flex"
                aria-label={isRTL ? 'تصدير' : 'Export'}
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isRTL ? 'تصدير' : 'Export'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground">
                {isRTL ? 'تصدير القائمة' : 'Export list'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onExportExcel && (
                <DropdownMenuItem onClick={onExportExcel} className="text-xs gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                  Excel (.xlsx)
                </DropdownMenuItem>
              )}
              {onExport && (
                <DropdownMenuItem onClick={onExport} className="text-xs gap-2">
                  <FileJson className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                  CSV
                </DropdownMenuItem>
              )}
              {onExportPdf && (
                <DropdownMenuItem onClick={onExportPdf} className="text-xs gap-2">
                  <FileText className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />
                  PDF
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div
        className="flex flex-nowrap sm:flex-wrap gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5"
        role="group"
        aria-label={isRTL ? 'تصفية حسب الحالة' : 'Filter by status'}
      >
        {filters.map((f) => {
          const active = statusFilter === f.key;
          return (
            <Button
              key={f.key}
              variant={active ? 'default' : 'outline'}
              size="sm"
              className={`text-[11px] gap-1 h-8 px-3 rounded-full shrink-0 transition-all ${active ? 'shadow-sm shadow-accent/20' : 'hover:border-accent/40'}`}
              aria-pressed={active}
              onClick={() => onStatusChange(f.key)}
            >
              {f.label}
              <Badge variant={active ? 'outline' : 'secondary'} className="text-[8px] px-1 py-0 h-4 ms-0.5">{f.count}</Badge>
            </Button>
          );
        })}
      </div>
    </div>
  );
}