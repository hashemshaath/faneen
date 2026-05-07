import { useMemo } from 'react';
import {
  Building2, Wrench, TreePine, ChefHat, Square, ShieldCheck,
  PaintBucket, LayoutGrid, Flame, HardHat, PencilRuler, Ruler, Settings2,
  Check,
} from 'lucide-react';
import { ONBOARDING_SECTORS, type SectorId, getSectorById } from '@/data/onboarding-sectors';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const ICONS = {
  Building2, Wrench, TreePine, ChefHat, Square, ShieldCheck,
  PaintBucket, LayoutGrid, Flame, HardHat, PencilRuler, Ruler, Settings2,
} as const;

interface SectorPickerProps {
  selectedSectors: SectorId[];
  selectedSubServices: string[];
  onSectorsChange: (sectors: SectorId[]) => void;
  onSubServicesChange: (subServices: string[]) => void;
  /** Optional cap on how many sectors a supplier can pick. */
  maxSectors?: number;
}

/**
 * Visual industry / sector picker for supplier onboarding.
 * - Mobile-first responsive grid.
 * - Arabic / English aware via useLanguage.
 * - Inline (no popups) per project UX rules.
 */
export function SectorPicker({
  selectedSectors,
  selectedSubServices,
  onSectorsChange,
  onSubServicesChange,
  maxSectors,
}: SectorPickerProps) {
  const { language, isRTL } = useLanguage();

  const expandedSectors = useMemo(
    () => selectedSectors.map((id) => getSectorById(id)).filter(Boolean) as ReturnType<typeof getSectorById>[],
    [selectedSectors],
  );

  const toggleSector = (id: SectorId) => {
    const isSelected = selectedSectors.includes(id);
    if (isSelected) {
      // Drop sector + its sub-services
      const sector = getSectorById(id);
      const subIds = sector?.subServices.map((s) => s.id) ?? [];
      onSectorsChange(selectedSectors.filter((s) => s !== id));
      onSubServicesChange(selectedSubServices.filter((s) => !subIds.includes(s)));
      return;
    }
    if (maxSectors && selectedSectors.length >= maxSectors) return;
    onSectorsChange([...selectedSectors, id]);
  };

  const toggleSub = (subId: string) => {
    if (selectedSubServices.includes(subId)) {
      onSubServicesChange(selectedSubServices.filter((s) => s !== subId));
    } else {
      onSubServicesChange([...selectedSubServices, subId]);
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sector grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-foreground">
            {language === 'ar' ? 'القطاعات التي تعمل بها' : 'Sectors you operate in'}
          </h3>
          <Badge variant="outline" className="tech-content text-[11px]">
            {selectedSectors.length}{maxSectors ? `/${maxSectors}` : ''}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ONBOARDING_SECTORS.map((sector) => {
            const Icon = ICONS[sector.icon];
            const selected = selectedSectors.includes(sector.id);
            const disabled = !selected && !!maxSectors && selectedSectors.length >= maxSectors;

            return (
              <button
                key={sector.id}
                type="button"
                aria-pressed={selected}
                aria-label={language === 'ar' ? sector.name_ar : sector.name_en}
                disabled={disabled}
                onClick={() => toggleSector(sector.id)}
                className={cn(
                  'group relative flex min-h-[110px] flex-col items-start gap-1.5 rounded-xl border-2 p-3 text-start transition-all',
                  'hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  selected
                    ? 'border-accent bg-accent/10 shadow-sm'
                    : 'border-border bg-card hover:border-accent/40',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {selected && (
                  <span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <Icon className={cn('h-6 w-6', selected ? 'text-accent' : 'text-muted-foreground')} />
                <div className="font-heading text-sm font-bold leading-tight text-foreground">
                  {language === 'ar' ? sector.name_ar : sector.name_en}
                </div>
                <div className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
                  {language === 'ar' ? sector.desc_ar : sector.desc_en}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-services per selected sector */}
      {expandedSectors.length > 0 && (
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
          <h4 className="font-heading text-sm font-bold text-foreground">
            {language === 'ar' ? 'الخدمات الفرعية' : 'Sub-services'}
          </h4>
          {expandedSectors.map((sector) => {
            if (!sector) return null;
            return (
              <div key={sector.id}>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  {language === 'ar' ? sector.name_ar : sector.name_en}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sector.subServices.map((sub) => {
                    const checked = selectedSubServices.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        className={cn(
                          'flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                          checked
                            ? 'border-accent bg-accent/10 text-foreground'
                            : 'border-border bg-background hover:border-accent/40',
                        )}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleSub(sub.id)} />
                        <span>{language === 'ar' ? sub.name_ar : sub.name_en}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}