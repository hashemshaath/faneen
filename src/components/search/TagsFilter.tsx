import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Tag, X } from 'lucide-react';

interface TagsFilterProps {
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
  onClearTags: () => void;
}

export const TagsFilter = ({ selectedTags, onToggleTag, onClearTags }: TagsFilterProps) => {
  const { language, isRTL } = useLanguage();

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

  const groupedTags = tags.reduce((acc: Record<string, any[]>, tag: any) => {
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm font-heading font-semibold text-foreground flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-accent" />
          {isRTL ? 'الوسوم' : 'Tags'}
        </p>
        {selectedTags.length > 0 && (
          <button onClick={onClearTags} className="text-[10px] text-destructive hover:underline flex items-center gap-0.5">
            <X className="w-3 h-3" />
            {isRTL ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {Object.entries(groupedTags).map(([group, groupTags]) => (
        <div key={group}>
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
            {language === 'ar' ? groupLabels[group]?.ar || group : groupLabels[group]?.en || group}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {groupTags.map((tag: any) => {
              const isSelected = selectedTags.includes(tag.id);
              const name = language === 'ar' ? tag.name_ar : tag.name_en;
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggleTag(tag.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition-all border ${
                    isSelected
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:border-accent/30 hover:text-foreground'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
