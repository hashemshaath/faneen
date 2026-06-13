import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Building2, X } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import {
  BusinessTableView,
  type BusinessTableRow,
} from '@/pages/admin/businesses/BusinessTableView';
import {
  BusinessCardView,
  type BusinessCardRow,
} from '@/pages/admin/businesses/BusinessCardView';
import type { AllServicesById } from '@/pages/admin/businesses/BusinessCardView';

/**
 * BusinessTableSection — single switcher for the AdminBusinesses list
 * body: loading skeletons, empty state, table view, or card view.
 *
 * Pure presentational — all data + handlers are owned by the parent
 * page. No Supabase queries, no mutations, no sensitive-field reads.
 */
interface BusinessTableSectionProps {
  isLoading: boolean;
  filteredLength: number;
  paged: ReadonlyArray<Record<string, unknown>>;
  viewMode: 'cards' | 'table';
  language: string;
  isRTL: boolean;

  // selection
  selected: Set<string>;
  allPagedSelected: boolean;
  toggleSelect: (id: string) => void;
  togglePageAll: () => void;

  // helpers
  translationCompleteness: (b: BusinessTableRow) => { ar: boolean; en: boolean; full: boolean };
  contractBusinessIds: ReadonlyArray<string>;
  allServices: AllServicesById;

  // table/card row callbacks
  onEdit: (b: Record<string, unknown>) => void;
  onOpenServices: (id: string) => void;
  onView: (b: BusinessTableRow) => void;
  onTierChange: (id: string, tier: string) => void;
  onApprovalChange: (id: string, status: string) => void;
  onVerifyToggle: (id: string, name: string, currentVerified: boolean) => void;
  onActiveToggle: (id: string, currentActive: boolean) => void;

  // empty-state filters cue
  hasActiveFilters: boolean;
  onClearFilters: () => void;

  // card-view pagination metadata
  safePage: number;
  pageSize: number;
}

export const BusinessTableSection: React.FC<BusinessTableSectionProps> = ({
  isLoading, filteredLength, paged, viewMode, language, isRTL,
  selected, allPagedSelected, toggleSelect, togglePageAll,
  translationCompleteness, contractBusinessIds, allServices,
  onEdit, onOpenServices, onView, onTierChange, onApprovalChange,
  onVerifyToggle, onActiveToggle,
  hasActiveFilters, onClearFilters,
  safePage, pageSize,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="business-table-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (filteredLength === 0) {
    return (
      <div
        className="rounded-2xl border border-border/30 bg-card p-12 text-center"
        data-testid="business-table-empty"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-accent/30" />
        </div>
        <p className="font-heading font-bold text-sm mb-1">
          {pickBi(isRTL, 'لا توجد نتائج', 'No results found')}
        </p>
        <p className="text-xs text-muted-foreground">
          {pickBi(isRTL, 'جرّب تعديل معايير البحث', 'Try adjusting your search criteria')}
        </p>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5 rounded-xl"
            onClick={onClearFilters}
          >
            <X className="w-3.5 h-3.5" />
            {pickBi(isRTL, 'مسح الفلاتر', 'Clear Filters')}
          </Button>
        )}
      </div>
    );
  }

  if (viewMode === 'table') {
    return (
      <BusinessTableView
        rows={paged as unknown as BusinessTableRow[]}
        language={language}
        isRTL={isRTL}
        selected={selected}
        allPagedSelected={allPagedSelected}
        toggleSelect={toggleSelect}
        togglePageAll={togglePageAll}
        translationCompleteness={(b) => translationCompleteness(b)}
        onEdit={(b) => onEdit(b as unknown as Record<string, unknown>)}
        onOpenServices={onOpenServices}
        onView={onView}
        contractBusinessIds={contractBusinessIds}
      />
    );
  }

  return (
    <BusinessCardView
      rows={paged as unknown as BusinessCardRow[]}
      language={language}
      isRTL={isRTL}
      selected={selected}
      allPagedSelected={allPagedSelected}
      toggleSelect={toggleSelect}
      togglePageAll={togglePageAll}
      translationCompleteness={(b) => translationCompleteness(b)}
      contractBusinessIds={contractBusinessIds}
      allServices={allServices}
      onEdit={(b) => onEdit(b as unknown as Record<string, unknown>)}
      onOpenServices={onOpenServices}
      onTierChange={onTierChange}
      onApprovalChange={onApprovalChange}
      onVerifyToggle={onVerifyToggle}
      onActiveToggle={onActiveToggle}
      safePage={safePage}
      pageSize={pageSize}
      filteredLength={filteredLength}
    />
  );
};

export default BusinessTableSection;