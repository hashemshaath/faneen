import React from 'react';
import { PlanFeatureMatrix } from './PlanFeatureMatrix';

interface FeatureComparisonTableProps {
  isRTL: boolean;
}

/**
 * Public membership comparison table.
 * Thin wrapper around the centralized PlanFeatureMatrix.
 */
export const FeatureComparisonTable = ({ isRTL }: FeatureComparisonTableProps) => {
  return (
    <div className="max-w-5xl mx-auto mt-12 sm:mt-16">
      <PlanFeatureMatrix
        isRTL={isRTL}
        caption={
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-center mb-6">
            {isRTL ? 'مقارنة تفصيلية للمميزات' : 'Detailed Feature Comparison'}
          </h2>
        }
      />
    </div>
  );
};
