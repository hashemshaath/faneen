import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import type { BrandingConfig, ImageFieldKey } from './types';

interface FieldMeta {
  ar: string;
  en: string;
  desc: string;
}

export interface BrandingLogoAssetsSectionProps {
  isRTL: boolean;
  values: BrandingConfig;
  meta: Record<ImageFieldKey, FieldMeta>;
  uploadingFor: ImageFieldKey | null;
  onUrlChange: (field: ImageFieldKey, value: string) => void;
  onUpload: (field: ImageFieldKey) => void;
}

const FIELDS: Array<{ field: ImageFieldKey; previewBg: 'light' | 'dark' }> = [
  { field: 'fullLightUrl', previewBg: 'light' },
  { field: 'fullDarkUrl', previewBg: 'dark' },
  { field: 'markUrl', previewBg: 'light' },
];

/**
 * BrandingLogoAssetsSection — renders the three logo cards (light/dark
 * full + mark). Pure display + callbacks. Upload + URL persistence remain
 * in the parent page.
 */
export const BrandingLogoAssetsSection: React.FC<BrandingLogoAssetsSectionProps> = ({
  isRTL,
  values,
  meta,
  uploadingFor,
  onUrlChange,
  onUpload,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {FIELDS.map(({ field, previewBg }) => {
      const m = meta[field];
      return (
        <Card key={field} className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-accent" />
              {isRTL ? m.ar : m.en}
            </CardTitle>
            <CardDescription className="text-xs">{m.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={`flex items-center justify-center rounded-xl border border-border h-28 ${
                previewBg === 'dark' ? 'bg-surface-nav' : 'bg-muted/40'
              }`}
            >
              {values[field] ? (
                <img
                  src={values[field]}
                  alt="preview"
                  className="max-h-20 max-w-[80%] object-contain"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="text-xs text-muted-foreground">{isRTL ? 'لا يوجد' : 'None'}</span>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? 'رابط الصورة' : 'Image URL'}</Label>
              <Input
                value={values[field]}
                dir="ltr"
                onChange={(e) => onUrlChange(field, e.target.value)}
                className="h-10 tech-content text-xs"
                placeholder="https://..."
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full h-10"
              onClick={() => onUpload(field)}
              disabled={uploadingFor === field}
            >
              {uploadingFor === field ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <Upload className="w-4 h-4 me-2" />
              )}
              {isRTL ? 'رفع صورة جديدة' : 'Upload new image'}
            </Button>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default BrandingLogoAssetsSection;