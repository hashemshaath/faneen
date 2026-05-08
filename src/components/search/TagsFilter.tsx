import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Tag, X, ChevronDown, ChevronUp } from 'lucide-react';

interface TagsFilterProps {
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
  onClearTags: () => void;
}

export const TagsFilter = ({ selectedTags, onToggleTag, onClearTags }: TagsFilterProps) => {
  const { language, isRTL } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: tags = [] } = useQuery({
    queryKey: ['tags-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tags')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return data ?? [];
    },
  });

  if (tags.length === 0) return null;

  const groupedTags = tags.reduce((acc: Record<string, typeof tags[number][]>, tag: any) => {
    const group = tag.tag_group || 'general';
    if (!acc[group]) acc[group] = [];
    acc[group].push(tag);
    return acc;
  }, {});

  const groupLabels: Record<string, { ar: string; en: string }> = {
    product: { ar: 'المنتجات', en: 'Products' },
    material: { ar: 'المواد', en: 'Materials' },
    service: { ar: 'الخدمات', en: 'Services' },
    feature: { ar: 'المميزات', en: 'Features' },
    promo: { ar: 'العروض', en: 'Promotions' },
    general: { ar: 'عام', en: 'General' },
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <span className="text-xs sm:text-sm font-heading font-semibold text-foreground flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-accent" />
          {isRTL ? 'الوسوم' : 'Tags'}
          {selectedTags.length > 0 && (
            <span className="text-micro bg-accent/15 text-accent px-1.5 py-0.5 rounded-md">
              {selectedTags.length}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {selectedTags.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onClearTags(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onClearTags(); } }}
              className="text-micro text-destructive hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
              {isRTL ? 'مسح' : 'Clear'}
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </span>
      </button>

      {open && (
        <div className="space-y-2.5 animate-fade-in">
          {Object.entries(groupedTags).map(([group, groupTags]) => (
            <div key={group}>
              <p className="text-micro text-muted-foreground mb-1 font-medium uppercase tracking-wider">
                {language === 'ar' ? groupLabels[group]?.ar || group : groupLabels[group]?.en || group}
              </p>
              <div
                className={
                  expanded
                    ? 'flex flex-wrap gap-1.5'
                    : 'flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 snap-x snap-mandatory'
                }
              >
                {groupTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  const name = language === 'ar' ? tag.name_ar : tag.name_en;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => onToggleTag(tag.id)}
                      aria-pressed={isSelected}
                      className={`chip chip-sm shrink-0 snap-start ${isSelected ? 'chip-selected' : 'chip-unselected'}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-micro text-accent hover:underline flex items-center gap-1 mt-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                {isRTL ? 'عرض سطر واحد' : 'Single line'}
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                {isRTL ? 'عرض الكل' : 'Show all'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
