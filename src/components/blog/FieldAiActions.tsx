import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { callBlogAi } from '@/lib/blog-ai-utils';
import { toast } from 'sonner';

interface Props {
  /** Current field value */
  value: string;
  /** Field language */
  lang: 'ar' | 'en';
  /** Callback to set the translated/improved value on the OTHER language field */
  onTranslated?: (translated: string) => void;
  /** Callback to replace current field with improved text */
  onImproved?: (improved: string) => void;
  /** Focus keyword for improvement context */
  focusKeyword?: string;
  /** Is the interface RTL */
  isRTL?: boolean;
  /** Field type for context */
  fieldType?: 'title' | 'excerpt' | 'content' | 'meta_title' | 'meta_description';
}

export const FieldAiActions: React.FC<Props> = ({
  value, lang, onTranslated, onImproved, focusKeyword, isRTL = true, fieldType = 'content'
}) => {
  const [loading, setLoading] = useState<string | null>(null);

  if (!value?.trim()) return null;

  const targetLang = lang === 'ar' ? 'en' : 'ar';

  const handleTranslate = async () => {
    setLoading('translate');
    try {
      const result = await callBlogAi({
        action: 'translate',
        text: value,
        sourceLang: lang,
        targetLang,
      });
      onTranslated?.(result.trim());
      toast.success(isRTL ? 'تمت الترجمة' : 'Translated');
    } catch {} finally { setLoading(null); }
  };

  const handleImprove = async () => {
    setLoading('improve');
    try {
      const result = await callBlogAi({
        action: 'improve_content',
        text: value,
        keywords: focusKeyword ? [focusKeyword] : [],
      });
      onImproved?.(result.trim());
      toast.success(isRTL ? 'تم التحسين' : 'Improved');
    } catch {} finally { setLoading(null); }
  };

  const handleGenerateExcerpt = async () => {
    setLoading('excerpt');
    try {
      const result = await callBlogAi({
        action: 'generate_excerpt',
        title: '',
        content: value,
        keywords: focusKeyword ? [focusKeyword] : [],
      });
      onImproved?.(result.trim());
      toast.success(isRTL ? 'تم التوليد' : 'Generated');
    } catch {} finally { setLoading(null); }
  };

  const btnClass = "h-6 px-2 text-[10px] gap-1 border-dashed hover:border-primary/40 hover:bg-primary/5";
  const iconSize = "w-3 h-3";

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {onTranslated && (
        <Button variant="outline" size="sm" className={btnClass} onClick={handleTranslate} disabled={!!loading}>
          {loading === 'translate' ? <Loader2 className={`${iconSize} animate-spin`} /> : <Languages className={iconSize} />}
          {isRTL ? `ترجم → ${targetLang.toUpperCase()}` : `Translate → ${targetLang.toUpperCase()}`}
        </Button>
      )}
      {onImproved && fieldType !== 'excerpt' && (
        <Button variant="outline" size="sm" className={btnClass} onClick={handleImprove} disabled={!!loading}>
          {loading === 'improve' ? <Loader2 className={`${iconSize} animate-spin`} /> : <Sparkles className={iconSize} />}
          {isRTL ? 'تحسين' : 'Improve'}
        </Button>
      )}
      {onImproved && fieldType === 'excerpt' && (
        <Button variant="outline" size="sm" className={btnClass} onClick={handleGenerateExcerpt} disabled={!!loading}>
          {loading === 'excerpt' ? <Loader2 className={`${iconSize} animate-spin`} /> : <Wand2 className={iconSize} />}
          {isRTL ? 'توليد تلقائي' : 'Auto-generate'}
        </Button>
      )}
    </div>
  );
};
