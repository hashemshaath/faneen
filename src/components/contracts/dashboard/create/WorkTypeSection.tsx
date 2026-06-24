/**
 * Phase 3D — Presentational work-type selector.
 * Pure UI: parent owns selectedWorkType and the associated reset of
 * template/pricing-method state.
 */
import React from 'react';
import { Briefcase, Check, ChevronsUpDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { WORK_TYPES, getWorkType, type WorkTypeKey } from '@/lib/contract-work-types';
import { BOQ_GROUPS } from '@/lib/contract-boq';

interface Props {
  isRTL: boolean;
  value: WorkTypeKey;
  touched: boolean;
  onSelect: (v: WorkTypeKey) => void;
}

export const WorkTypeSection: React.FC<Props> = ({ isRTL, value, touched, onSelect }) => {
  const [open, setOpen] = React.useState(false);
  const current = getWorkType(value);
  const currentLabel = current ? (isRTL ? current.ar : current.en) : (isRTL ? 'اختر نوع العمل' : 'Select work type');
  return (
  <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-2">
    <div className="flex items-center gap-1.5">
      <Briefcase className="w-3.5 h-3.5 text-primary" />
      <Label className="text-xs font-semibold">{isRTL ? 'نوع العمل / الخدمة' : 'Work / Service Type'} <span className="text-destructive">*</span></Label>
    </div>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between text-xs font-normal"
          data-testid="work-type-combobox-trigger"
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronsUpDown className="ms-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[min(420px,90vw)]" align="start">
        <Command
          filter={(itemValue, search) => {
            const w = WORK_TYPES.find(x => x.key === itemValue);
            if (!w) return 0;
            const hay = `${w.ar} ${w.en} ${w.key}`.toLowerCase();
            return hay.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={isRTL ? 'ابحث عن نوع العمل…' : 'Search work type…'} className="text-xs" />
          <CommandList>
            <CommandEmpty className="py-4 text-xs">{isRTL ? 'لا توجد نتائج' : 'No results'}</CommandEmpty>
            <CommandGroup>
              {WORK_TYPES.map(w => (
                <CommandItem
                  key={w.key}
                  value={w.key}
                  onSelect={(v) => { onSelect(v as WorkTypeKey); setOpen(false); }}
                  className="text-xs"
                >
                  <Check className={`me-2 h-3.5 w-3.5 ${value === w.key ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="truncate">{isRTL ? w.ar : w.en}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <p className="text-[9px] text-muted-foreground">
      {isRTL ? 'سيتم استخدام قالب عقد مناسب لنوع العمل المحدد.' : 'A contract template matching the selected work type will be used.'}
    </p>
    {touched && (() => {
      const w = getWorkType(value);
      if (!w || w.defaultBoqGroups.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1 pt-1">
          <span className="text-[9px] text-muted-foreground me-1">{isRTL ? 'مجموعات BOQ المقترحة:' : 'Suggested BOQ groups:'}</span>
          {w.defaultBoqGroups.map(g => {
            const meta = BOQ_GROUPS.find(b => b.key === g);
            return <Badge key={g} variant="outline" className="text-[9px]">{meta ? (isRTL ? meta.ar : meta.en) : g}</Badge>;
          })}
        </div>
      );
    })()}
  </div>
  );
};

export default WorkTypeSection;