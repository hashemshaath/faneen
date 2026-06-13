import React from 'react';
import { BusinessFiltersToolbar } from '@/components/admin/businesses/BusinessFiltersToolbar';
import { BusinessBulkActionBar } from '@/components/admin/businesses/BusinessBulkActionBar';
import type { TierMeta } from '@/pages/admin/businesses/_shared';

/**
 * BusinessFiltersBar — composes the search/filter toolbar and the
 * bulk-action bar into a single page slot for AdminBusinesses.
 * Pure presentational pass-through; no Supabase calls, no mutations.
 *
 * All handlers are owned by the parent page so business / mutation /
 * security logic stays where it already lives. This component only
 * exists to give the page a single, named filters surface.
 */
interface BusinessFiltersBarProps {
  // — Toolbar wiring —
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchInput: string;
  search: string;
  onSearchInput: (v: string) => void;
  onClearSearch: () => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  selectedTiers: string[];
  onToggleTier: (v: string) => void;
  onClearTiers: () => void;
  filterTranslation: string;
  onTranslationChange: (v: string) => void;
  filterOrigin: string;
  setFilterOrigin: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  tiers: TierMeta[];
  language: 'ar' | 'en';
  isRTL: boolean;
  resultsCount: number;
  onClearAll: () => void;
  tierDistribution: Record<string, number>;
  totalCount: number;

  // — Bulk wiring —
  selectedCount: number;
  onBulkSetActive: (active: boolean) => void;
  onBulkSetVerified: (verified: boolean) => void;
  onBulkChangeTier: (tier: string) => void | Promise<void>;
  onBulkClear: () => void;
}

export const BusinessFiltersBar: React.FC<BusinessFiltersBarProps> = (props) => {
  return (
    <div className="space-y-3" data-testid="business-filters-bar">
      <BusinessFiltersToolbar
        searchInputRef={props.searchInputRef}
        searchInput={props.searchInput}
        search={props.search}
        onSearchInput={props.onSearchInput}
        onClearSearch={props.onClearSearch}
        filterStatus={props.filterStatus}
        setFilterStatus={props.setFilterStatus}
        selectedTiers={props.selectedTiers}
        onToggleTier={props.onToggleTier}
        onClearTiers={props.onClearTiers}
        filterTranslation={props.filterTranslation}
        onTranslationChange={props.onTranslationChange}
        filterOrigin={props.filterOrigin}
        setFilterOrigin={props.setFilterOrigin}
        sortBy={props.sortBy}
        setSortBy={props.setSortBy}
        tiers={props.tiers}
        language={props.language}
        isRTL={props.isRTL}
        resultsCount={props.resultsCount}
        onClearAll={props.onClearAll}
        tierDistribution={props.tierDistribution}
        totalCount={props.totalCount}
      />
      <BusinessBulkActionBar
        count={props.selectedCount}
        language={props.language}
        isRTL={props.isRTL}
        tiers={props.tiers}
        onSetActive={props.onBulkSetActive}
        onSetVerified={props.onBulkSetVerified}
        onChangeTier={props.onBulkChangeTier}
        onClear={props.onBulkClear}
      />
    </div>
  );
};

export default BusinessFiltersBar;