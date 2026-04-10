import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  slug: string;
  icon?: string | null;
}

interface CategoryTreeProps {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const CategoryTree = ({ categories, selectedId, onSelect }: CategoryTreeProps) => {
  const { language, isRTL } = useLanguage();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rootCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getName = (c: Category) => language === 'ar' ? c.name_ar : c.name_en;

  return (
    <div className="space-y-0.5">
      {/* All categories option */}
      <button
        onClick={() => onSelect('all')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          selectedId === 'all'
            ? 'bg-accent/10 text-accent font-medium'
            : 'text-foreground hover:bg-muted/50'
        }`}
      >
        <Tag className="w-3.5 h-3.5" />
        {isRTL ? 'جميع الأقسام' : 'All Categories'}
      </button>

      {rootCategories.map(cat => {
        const children = getChildren(cat.id);
        const hasChildren = children.length > 0;
        const isExpanded = expanded.has(cat.id);
        const isSelected = selectedId === cat.id;
        const isChildSelected = children.some(c => c.id === selectedId);

        return (
          <div key={cat.id}>
            <button
              onClick={() => {
                onSelect(cat.id);
                if (hasChildren) toggle(cat.id);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isSelected || isChildSelected
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-foreground hover:bg-muted/50'
              }`}
            >
              {hasChildren && (
                isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : (isRTL ? <ChevronRight className="w-3.5 h-3.5 shrink-0 rotate-180" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />)
              )}
              {!hasChildren && <span className="w-3.5" />}
              <span className="truncate flex-1 text-start">{getName(cat)}</span>
              {hasChildren && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 min-w-[16px] h-4">
                  {children.length}
                </Badge>
              )}
            </button>

            {hasChildren && isExpanded && (
              <div className="ms-5 space-y-0.5 mt-0.5">
                {children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => onSelect(child.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      selectedId === child.id
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
                    <span className="truncate text-start">{getName(child)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
