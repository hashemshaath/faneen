import React from 'react';
import { ContentFiltersBar } from '@/components/admin/content';
import type { AdminFilterPill } from '@/components/admin/AdminFiltersBar';

export interface PrivateSectorsFiltersBarProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  pills: AdminFilterPill[];
  activePill: string;
  onPillSelect: (key: string) => void;
  canReset?: boolean;
  onReset?: () => void;
  resetLabel?: string;
}

export const PrivateSectorsFiltersBar: React.FC<PrivateSectorsFiltersBarProps> = (props) => (
  <ContentFiltersBar
    searchValue={props.searchValue}
    onSearchChange={props.onSearchChange}
    searchPlaceholder={props.searchPlaceholder}
    pills={props.pills}
    activePill={props.activePill}
    onPillSelect={props.onPillSelect}
    canReset={props.canReset}
    onReset={props.onReset}
    resetLabel={props.resetLabel}
  />
);

export default PrivateSectorsFiltersBar;