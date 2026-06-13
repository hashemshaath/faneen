import React from 'react';
import { pickBi } from '@/components/common/Bilingual';

/** Phase 5D — Empty state for the branches tab. Presentational only. */
export interface BusinessBranchesEmptyStateProps {
  isRTL: boolean;
}

export const BusinessBranchesEmptyState: React.FC<BusinessBranchesEmptyStateProps> = ({ isRTL }) => (
  <p className="text-center text-sm text-muted-foreground py-6">
    {pickBi(isRTL, 'لا توجد فروع مسجلة', 'No branches registered')}
  </p>
);

export default BusinessBranchesEmptyState;