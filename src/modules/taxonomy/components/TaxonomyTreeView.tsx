import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { ChevronDown, ChevronRight, Edit, ArrowUp, ArrowDown, Archive } from 'lucide-react';
import type { TaxonomyCategoryWithChildren, TaxonomyType } from '../types';

interface Props {
  types: TaxonomyType[];
  trees: Map<string, TaxonomyCategoryWithChildren[]>; // typeId -> roots
  onEdit: (id: string) => void;
  onMove: (id: string, dir: 'up' | 'down') => void;
  onArchive: (id: string) => void;
}

export const TaxonomyTreeView: React.FC<Props> = ({ types, trees, onEdit, onMove, onArchive }) => {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState<Set<string>>(new Set(types.map((t) => t.id)));
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const renderNode = (n: TaxonomyCategoryWithChildren) => (
    <li key={n.id} className="ps-3">
      <div className="group flex items-center gap-2 py-1.5 rounded-lg hover:bg-muted/40 px-2">
        {n.children.length > 0 ? (
          <button onClick={() => toggle(n.id)} className="p-0.5">
            {open.has(n.id) ? <ChevronDown className="w-3.5 h-3.5" /> : (isRTL ? <ChevronRight className="w-3.5 h-3.5 rotate-180" /> : <ChevronRight className="w-3.5 h-3.5" />)}
          </button>
        ) : <span className="w-4" />}
        <span className="flex-1 truncate text-sm" dir="auto">
          <span className={n.is_archived ? 'text-muted-foreground line-through' : !n.is_active ? 'text-muted-foreground' : ''}>{n.name_ar}</span>
          {n.name_en && <span className="text-muted-foreground text-xs ms-2 tech-content">{n.name_en}</span>}
        </span>
        <Badge variant="outline" className="text-[10px] tech-content">{n.slug}</Badge>
        {n.is_archived && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'مؤرشف' : 'archived'}</Badge>}
        {!n.is_active && !n.is_archived && <Badge variant="secondary" className="text-[10px]">{isRTL ? 'مخفي' : 'hidden'}</Badge>}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMove(n.id, 'up')} aria-label="up"><ArrowUp className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onMove(n.id, 'down')} aria-label="down"><ArrowDown className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onArchive(n.id)} aria-label="archive"><Archive className="w-3.5 h-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(n.id)} aria-label="edit"><Edit className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
      {n.children.length > 0 && open.has(n.id) && (
        <ul className="border-s border-border/40 ms-3">{n.children.map(renderNode)}</ul>
      )}
    </li>
  );

  return (
    <div className="space-y-3">
      {types.map((t) => {
        const roots = trees.get(t.id) ?? [];
        if (roots.length === 0) return null;
        return (
          <div key={t.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => toggle(t.id)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/40 text-start"
            >
              {open.has(t.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />}
              <span className="font-heading font-bold text-sm">{isRTL ? t.name_ar : t.name_en ?? t.name_ar}</span>
              <Badge variant="secondary" className="text-[10px] tech-content ms-auto">{roots.length}</Badge>
            </button>
            {open.has(t.id) && <ul className="py-1">{roots.map(renderNode)}</ul>}
          </div>
        );
      })}
      {/* TODO: enable drag-and-drop taxonomy reordering once stable DnD utility is approved. */}
    </div>
  );
};