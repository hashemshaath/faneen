import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { callBlogAi, stripMarkdown } from '@/lib/blog-ai-utils';
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
  /** Field type for context - controls markdown stripping and excerpt generation */
  fieldType?: 'title' | 'excerpt' | 'content' | 'meta_title' | 'meta_description' | 'description' | 'short_text';
  /** Compact mode - smaller buttons */
  compact?: boolean;
}

export const FieldAiActions: React.FC<Props> = ({
  value, lang, onTranslated, onImproved, focusKeyword, isRTL = true, fieldType = 'content', compact = false,
}) => {
  const [loading, setLoading] = useState<string | null>(null);

  const isEmpty = !value?.trim();
  if (isEmpty && !onTranslated && !onImproved) return null;

  const targetLang = lang === 'ar' ? 'en' : 'ar';
  const isPlainField = fieldType !== 'content';
  const clean = (text: string) => isPlainField ? stripMarkdown(text) : text.trim();

  const handleTranslate = async () => {
    setLoading('translate');
    try {
      const result = await callBlogAi({
        action: 'translate',
        text: value,
        sourceLang: lang,
        targetLang,
      });
      onTranslated?.(clean(result));
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
      onImproved?.(clean(result));
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
      onImproved?.(clean(result));
      toast.success(isRTL ? 'تم التوليد' : 'Generated');
    } catch {} finally { setLoading(null); }
  };

  const btnClass = compact
    ? "h-6 px-2 text-[10px] gap-1 border-dashed hover:border-primary/40 hover:bg-primary/5"
    : "h-7 px-2.5 text-[11px] gap-1 border-dashed hover:border-primary/40 hover:bg-primary/5";
  const iconSize = compact ? "w-3 h-3" : "w-3.5 h-3.5";

  const showExcerpt = fieldType === 'excerpt' || fieldType === 'description';

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {onTranslated && (
        <Button variant="outline" size="sm" className={btnClass} onClick={handleTranslate} disabled={!!loading || isEmpty}>
          {loading === 'translate' ? <Loader2 className={`${iconSize} animate-spin`} /> : <Languages className={iconSize} />}
          {isRTL ? `→ ${targetLang.toUpperCase()}` : `→ ${targetLang.toUpperCase()}`}
        </Button>
      )}
      {onImproved && !showExcerpt && (
        <Button variant="outline" size="sm" className={btnClass} onClick={handleImprove} disabled={!!loading || isEmpty}>
          {loading === 'improve' ? <Loader2 className={`${iconSize} animate-spin`} /> : <Sparkles className={iconSize} />}
          {isRTL ? 'تحسين' : 'Improve'}
        </Button>
      )}
      {onImproved && showExcerpt && (
        <>
          <Button variant="outline" size="sm" className={btnClass} onClick={handleGenerateExcerpt} disabled={!!loading || isEmpty}>
            {loading === 'excerpt' ? <Loader2 className={`${iconSize} animate-spin`} /> : <Wand2 className={iconSize} />}
            {isRTL ? 'توليد' : 'Generate'}
          </Button>
          <Button variant="outline" size="sm" className={btnClass} onClick={handleImprove} disabled={!!loading || isEmpty}>
            {loading === 'improve' ? <Loader2 className={`${iconSize} animate-spin`} /> : <Sparkles className={iconSize} />}
            {isRTL ? 'تحسين' : 'Improve'}
          </Button>
        </>
      )}
    </div>
  );
};
