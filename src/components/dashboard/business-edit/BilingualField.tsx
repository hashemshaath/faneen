import React, { useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { invokeBlogAiTools } from '@/modules/ai';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAiSettings } from '@/hooks/useAiSettings';
import { stripMarkdown } from '@/lib/blog-ai-utils';

type Lang = 'ar' | 'en';

interface BilingualFieldProps {
  /** Translated field label, e.g. "Region" */
  label: { ar: string; en: string };
  isRTL: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  /** Current values per language. */
  valueAr: string;
  valueEn: string;
  onChangeAr: (v: string) => void;
  onChangeEn: (v: string) => void;
  /** Disable the inline AI translate buttons. */
  disableTranslate?: boolean;
  placeholderAr?: string;
  placeholderEn?: string;
}

/**
 * Side-by-side AR/EN editor with one-click reverse translation.
 * Calls the existing `blog-ai-tools` edge function (action=translate).
 */
export const BilingualField: React.FC<BilingualFieldProps> = ({
  label, isRTL, multiline = false, rows = 3, maxLength,
  valueAr, valueEn, onChangeAr, onChangeEn,
  disableTranslate = false,
  placeholderAr, placeholderEn,
}) => {
  const { settings } = useAiSettings();
  const [busy, setBusy] = useState<Lang | null>(null);

  const translate = async (from: Lang) => {
    const text = from === 'ar' ? valueAr : valueEn;
    if (!text?.trim()) {
      toast.info(isRTL ? 'لا يوجد نص لترجمته' : 'Nothing to translate');
      return;
    }
    setBusy(from);
    try {
      const { data, error } = await invokeBlogAiTools({
        action: 'translate',
        text,
        sourceLang: from,
        targetLang: from === 'ar' ? 'en' : 'ar',
        tone: settings?.default_tone,
        model: settings?.default_model,
        translationInstructions: settings?.translation_instructions || undefined,
      });
      if (error) throw error;
      const result = stripMarkdown(String((data as { result?: string } | null)?.result ?? '')).trim();
      if (!result) throw new Error('Empty translation');
      if (from === 'ar') onChangeEn(result); else onChangeAr(result);
      toast.success(isRTL ? 'تمت الترجمة' : 'Translated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `تعذّرت الترجمة: ${msg}` : `Translation failed: ${msg}`);
    } finally {
      setBusy(null);
    }
  };

  const renderInput = (lang: Lang) => {
    const value = lang === 'ar' ? valueAr : valueEn;
    const onChange = lang === 'ar' ? onChangeAr : onChangeEn;
    const placeholder = lang === 'ar' ? placeholderAr : placeholderEn;
    const handler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value);
    if (multiline) {
      return (
        <Textarea
          dir="auto"
          rows={rows}
          maxLength={maxLength}
          value={value}
          onChange={handler}
          placeholder={placeholder}
          className="mt-1"
        />
      );
    }
    return (
      <Input
        dir="auto"
        maxLength={maxLength}
        value={value}
        onChange={handler}
        placeholder={placeholder}
        className="mt-1"
      />
    );
  };

  const renderHeader = (lang: Lang) => {
    const otherLang: Lang = lang === 'ar' ? 'en' : 'ar';
    const tooltip = lang === 'ar'
      ? (isRTL ? 'ترجمة من العربي إلى الإنجليزي' : 'Translate Arabic → English')
      : (isRTL ? 'ترجمة من الإنجليزي إلى العربي' : 'Translate English → Arabic');
    return (
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium text-muted-foreground">
          {lang === 'ar' ? `${isRTL ? label.ar : label.en} — AR` : `${isRTL ? label.ar : label.en} — EN`}
        </Label>
        {!disableTranslate && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-primary"
            disabled={busy !== null}
            onClick={() => translate(lang)}
            title={tooltip}
            aria-label={tooltip}
          >
            {busy === lang
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Languages className="w-3 h-3" />}
            <span>→ {otherLang.toUpperCase()}</span>
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        {renderHeader('ar')}
        {renderInput('ar')}
        {maxLength && (
          <p className="text-[11px] text-muted-foreground mt-1 tech-content">
            {valueAr.length}/{maxLength}
          </p>
        )}
      </div>
      <div>
        {renderHeader('en')}
        {renderInput('en')}
        {maxLength && (
          <p className="text-[11px] text-muted-foreground mt-1 tech-content">
            {valueEn.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
};