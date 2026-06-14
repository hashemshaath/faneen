import React from 'react';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useBi } from '@/components/common/Bilingual';

/**
 * PartnerShowcaseRowActions — presentational action cluster for a single
 * partner row. All handlers are owned by the parent page; this component
 * performs no Supabase calls and triggers no mutations directly.
 */
export interface PartnerShowcaseRowActionsProps {
  isActive: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleShow: (next: boolean) => void;
  onDelete?: () => void;
}

export const PartnerShowcaseRowActions: React.FC<PartnerShowcaseRowActionsProps> = ({
  isActive,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggleShow,
  onDelete,
}) => {
  const bi = useBi();
  return (
    <>
      <div className="flex flex-col gap-1">
        <Button size="icon" variant="ghost" disabled={!canMoveUp} onClick={onMoveUp} aria-label={bi('للأعلى', 'Move up')}>
          <ArrowUp className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" disabled={!canMoveDown} onClick={onMoveDown} aria-label={bi('للأسفل', 'Move down')}>
          <ArrowDown className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Switch
          checked={isActive}
          onCheckedChange={onToggleShow}
          aria-label={bi('تفعيل', 'Active')}
        />
        {onDelete && (
          <Button
            size="icon"
            variant="ghost"
            aria-label={bi('حذف', 'Delete')}
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
    </>
  );
};

export default PartnerShowcaseRowActions;