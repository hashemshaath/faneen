import React from 'react';
import { Edit, MapPin, Phone, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { pickBi } from '@/components/common/Bilingual';
import type { BranchRow } from './types';

/** Phase 5D — single branch row card. Presentational; no Supabase calls. */
export interface BusinessBranchCardProps {
  branch: BranchRow;
  isRTL: boolean;
  language: 'ar' | 'en';
  onToggleActive: (id: string, next: boolean) => void;
  onEdit: (branch: BranchRow) => void;
  onDelete: (id: string) => void;
}

const TYPE_MAP: Record<string, { ar: string; en: string; cls: string }> = {
  main: { ar: 'المركز الرئيسي', en: 'Headquarters', cls: 'bg-primary/10 text-primary' },
  branch: { ar: 'فرع', en: 'Branch', cls: 'bg-info/10 text-info' },
  warehouse: { ar: 'مستودع', en: 'Warehouse', cls: 'bg-warning/10 text-warning-foreground' },
  admin_office: { ar: 'مكتب إداري', en: 'Admin office', cls: 'bg-accent/10 text-accent' },
  regional_office: { ar: 'إدارة إقليمية', en: 'Regional office', cls: 'bg-success/10 text-success' },
  head_office: { ar: 'الإدارة العامة', en: 'Head office', cls: 'bg-destructive/10 text-destructive' },
};

export const BusinessBranchCard: React.FC<BusinessBranchCardProps> = ({
  branch: br,
  isRTL,
  language,
  onToggleActive,
  onEdit,
  onDelete,
}) => {
  const typeKey = br.branch_type ?? (br.is_main ? 'main' : 'branch');
  const meta = TYPE_MAP[typeKey] ?? TYPE_MAP.branch;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/20 transition-all ${
        !br.is_active ? 'opacity-50' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">
            {language === 'ar' ? br.name_ar : br.name_en || br.name_ar}
          </p>
          <Badge className={`text-[8px] h-4 border-0 ${meta.cls}`}>
            {pickBi(isRTL, meta.ar, meta.en)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
          {br.phone && (
            <span className="flex items-center gap-0.5">
              <Phone className="w-2.5 h-2.5" />
              {br.phone}
            </span>
          )}
          {br.mobile && (
            <span className="flex items-center gap-0.5">
              <Phone className="w-2.5 h-2.5" />
              {br.mobile}
            </span>
          )}
          {br.unified_number && <span>{br.unified_number}</span>}
          {(br.address || br.district) && (
            <span className="flex items-center gap-0.5 truncate max-w-[280px]">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">
                {br.address || [br.district, br.street_name].filter(Boolean).join(' · ')}
              </span>
            </span>
          )}
          {br.contact_person && (
            <span className="flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" />
              {br.contact_person}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Switch checked={br.is_active} onCheckedChange={(v) => onToggleActive(br.id, v)} />
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onEdit(br)}
        >
          <Edit className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive"
          onClick={() => {
            if (confirm(pickBi(isRTL, 'حذف هذا الفرع؟', 'Delete this branch?'))) {
              onDelete(br.id);
            }
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default BusinessBranchCard;