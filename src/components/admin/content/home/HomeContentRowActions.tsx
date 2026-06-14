import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Eye, EyeOff, Pencil } from 'lucide-react';

export interface HomeContentRowActionsProps {
  isRTL?: boolean;
  canUp: boolean;
  canDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isVisible?: boolean;
  onToggleVisible?: () => void;
  onEdit?: () => void;
  labels?: {
    up?: string;
    down?: string;
    show?: string;
    hide?: string;
    edit?: string;
  };
  size?: 'sm' | 'md';
}

/**
 * HomeContentRowActions — presentational row-actions cluster shared by
 * Home admin row components (sectors + FAQ). Receives every intent via
 * callbacks; never mutates data or fetches anything.
 */
export const HomeContentRowActions: React.FC<HomeContentRowActionsProps> = ({
  canUp,
  canDown,
  onMoveUp,
  onMoveDown,
  isVisible,
  onToggleVisible,
  onEdit,
  labels,
  size = 'md',
}) => {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const icon = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className={dim}
        disabled={!canUp}
        onClick={onMoveUp}
        aria-label={labels?.up ?? 'Up'}
      >
        <ArrowUp className={icon} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={dim}
        disabled={!canDown}
        onClick={onMoveDown}
        aria-label={labels?.down ?? 'Down'}
      >
        <ArrowDown className={icon} />
      </Button>
      {onToggleVisible && (
        <Button
          variant="ghost"
          size="icon"
          className={dim}
          onClick={onToggleVisible}
          aria-label={isVisible ? labels?.hide ?? 'Hide' : labels?.show ?? 'Show'}
        >
          {isVisible ? <EyeOff className={icon} /> : <Eye className={icon} />}
        </Button>
      )}
      {onEdit && (
        <Button variant="ghost" size="icon" className={dim} onClick={onEdit} aria-label={labels?.edit ?? 'Edit'}>
          <Pencil className={icon} />
        </Button>
      )}
    </div>
  );
};

export default HomeContentRowActions;