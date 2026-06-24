/**
 * Phase 3D — Presentational template selector.
 * Pure UI: parent owns publishedVersions, effectiveVersion, and the
 * allowed-pricing-method derivations. No queries here. No legal metadata
 * is exposed — only public fields (name, version, category, pricing methods,
 * required field count) already passed in via PublishedTemplateOption.
 */
import React, { useState } from 'react';
import { BookOpen, PlusCircle, LayoutGrid, Check, ChevronsUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
  /** Allow admins to jump directly to template authoring. */
  isAdmin?: boolean;
}

export const TemplateSelectionSection: React.FC<Props> = ({
  isRTL, publishedVersions, effectiveVersion, selectedPricingMethod,
  templateCategoryConfig, onSelectVersion, onSelectPricingMethod,
  selectedWorkType = null, sectorTouched = false,
  isAdmin = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
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
    const hasAnyTemplate = publishedVersions.length > 0;
    const grouped = (() => {
      const map = new Map<string, PublishedTemplateOption[]>();
      for (const v of publishedVersions) {
        const key = v.category || 'other';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(v);
      }
      return Array.from(map.entries());
    })();
    return (
      <div
        data-testid="contract-template-section-no-match"
        className="p-4 rounded-xl border border-warning/40 bg-warning/5 text-[11px] space-y-3"
      >
        <div className="flex items-start gap-2">
          <BookOpen className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
          <span>
            {isRTL
              ? `لا يوجد قالب مخصص لهذا المجال${sectorLabel ? ` (${sectorLabel})` : ''}${hasAnyTemplate ? '. اضغط على "اختيار قالب" لاستعراض القوالب المتاحة مصنّفة.' : ''}`
              : `No template is specialized for this sector${sectorLabel ? ` (${sectorLabel})` : ''}${hasAnyTemplate ? '. Click "Choose template" to browse available templates by category.' : ''}`}
          </span>
        </div>
        {hasAnyTemplate && !showPicker && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="default" className="h-7 text-[11px] gap-1" onClick={() => setShowPicker(true)} data-testid="contract-template-open-picker">
              <LayoutGrid className="w-3.5 h-3.5" />
              {isRTL ? 'اختيار قالب' : 'Choose template'}
            </Button>
          </div>
        )}
        {hasAnyTemplate && showPicker && (
          <div className="space-y-3 rounded-lg border border-border/40 bg-background p-3" data-testid="contract-template-picker">
            {grouped.map(([cat, items]) => {
              const cfg = templateCategoryConfig[cat];
              const catLabel = cfg ? cfg[isRTL ? 'ar' : 'en'] : cat;
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[9px]">{catLabel}</Badge>
                    <span className="text-[10px] text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {items.map(v => {
                      const label = isRTL ? v.name_ar : (v.name_en || v.name_ar);
                      const selected = effectiveVersion?.version_id === v.version_id;
                      return (
                        <button
                          key={v.version_id}
                          type="button"
                          onClick={() => { onSelectVersion(v.version_id); setShowPicker(false); }}
                          className={`text-start text-[11px] rounded-md border px-2.5 py-2 transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/40 hover:bg-muted/40'}`}
                        >
                          <div className="font-medium truncate">{label}</div>
                          <div className="text-[9px] text-muted-foreground">v{v.version_number}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="default" className="h-7 text-[11px] gap-1">
              <Link to="/admin/contracts?tab=templates" data-testid="contract-template-add-cta">
                <PlusCircle className="w-3.5 h-3.5" />
                {isRTL ? 'إضافة قالب' : 'Add template'}
              </Link>
            </Button>
          </div>
        )}
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
      <TemplateSearchPicker
        isRTL={isRTL}
        options={filtered}
        allOptions={publishedVersions}
        effectiveVersion={effectiveVersion}
        templateCategoryConfig={templateCategoryConfig}
        onSelectVersion={onSelectVersion}
      />
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