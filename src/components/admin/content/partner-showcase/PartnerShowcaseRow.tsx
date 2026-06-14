import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useBi } from '@/components/common/Bilingual';
import {
  PartnerShowcaseMoveControls,
  PartnerShowcaseRowActions,
} from './PartnerShowcaseRowActions';

/**
 * PartnerShowcaseRow — presentational row for a single partner. Preserves
 * the existing image element (plain <img>) so the home-page image pipeline
 * is not altered in any way.
 */
export interface PartnerShowcaseRowProps {
  id: string;
  nameAr: string;
  nameEn: string;
  logoUrl: string;
  targetUrl: string | null;
  isActive: boolean;
  sourceType: 'business' | 'external';
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleShow: (next: boolean) => void;
  onDelete?: () => void;
}

export const PartnerShowcaseRow: React.FC<PartnerShowcaseRowProps> = ({
  nameAr,
  nameEn,
  logoUrl,
  targetUrl,
  isActive,
  sourceType,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggleShow,
  onDelete,
}) => {
  const bi = useBi();
  return (
    <li className="py-3 flex items-center gap-3">
      <PartnerShowcaseMoveControls
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
      <img src={logoUrl} alt="" className="w-14 h-10 object-contain rounded bg-muted/40 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {nameAr} <span className="text-muted-foreground">— {nameEn}</span>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {targetUrl ?? bi('بدون رابط', 'No link')}
        </div>
        <div className="mt-1 flex items-center gap-2">
          {sourceType === 'business' ? (
            <Badge variant="secondary" className="text-[10px]">{bi('من النظام', 'System')}</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">{bi('خارجي', 'External')}</Badge>
          )}
        </div>
      </div>
      <PartnerShowcaseRowActions
        isActive={isActive}
        onToggleShow={onToggleShow}
        onDelete={onDelete}
      />
    </li>
  );
};

export default PartnerShowcaseRow;