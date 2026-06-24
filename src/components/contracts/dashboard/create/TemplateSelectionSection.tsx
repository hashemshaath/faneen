/**
 * Phase 3D — Presentational template selector.
 * Pure UI: parent owns publishedVersions, effectiveVersion, and the
 * allowed-pricing-method derivations. No queries here. No legal metadata
 * is exposed — only public fields (name, version, category, pricing methods,
 * required field count) already passed in via PublishedTemplateOption.
 */
import React from 'react';
import { BookOpen } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { filterTemplatesBySector, getWorkTypeLabel, type WorkTypeKey } from '@/lib/contract-work-types';

export interface PublishedTemplateOption {
  version_id: string;
  version_number: number;
  name_ar: string;
  name_en: string | null;
  category: string;
  slug?: string;
  pricing_methods: string[];
  required_field_count: number;
}

interface CategoryConfigEntry { ar: string; en: string }

interface Props {
  isRTL: boolean;
  publishedVersions: PublishedTemplateOption[];
  effectiveVersion: PublishedTemplateOption | null;
  selectedPricingMethod: string | null;
  templateCategoryConfig: Record<string, CategoryConfigEntry>;
  onSelectVersion: (versionId: string) => void;
  onSelectPricingMethod: (method: string | null) => void;
  /** Phase D — selected sector / work type drives template filtering. */
  selectedWorkType?: WorkTypeKey | null;
  /** Phase D — whether the user has explicitly picked a sector. */
  sectorTouched?: boolean;
}

export const TemplateSelectionSection: React.FC<Props> = ({
  isRTL, publishedVersions, effectiveVersion, selectedPricingMethod,
  templateCategoryConfig, onSelectVersion, onSelectPricingMethod,
  selectedWorkType = null, sectorTouched = false,
}) => {
  // Phase D — surface sector / no-match guidance instead of silently rendering nothing.
  const sectorProvided = !!selectedWorkType && sectorTouched;
  const filtered = filterTemplatesBySector(selectedWorkType ?? null, sectorTouched, publishedVersions);
  const sectorLabel = sectorProvided ? getWorkTypeLabel(selectedWorkType, isRTL) : null;

  if (!sectorProvided) {
    return (
      <div
        data-testid="contract-template-section-no-sector"
        className="p-4 rounded-xl border border-warning/40 bg-warning/5 text-[11px] flex items-start gap-2"
      >
        <BookOpen className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
        <span>{isRTL ? 'اختر المجال أولًا لعرض قوالب العقد المناسبة' : 'Select a sector first to see matching contract templates'}</span>
      </div>
    );
  }

  if (publishedVersions.length === 0 || filtered.length === 0) {
    return (
      <div
        data-testid="contract-template-section-no-match"
        className="p-4 rounded-xl border border-warning/40 bg-warning/5 text-[11px] flex items-start gap-2"
      >
        <BookOpen className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
        <span>
          {isRTL
            ? `لا يوجد قالب عقد متاح لهذا المجال حاليًا${sectorLabel ? ` (${sectorLabel})` : ''}`
            : `No contract template is available for this sector yet${sectorLabel ? ` (${sectorLabel})` : ''}`}
        </span>
      </div>
    );
  }
  return (
    <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3">
      <div className="flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-primary" />
        <Label className="text-xs font-semibold">{isRTL ? 'قالب العقد الرسمي' : 'Official Contract Template'}</Label>
        {effectiveVersion && (
          <Badge variant="secondary" className="text-[9px] gap-0.5">v{effectiveVersion.version_number}</Badge>
        )}
        {sectorLabel && (
          <Badge variant="outline" className="text-[9px]" data-testid="contract-template-sector-badge">
            {(isRTL ? 'المجال: ' : 'Sector: ') + sectorLabel}
          </Badge>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {isRTL ? 'يتم عرض القوالب المناسبة للمجال المختار فقط.' : 'Only templates matching the selected sector are shown.'}
      </p>
      <Select
        value={effectiveVersion?.version_id ?? ''}
        onValueChange={(v) => onSelectVersion(v)}
      >
        <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {filtered.map(v => {
            const cfg = templateCategoryConfig[v.category];
            const label = isRTL ? v.name_ar : (v.name_en || v.name_ar);
            const catLabel = cfg ? cfg[isRTL ? 'ar' : 'en'] : v.category;
            return (
              <SelectItem key={v.version_id} value={v.version_id} className="text-xs">
                {label} · {catLabel} · v{v.version_number}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {effectiveVersion && effectiveVersion.pricing_methods.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">{isRTL ? 'طريقة التسعير' : 'Pricing Method'}</Label>
          <Select value={selectedPricingMethod ?? ''} onValueChange={(v) => onSelectPricingMethod(v || null)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={isRTL ? 'اختياري' : 'Optional'} /></SelectTrigger>
            <SelectContent>
              {effectiveVersion.pricing_methods.map(m => (
                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {effectiveVersion && effectiveVersion.required_field_count > 0 && (
        <p className="text-[10px] text-warning bg-warning/10 border border-warning/20 rounded-lg p-2">
          {isRTL
            ? `هذا القالب يحتوي على ${effectiveVersion.required_field_count} حقل مطلوب سيتم دعمها بالكامل في CT5.`
            : `This template has ${effectiveVersion.required_field_count} required fields — full support arrives in CT5.`}
        </p>
      )}
    </div>
  );
};

export default TemplateSelectionSection;