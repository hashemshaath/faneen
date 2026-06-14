import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Eye, EyeOff, Trash2 } from 'lucide-react';

export interface HomeFaqRowItem {
  id: string;
  question_ar: string;
  answer_ar: string;
  sort_order: number;
  is_enabled: boolean;
}

export interface HomeFaqRowProps {
  isRTL: boolean;
  item: HomeFaqRowItem;
  canUp: boolean;
  canDown: boolean;
  isEditing: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisible: () => void;
  onEditToggle: () => void;
  onDelete: () => void;
  labels: {
    enabled: string;
    hidden: string;
    hide: string;
    show: string;
    edit: string;
    close: string;
    delete: string;
    moveUp: string;
    moveDown: string;
  };
  /** Inline edit form (rendered when isEditing). Owned by parent. */
  editForm?: React.ReactNode;
}

/**
 * HomeFaqRow — presentational card for one FAQ row. Edit form is
 * supplied by the parent so mutations and validation stay there.
 */
export const HomeFaqRow: React.FC<HomeFaqRowProps> = ({
  item,
  canUp,
  canDown,
  isEditing,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onEditToggle,
  onDelete,
  labels,
  editForm,
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={!canUp}
            onClick={onMoveUp}
            aria-label={labels.moveUp}
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={!canDown}
            onClick={onMoveDown}
            aria-label={labels.moveDown}
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{item.question_ar}</span>
            <Badge variant="outline" className="text-[10px]">#{item.sort_order}</Badge>
            {item.is_enabled ? (
              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700">{labels.enabled}</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">{labels.hidden}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.answer_ar}</p>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            title={item.is_enabled ? labels.hide : labels.show}
            onClick={onToggleVisible}
            aria-label={item.is_enabled ? labels.hide : labels.show}
          >
            {item.is_enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={onEditToggle}>
            {isEditing ? labels.close : labels.edit}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            aria-label={labels.delete}
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {isEditing && editForm}
    </CardContent>
  </Card>
);

export default HomeFaqRow;