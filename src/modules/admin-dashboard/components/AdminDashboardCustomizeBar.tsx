import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw, Settings2 } from 'lucide-react';

/**
 * Compact Customize/Done/Reset bar shown next to the admin hero.
 */
export interface AdminDashboardCustomizeBarProps {
  isRTL: boolean;
  editMode: boolean;
  onToggle: () => void;
  onReset: () => void;
}

export const AdminDashboardCustomizeBar: React.FC<AdminDashboardCustomizeBarProps> = ({
  isRTL, editMode, onToggle, onReset,
}) => (
  <div className="flex items-center gap-1.5" data-testid="admin-dashboard-customize-bar">
    {editMode && (
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-8 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        {isRTL ? 'إعادة' : 'Reset'}
      </Button>
    )}
    <Button
      variant={editMode ? 'default' : 'outline'}
      size="sm"
      onClick={onToggle}
      className="h-8 text-[10px] gap-1.5 rounded-lg"
      aria-pressed={editMode}
    >
      {editMode
        ? <Check className="w-3.5 h-3.5" aria-hidden="true" />
        : <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />}
      {editMode ? (isRTL ? 'تم' : 'Done') : (isRTL ? 'تخصيص' : 'Customize')}
    </Button>
  </div>
);

export default AdminDashboardCustomizeBar;