import React from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, Eye, EyeOff, RotateCcw, Settings2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  editMode: boolean;
  hidden: boolean;
  label: string;
  onToggleHidden: (id: string) => void;
  className?: string;
  children: React.ReactNode;
}

function SortableItem({ id, editMode, hidden, label, onToggleHidden, className, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : hidden && editMode ? 0.45 : 1,
  };
  if (hidden && !editMode) return null;

  return (
    <div ref={setNodeRef} style={style} className={cn('relative', className)}>
      {editMode && (
        <div className="absolute inset-0 z-10 rounded-xl border-2 border-dashed border-accent/40 bg-background/30 backdrop-blur-[1px] flex items-start justify-between p-2 pointer-events-none">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${label}`}
            className="pointer-events-auto h-7 px-2 rounded-md bg-background/90 border border-border/60 text-[10px] font-medium flex items-center gap-1 cursor-grab active:cursor-grabbing shadow-sm"
          >
            <GripVertical className="w-3 h-3" aria-hidden="true" />
            {label}
          </button>
          <button
            type="button"
            onClick={() => onToggleHidden(id)}
            aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
            className="pointer-events-auto h-7 w-7 rounded-md bg-background/90 border border-border/60 flex items-center justify-center shadow-sm hover:bg-muted"
          >
            {hidden
              ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              : <Eye   className="w-3.5 h-3.5 text-accent" aria-hidden="true" />}
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

interface CustomizableGridProps {
  order: string[];
  hidden: string[];
  editMode: boolean;
  onReorder: (from: string, to: string) => void;
  onToggleHidden: (id: string) => void;
  labels: Record<string, string>;
  className?: string;
  itemClassName?: (id: string) => string | undefined;
  children: Record<string, React.ReactNode>;
}

/**
 * Drag-and-drop sortable grid for dashboard widgets. When `editMode` is on,
 * widgets show a drag handle + visibility toggle. When off, hidden widgets
 * are removed from the DOM entirely (no perf cost).
 */
export function CustomizableGrid({
  order, hidden, editMode, onReorder, onToggleHidden, labels, className, itemClassName, children,
}: CustomizableGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className={className}>
          {order.map((id) => (
            children[id] ? (
              <SortableItem
                key={id}
                id={id}
                editMode={editMode}
                hidden={hidden.includes(id)}
                label={labels[id] ?? id}
                onToggleHidden={onToggleHidden}
                className={itemClassName?.(id)}
              >
                {children[id]}
              </SortableItem>
            ) : null
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function CustomizationToolbar({
  isRTL, editMode, onToggle, onReset,
}: { isRTL: boolean; editMode: boolean; onToggle: () => void; onReset: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
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
}