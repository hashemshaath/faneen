import React from 'react';
import { Palette } from 'lucide-react';

export interface BrandingOverviewSectionProps {
  isRTL: boolean;
}

/**
 * BrandingOverviewSection — header card summarising the Branding hub.
 * Presentational only; receives no data and performs no mutations.
 */
export const BrandingOverviewSection: React.FC<BrandingOverviewSectionProps> = ({ isRTL }) => (
  <div>
    <h1 className="text-2xl font-bold flex items-center gap-2">
      <Palette className="w-6 h-6 text-accent" />
      {isRTL ? 'العلامة التجارية والشعار' : 'Branding & Logo'}
    </h1>
    <p className="text-sm text-muted-foreground mt-1">
      {isRTL
        ? 'تحكم بصور الشعار وحجم ظهوره في كل قسم من المنصة'
        : 'Control logo images and their size across every section'}
    </p>
  </div>
);

export default BrandingOverviewSection;