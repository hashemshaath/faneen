import React from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAdminWidget } from '../widgets/adminDashboardWidgets';

/**
 * ADMIN-REDESIGN PHASE 4 — wraps a dashboard section so it participates
 * in the personalization layer. In edit mode, an inline pill in the
 * top-left of the section toggles its visibility. Outside edit mode,
 * the wrapper is a transparent passthrough.
 */
export interface AdminWidgetShellProps {
  widgetId: string;
  editMode: boolean;
  isHidden: boolean;
  onToggle: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isRTL: boolean;
  /** Only used when the widget is hideable AND currently hidden in edit mode. */
  className?: string;
  children: React.ReactNode;
}

export const AdminWidgetShell: React.FC<AdminWidgetShellProps> = ({
  widgetId, editMode, isHidden, onToggle, onMoveUp, onMoveDown,
  canMoveUp = true, canMoveDown = true, isRTL, className, children,
}) => {
  const def = getAdminWidget(widgetId);
  if (!def) return null;

  // Outside edit mode, hidden widgets are removed from the DOM entirely
  // so they cost nothing to skip.
  if (!editMode && isHidden) return null;

  const label = isRTL ? def.titleAr : def.titleEn;
  return (
    <section
      data-widget-id={widgetId}
      data-widget-hidden={isHidden ? 'true' : 'false'}
      className={cn('relative', editMode && 'rounded-2xl', editMode && isHidden && 'opacity-50', className)}
    >
      {editMode && (
        <div
          className={cn(
            'absolute top-2 z-20 flex items-center gap-1.5 rounded-full border bg-background/95 px-2 py-1 shadow-sm backdrop-blur',
            isRTL ? 'right-2' : 'left-2',
          )}
        >
          {def.hideable && (
            <button
              type="button"
              onClick={onToggle}
              aria-pressed={!isHidden}
              aria-label={isHidden ? (isRTL ? `إظهار ${label}` : `Show ${label}`) : (isRTL ? `إخفاء ${label}` : `Hide ${label}`)}
              className="flex items-center gap-1 text-[10px] font-medium text-foreground hover:text-accent"
            >
              {isHidden
                ? <EyeOff className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                : <Eye className="w-3 h-3 text-accent" aria-hidden="true" />}
              <span className="truncate max-w-[10rem]">{label}</span>
            </button>
          )}
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label={isRTL ? `نقل ${label} للأعلى` : `Move ${label} up`}
              className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label={isRTL ? `نقل ${label} للأسفل` : `Move ${label} down`}
              className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      {children}
    </section>
  );
};

export default AdminWidgetShell;