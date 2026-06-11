/**
 * BilingualNameField — unified name capture across the app.
 *
 * Three inputs: Arabic name, English name, optional username (@handle).
 * Auto-fills `full_name` from AR or EN when consumers need a single string.
 */
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Languages, Building2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { UsernamePicker, type UsernameCheckReason } from '@/components/common/UsernamePicker';
import { Button } from '@/components/ui/button';
import { invokeBlogAiTools } from '@/modules/ai';
import { useAiSettings } from '@/hooks/useAiSettings';
import { stripMarkdown } from '@/lib/blog-ai-utils';
import { toast } from 'sonner';

export interface BilingualNameValue {
  full_name_ar: string;
  full_name_en: string;
  username?: string;
}

export interface BilingualNameFieldProps {
  value: BilingualNameValue;
  onChange: (next: BilingualNameValue) => void;
  showUsername?: boolean;
  usernameReadOnly?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  errors?: Partial<Record<keyof BilingualNameValue, string>>;
  /** Receive derived combined full_name when AR/EN change. */
  onFullNameChange?: (full: string) => void;
  /** Exclude a specific user_id from the live username collision check. */
  excludeUserId?: string | null;
  /** Bubble up real-time validity for username so parents can gate submit. */
  onUsernameValidChange?: (state: { value: string; isValid: boolean; isAvailable: boolean }) => void;
  /** Forward a server-side username rejection so the picker pins the error + suggestions. */
  usernameServerError?: {
    forValue: string;
    reason: UsernameCheckReason;
    rawCode?: string | null;
  } | null;
  /**
   * Subject kind — adapts labels, icon and placeholders.
   * - 'person'  (default): "Name (Arabic/English)", person icon, person example.
   * - 'entity': "Entity name (Arabic/English)", building icon, company example.
   *   Used for companies/organizations/government entities.
   */
  subject?: 'person' | 'entity';
  /**
   * Enable one-click AR↔EN reverse translation buttons next to each label.
   * Calls the existing `blog-ai-tools` edge function (action=translate).
   * Off by default to keep current behaviour for existing consumers.
   */
  enableTranslate?: boolean;
}

export const BilingualNameField: React.FC<BilingualNameFieldProps> = ({
  value,
  onChange,
  showUsername = true,
  usernameReadOnly = false,
  required = false,
  disabled = false,
  className,
  errors,
  onFullNameChange,
  excludeUserId,
  onUsernameValidChange,
  usernameServerError = null,
  subject = 'person',
  enableTranslate = false,
}) => {
  const { isRTL } = useLanguage();
  const { settings } = useAiSettings();
  const [translating, setTranslating] = useState<'ar' | 'en' | null>(null);
  const handleTranslate = async (from: 'ar' | 'en') => {
    const text = (from === 'ar' ? value.full_name_ar : value.full_name_en) || '';
    if (!text.trim()) {
      toast.info(isRTL ? 'لا يوجد نص لترجمته' : 'Nothing to translate');
      return;
    }
    setTranslating(from);
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
      update(from === 'ar' ? { full_name_en: result } : { full_name_ar: result });
      toast.success(isRTL ? 'تمت الترجمة' : 'Translated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(isRTL ? `تعذّرت الترجمة: ${msg}` : `Translation failed: ${msg}`);
    } finally {
      setTranslating(null);
    }
  };
  const isEntity = subject === 'entity';
  const FieldIcon = isEntity ? Building2 : User;
  const labelAr = isEntity
    ? (isRTL ? 'اسم المنشأة بالعربية' : 'Entity name (Arabic)')
    : (isRTL ? 'الاسم بالعربية' : 'Name (Arabic)');
  const labelEn = isEntity
    ? (isRTL ? 'اسم المنشأة بالإنجليزية' : 'Entity name (English)')
    : (isRTL ? 'الاسم بالإنجليزية' : 'Name (English)');
  const placeholderAr = isEntity
    ? 'مثال: شركة الواحة للزجاج'
    : (isRTL ? 'مثال: أحمد محمد' : 'مثال: أحمد محمد');
  const placeholderEn = isEntity
    ? 'e.g. Al-Waha Glass Co.'
    : 'e.g. Ahmed Mohammed';
  const usernameLabel = isEntity
    ? (isRTL ? 'المعرّف العام للمنشأة (@handle)' : 'Public handle (@handle)')
    : (isRTL ? 'اسم المستخدم' : 'Username');
  const usernamePlaceholder = isEntity ? 'al_waha_glass' : 'ahmed_m';

  const update = (patch: Partial<BilingualNameValue>) => {
    const next = { ...value, ...patch };
    onChange(next);
    if (patch.full_name_ar !== undefined || patch.full_name_en !== undefined) {
      onFullNameChange?.(next.full_name_ar?.trim() || next.full_name_en?.trim() || '');
    }
  };

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-3', className)}>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5 text-muted-foreground" />
          {labelAr}
          {required && <span className="text-destructive">*</span>}
          {enableTranslate && (
            <Button
              type="button" size="sm" variant="ghost"
              className="ms-auto h-6 px-2 text-[10.5px] gap-1 text-muted-foreground hover:text-primary"
              disabled={disabled || translating !== null}
              onClick={() => handleTranslate('ar')}
              title={isRTL ? 'ترجمة من العربي إلى الإنجليزي' : 'Translate Arabic → English'}
            >
              {translating === 'ar' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
              <span>→ EN</span>
            </Button>
          )}
        </Label>
        <div className="relative">
          <FieldIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={value.full_name_ar || ''}
            onChange={(e) => update({ full_name_ar: e.target.value })}
            disabled={disabled}
            placeholder={placeholderAr}
            dir="rtl"
            maxLength={100}
            className={cn('h-10 ps-9 rounded-xl', errors?.full_name_ar && 'border-destructive')}
          />
        </div>
        {errors?.full_name_ar && <p className="text-xs text-destructive">{errors.full_name_ar}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5 text-muted-foreground" />
          {labelEn}
          {required && <span className="text-destructive">*</span>}
          {enableTranslate && (
            <Button
              type="button" size="sm" variant="ghost"
              className="ms-auto h-6 px-2 text-[10.5px] gap-1 text-muted-foreground hover:text-primary"
              disabled={disabled || translating !== null}
              onClick={() => handleTranslate('en')}
              title={isRTL ? 'ترجمة من الإنجليزي إلى العربي' : 'Translate English → Arabic'}
            >
              {translating === 'en' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
              <span>→ AR</span>
            </Button>
          )}
        </Label>
        <div className="relative">
          <FieldIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={value.full_name_en || ''}
            onChange={(e) => update({ full_name_en: e.target.value })}
            disabled={disabled}
            placeholder={placeholderEn}
            dir="ltr"
            maxLength={100}
            className={cn('h-10 ps-9 rounded-xl', errors?.full_name_en && 'border-destructive')}
          />
        </div>
        {errors?.full_name_en && <p className="text-xs text-destructive">{errors.full_name_en}</p>}
      </div>

      {showUsername && (
        <div className="md:col-span-2">
          <UsernamePicker
            value={value.username || ''}
            onChange={(v) => update({ username: v })}
            onValidChange={onUsernameValidChange}
            excludeUserId={excludeUserId ?? null}
            isRTL={isRTL}
            label={usernameLabel}
            required={required}
            placeholder={usernamePlaceholder}
            serverError={usernameServerError}
          />
          {errors?.username && <p className="text-xs text-destructive mt-1">{errors.username}</p>}
        </div>
      )}
    </div>
  );
};

export default BilingualNameField;