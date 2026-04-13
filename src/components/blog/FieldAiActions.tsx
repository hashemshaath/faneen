import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { stripMarkdown } from '@/lib/blog-ai-utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAiSettings } from '@/hooks/useAiSettings';

interface Props {
  value: string;
  lang: 'ar' | 'en';
  onTranslated?: (translated: string) => void;
  onImproved?: (improved: string) => void;
  focusKeyword?: string;
  isRTL?: boolean;
  fieldType?: 'title' | 'excerpt' | 'content' | 'meta_title' | 'meta_description' | 'description' | 'short_text';
  compact?: boolean;
}

async function callWithSettings(params: Record<string, any>): Promise<string> {
  const { data, error } = await supabase.functions.invoke('blog-ai-tools', { body: params });
  if (error) {
    if (error.message?.includes('429')) toast.error('Rate limited, please wait.');
    else if (error.message?.includes('402')) toast.error('Credits exhausted.');
    else toast.error(error.message || 'AI error');
    throw error;
  }
  return data?.result || '';
}

export const FieldAiActions: React.FC<Props> = ({
  value, lang, onTranslated, onImproved, focusKeyword, isRTL = true, fieldType = 'content', compact = false,
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { settings } = useAiSettings();

  const isEmpty = !value?.trim();
  if (isEmpty && !onTranslated && !onImproved) return null;

  const targetLang = lang === 'ar' ? 'en' : 'ar';
  const isPlainField = fieldType !== 'content';
  const clean = (text: string) => isPlainField ? stripMarkdown(text) : text.trim();

  const handleTranslate = async () => {
    setLoading('translate');
    try {
      const result = await callWithSettings({
        action: 'translate',
        text: value,
        sourceLang: lang,
        targetLang,
        tone: settings.default_tone,
        model: settings.default_model,
        translationInstructions: settings.translation_instructions || undefined,
      });
      onTranslated?.(clean(result));
      toast.success(isRTL ? 'تمت الترجمة' : 'Translated');
    } catch (_e) { // AI call failed, toast shown internally } finally { setLoading(null); }
  };

  const handleImprove = async () => {
    setLoading('improve');
    try {
      const result = await callWithSettings({
        action: 'improve_content',
        text: value,
        keywords: focusKeyword ? [focusKeyword] : [],
        tone: settings.default_tone,
        model: settings.default_model,
        contentInstructions: settings.content_instructions || undefined,
        responseStyle: settings.response_style,
      });
      onImproved?.(clean(result));
      toast.success(isRTL ? 'تم التحسين' : 'Improved');
    } catch (_e) { // AI call failed, toast shown internally } finally { setLoading(null); }
  };

  const handleGenerateExcerpt = async () => {
    setLoading('excerpt');
    try {
      const result = await callWithSettings({
        action: 'generate_excerpt',
        title: '',
        content: value,
        keywords: focusKeyword ? [focusKeyword] : [],
        tone: settings.default_tone,
        model: settings.default_model,
      });
      onImproved?.(clean(result));
      toast.success(isRTL ? 'تم التوليد' : 'Generated');
    } catch (_e) { // AI call failed, toast shown internally } finally { setLoading(null); }
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
