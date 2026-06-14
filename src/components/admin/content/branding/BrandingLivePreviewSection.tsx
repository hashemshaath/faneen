import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';

export interface BrandingLivePreviewSectionProps {
  isRTL: boolean;
}

/**
 * BrandingLivePreviewSection — renders saved branding via the shared
 * `<BrandLogo>` component. Read-only: reflects persisted settings only.
 */
export const BrandingLivePreviewSection: React.FC<BrandingLivePreviewSectionProps> = ({ isRTL }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Eye className="w-4 h-4 text-accent" />
        {isRTL ? 'معاينة مباشرة' : 'Live preview'}
      </CardTitle>
      <CardDescription className="text-xs">
        {isRTL
          ? 'تعكس الإعدادات المحفوظة حالياً (يجب الحفظ لرؤية التعديلات الجديدة).'
          : 'Reflects currently saved settings.'}
      </CardDescription>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-surface-nav p-6 flex items-center justify-center">
        <BrandLogo variant="full" tone="dark" size="navbar" />
      </div>
      <div className="rounded-xl border border-border bg-background p-6 flex items-center justify-center">
        <BrandLogo variant="full" tone="light" size="navbar" />
      </div>
      <div className="rounded-xl border border-border bg-surface-nav p-6 flex items-center justify-center">
        <BrandLogo variant="full" tone="dark" size="footer" />
      </div>
      <div className="rounded-xl border border-border bg-background p-6 flex items-center justify-center">
        <BrandLogo variant="mark" size="mark" />
      </div>
    </CardContent>
  </Card>
);

export default BrandingLivePreviewSection;