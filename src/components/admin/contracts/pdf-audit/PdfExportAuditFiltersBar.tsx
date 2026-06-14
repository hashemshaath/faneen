import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { PDF_AUDIT_SOURCE_KEYS, PDF_AUDIT_SOURCE_LABEL, PDF_AUDIT_STATUS_KEYS } from './types';

export interface PdfExportAuditFiltersBarProps {
  isRTL: boolean;
  searchInput: string;
  sourceFilter: string;
  statusFilter: string;
  tplVersionFilter: string;
  dateFrom: string;
  dateTo: string;
  onSearchInputChange: (v: string) => void;
  onSubmitSearch: (e: React.FormEvent) => void;
  onSourceChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onTplVersionChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onReset: () => void;
}

export const PdfExportAuditFiltersBar: React.FC<PdfExportAuditFiltersBarProps> = ({
  isRTL, searchInput, sourceFilter, statusFilter, tplVersionFilter, dateFrom, dateTo,
  onSearchInputChange, onSubmitSearch, onSourceChange, onStatusChange,
  onTplVersionChange, onDateFromChange, onDateToChange, onReset,
}) => {
  return (
    <Card>
      <CardContent className="p-3 md:p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <form onSubmit={onSubmitSearch} className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground start-2" />
            <Input
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              placeholder={isRTL ? 'بحث (رقم العقد، #هاش، قالب، مُصدِّر...)' : 'Search (contract #, hash, template, exporter...)'}
              className="h-9 text-xs ps-7"
              dir="auto"
            />
          </form>

          <Select value={sourceFilter} onValueChange={onSourceChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={isRTL ? 'المصدر' : 'Source'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل المصادر' : 'All sources'}</SelectItem>
              {PDF_AUDIT_SOURCE_KEYS.map((s) => (
                <SelectItem key={s} value={s}>{isRTL ? PDF_AUDIT_SOURCE_LABEL[s].ar : PDF_AUDIT_SOURCE_LABEL[s].en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={isRTL ? 'حالة العقد' : 'Contract status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRTL ? 'كل الحالات' : 'All statuses'}</SelectItem>
              {PDF_AUDIT_STATUS_KEYS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number" min={1} inputMode="numeric"
            value={tplVersionFilter}
            onChange={(e) => onTplVersionChange(e.target.value)}
            placeholder={isRTL ? 'إصدار القالب' : 'Template version'}
            className="h-9 text-xs"
            dir="ltr"
          />

          <Input
            type="date" value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-9 text-xs"
            dir="ltr"
          />
          <Input
            type="date" value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-9 text-xs"
            dir="ltr"
          />

          <Button variant="ghost" size="sm" className="h-9 text-xs justify-self-start" onClick={onReset}>
            {isRTL ? 'إعادة الضبط' : 'Reset'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};