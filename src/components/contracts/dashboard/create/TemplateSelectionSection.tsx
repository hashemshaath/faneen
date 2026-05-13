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
}

export const TemplateSelectionSection: React.FC<Props> = ({
  isRTL, publishedVersions, effectiveVersion, selectedPricingMethod,
  templateCategoryConfig, onSelectVersion, onSelectPricingMethod,
}) => {
  if (publishedVersions.length === 0) return null;
  return (
    <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3">
      <div className="flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-primary" />
        <Label className="text-xs font-semibold">{isRTL ? 'قالب العقد الرسمي' : 'Official Contract Template'}</Label>
        {effectiveVersion && (
          <Badge variant="secondary" className="text-[9px] gap-0.5">v{effectiveVersion.version_number}</Badge>
        )}
      </div>
      <Select
        value={effectiveVersion?.version_id ?? ''}
        onValueChange={(v) => onSelectVersion(v)}
      >
        <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {publishedVersions.map(v => {
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