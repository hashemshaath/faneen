/**
 * Phase 3D — Presentational work-type selector.
 * Pure UI: parent owns selectedWorkType and the associated reset of
 * template/pricing-method state.
 */
import React from 'react';
import { Briefcase } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WORK_TYPES, getWorkType, type WorkTypeKey } from '@/lib/contract-work-types';
import { BOQ_GROUPS } from '@/lib/contract-boq';

interface Props {
  isRTL: boolean;
  value: WorkTypeKey;
  touched: boolean;
  onSelect: (v: WorkTypeKey) => void;
}

export const WorkTypeSection: React.FC<Props> = ({ isRTL, value, touched, onSelect }) => (
  <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-2">
    <div className="flex items-center gap-1.5">
      <Briefcase className="w-3.5 h-3.5 text-primary" />
      <Label className="text-xs font-semibold">{isRTL ? 'نوع العمل / الخدمة' : 'Work / Service Type'} <span className="text-destructive">*</span></Label>
    </div>
    <Select value={value} onValueChange={(v) => onSelect(v as WorkTypeKey)}>
      <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {WORK_TYPES.map(w => (
          <SelectItem key={w.key} value={w.key} className="text-xs">{isRTL ? w.ar : w.en}</SelectItem>
        ))}
      </SelectContent>
    </Select>
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

export default WorkTypeSection;