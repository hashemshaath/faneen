import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { pickBi } from '@/components/common/Bilingual';

interface ComingNextTabProps {
  icon: React.ElementType;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isRTL: boolean;
}

/**
 * Empty-state for control-center tabs that ship in Phase 2.
 * Renders the planned scope only — never fake data, never fake numbers.
 */
export const ComingNextTab: React.FC<ComingNextTabProps> = ({
  icon: Icon, titleAr, titleEn, descriptionAr, descriptionEn, isRTL,
}) => (
  <Card className="rounded-3xl border-dashed border-border/70 bg-card/40">
    <CardContent className="p-8 md:p-12 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-heading text-base font-bold">
        {pickBi(isRTL, titleAr, titleEn)}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        {pickBi(isRTL, descriptionAr, descriptionEn)}
      </p>
      <p className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground/80">
        {pickBi(isRTL, 'سيتم تنظيمه في المرحلة 2', 'Ships in phase 2')}
      </p>
    </CardContent>
  </Card>
);

export default ComingNextTab;