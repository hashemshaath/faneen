import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, Sparkles } from 'lucide-react';
import { validateHexColor } from '@/lib/theme/brandThemeUtils';
import { BRAND_COLORS } from '@/config/brandTheme';
import type { AdminColorField, AdminColorState, ColorSectionDef } from './types';

export interface BrandingColorTokensSectionProps {
  isRTL: boolean;
  theme: AdminColorState;
  errors: Partial<Record<AdminColorField, string>>;
  sections: ColorSectionDef[];
  onChange: (field: AdminColorField, value: string) => void;
  onResetBrand: () => void;
  resetPending: boolean;
}

/**
 * BrandingColorTokensSection — renders the Brand / Neutral / Status
 * color-token grids. Pure presentational + callbacks; token validation,
 * persistence and theme application stay in the parent page.
 */
export const BrandingColorTokensSection: React.FC<BrandingColorTokensSectionProps> = ({
  isRTL,
  theme,
  errors,
  sections,
  onChange,
  onResetBrand,
  resetPending,
}) => (
  <>
    {sections.map((section) => (
      <Card key={section.title_en}>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-accent" />
              {isRTL ? section.title_ar : section.title_en}
            </CardTitle>
            <CardDescription className="text-xs">
              {isRTL
                ? 'تُطبَّق فوراً بعد الحفظ. الافتراضي من قطاعات v1.0.'
                : 'Applied right after Save. Defaults from Qitaat v1.0.'}
            </CardDescription>
          </div>
          {section.isBrand && (
            <Button variant="outline" size="sm" onClick={onResetBrand} disabled={resetPending}>
              {resetPending ? (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              ) : (
                <Sparkles className="w-4 h-4 me-2" />
              )}
              {isRTL ? 'استعادة هوية قطاعات v1.0' : 'Reset to Qitaat Brand v1.0'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {section.group.map((f) => {
            const value = theme[f.key];
            const valid = validateHexColor(value);
            const error = errors[f.key];
            return (
              <div key={f.key} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Label className="text-sm block truncate">{isRTL ? f.ar : f.en}</Label>
                    <p className="text-[11px] text-muted-foreground truncate">{f.desc}</p>
                  </div>
                  <div
                    className="w-9 h-9 rounded-lg border border-border shrink-0"
                    style={{ background: valid ? value : 'transparent' }}
                    aria-hidden="true"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={valid ? value : BRAND_COLORS.text}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className="h-10 w-12 rounded-lg border border-border cursor-pointer bg-background"
                    aria-label={f.en}
                  />
                  <Input
                    value={value}
                    dir="ltr"
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className="h-10 tech-content text-xs uppercase"
                    placeholder={BRAND_COLORS.primary}
                  />
                </div>
                {error && <p className="text-[11px] text-destructive">{error}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>
    ))}
  </>
);

export default BrandingColorTokensSection;