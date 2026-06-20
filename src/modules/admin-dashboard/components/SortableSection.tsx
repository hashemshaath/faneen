import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SortableSectionProps {
  id: string;
  editMode: boolean;
  isRTL: boolean;
  children: React.ReactNode;
}

/**
 * Drag-and-drop sortable wrapper for top-level admin dashboard blocks.
 * When `editMode` is off the wrapper is an inert <div>, so we never
 * intercept clicks on charts, links, or buttons during normal use.
 */
export const SortableSection: React.FC<SortableSectionProps> = ({
  id, editMode, isRTL, children,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !editMode });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        editMode && 'ring-1 ring-dashed ring-border/60 rounded-2xl',
        isDragging && 'z-30 shadow-[var(--shadow-card-hover)] opacity-90',
      )}
    >
      {editMode && (
        <button
          type="button"
          aria-label={isRTL ? 'سحب لإعادة الترتيب' : 'Drag to reorder'}
          className={cn(
            'absolute top-2 z-30 flex items-center justify-center w-7 h-7 rounded-full',
            'border bg-background/95 shadow-sm backdrop-blur cursor-grab active:cursor-grabbing',
            'text-muted-foreground hover:text-accent',
            isRTL ? 'left-2' : 'right-2',
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
      {children}
    </div>
  );
};

export default SortableSection;