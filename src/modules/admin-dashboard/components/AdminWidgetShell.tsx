import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
  isRTL: boolean;
  /** Only used when the widget is hideable AND currently hidden in edit mode. */
  className?: string;
  children: React.ReactNode;
}

export const AdminWidgetShell: React.FC<AdminWidgetShellProps> = ({
  widgetId, editMode, isHidden, onToggle, isRTL, className, children,
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
      {editMode && def.hideable && (
        <div
          className={cn(
            'absolute top-2 z-20 flex items-center gap-1.5 rounded-full border bg-background/95 px-2 py-1 shadow-sm backdrop-blur',
            isRTL ? 'right-2' : 'left-2',
          )}
        >
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
        </div>
      )}
      {children}
    </section>
  );
};

export default AdminWidgetShell;