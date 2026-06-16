/**
 * BilingualNameField — unified name capture across the app.
 *
 * Three inputs: Arabic name, English name, optional username (@handle).
 * Auto-fills `full_name` from AR or EN when consumers need a single string.
 */
import React, { useId, useMemo, useState } from 'react';
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
  const [touched, setTouched] = useState<{ ar?: boolean; en?: boolean }>({});
  const uid = useId();
  const arId = `${uid}-name-ar`;
  const enId = `${uid}-name-en`;
  const arErrId = `${arId}-err`;
  const enErrId = `${enId}-err`;
  const arHintId = `${arId}-hint`;
  const enHintId = `${enId}-hint`;
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

  // Soft, in-field validation (does not block submit — parent `errors` still wins).
  const arRaw = value.full_name_ar || '';
  const enRaw = value.full_name_en || '';
  const arTrim = arRaw.trim();
  const enTrim = enRaw.trim();
  const ARABIC_RE = /[\u0600-\u06FF]/;
  const LATIN_RE = /[A-Za-z]/;
  const DIGIT_RE = /\d/;
  const localArError = useMemo(() => {
    if (!touched.ar || !arTrim) return null;
    if (arTrim.length < 2) return isRTL ? 'الاسم قصير جدًا (حرفان على الأقل)' : 'Name too short (min 2 chars)';
    if (!ARABIC_RE.test(arTrim)) return isRTL ? 'يجب أن يحتوي الاسم على حروف عربية' : 'Must contain Arabic letters';
    if (DIGIT_RE.test(arTrim)) return isRTL ? 'لا يُسمح بالأرقام في الاسم' : 'Digits are not allowed in the name';
    return null;
  }, [touched.ar, arTrim, isRTL]);
  const localEnError = useMemo(() => {
    if (!touched.en || !enTrim) return null;
    if (enTrim.length < 2) return isRTL ? 'الاسم قصير جدًا (حرفان على الأقل)' : 'Name too short (min 2 chars)';
    if (!LATIN_RE.test(enTrim)) return isRTL ? 'يجب أن يحتوي الاسم على حروف لاتينية (A-Z)' : 'Must contain Latin letters (A–Z)';
    if (DIGIT_RE.test(enTrim)) return isRTL ? 'لا يُسمح بالأرقام في الاسم' : 'Digits are not allowed in the name';
    return null;
  }, [touched.en, enTrim, isRTL]);
  const arError = errors?.full_name_ar || localArError;
  const enError = errors?.full_name_en || localEnError;
  const previewLabel = isRTL ? 'معاينة' : 'Preview';

  return (
    <div className={cn('flex flex-col gap-4', className)} role="group" aria-label={isRTL ? 'حقول الاسم' : 'Name fields'}>
      <div className="space-y-2 min-w-0">
        <Label htmlFor={arId} className="text-xs font-semibold flex flex-wrap items-center gap-2">
          <span className="truncate">{labelAr}</span>
          {required && <span className="text-destructive leading-none" aria-hidden="true">*</span>}
          <span
            aria-hidden="true"
            className="ms-auto inline-flex items-center justify-center h-5 min-w-[26px] px-1.5 rounded-md bg-muted text-[10px] font-bold tracking-wide text-muted-foreground tech-content"
          >
            AR
          </span>
          {enableTranslate && (
            <Button
              type="button" size="sm" variant="ghost"
              className="h-6 px-2 text-[10.5px] gap-1 text-muted-foreground hover:text-primary"
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
          <FieldIcon aria-hidden="true" className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
          <Input
            id={arId}
            name="full_name_ar"
            lang="ar"
            autoComplete="given-name"
            inputMode="text"
            aria-required={required || undefined}
            aria-invalid={arError ? true : undefined}
            aria-describedby={cn(arError ? arErrId : '', arTrim ? arHintId : '').trim() || undefined}
            onBlur={() => setTouched((t) => ({ ...t, ar: true }))}
            value={value.full_name_ar || ''}
            onChange={(e) => update({ full_name_ar: e.target.value })}
            disabled={disabled}
            placeholder={placeholderAr}
            dir="rtl"
            maxLength={100}
            className={cn(
              'h-12 ps-10 rounded-xl text-sm placeholder:text-muted-foreground/50',
              'transition-colors focus-visible:ring-2 focus-visible:ring-primary/30',
              arError && 'border-destructive focus-visible:ring-destructive/30',
            )}
          />
        </div>
        {arTrim && !arError && (
          <p id={arHintId} dir="rtl" className="text-[11px] text-muted-foreground truncate">
            <span className="me-1 opacity-70">{previewLabel}:</span>
            <span className="font-medium text-foreground">{arTrim}</span>
          </p>
        )}
        {arError && (
          <p id={arErrId} role="alert" aria-live="polite" className="text-xs text-destructive">
            {arError}
          </p>
        )}
      </div>

      <div className="space-y-2 min-w-0">
        <Label htmlFor={enId} className="text-xs font-semibold flex flex-wrap items-center gap-2">
          <span className="truncate">{labelEn}</span>
          {required && <span className="text-destructive leading-none" aria-hidden="true">*</span>}
          <span
            aria-hidden="true"
            className="ms-auto inline-flex items-center justify-center h-5 min-w-[26px] px-1.5 rounded-md bg-muted text-[10px] font-bold tracking-wide text-muted-foreground tech-content"
          >
            EN
          </span>
          {enableTranslate && (
            <Button
              type="button" size="sm" variant="ghost"
              className="h-6 px-2 text-[10.5px] gap-1 text-muted-foreground hover:text-primary"
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
          <FieldIcon aria-hidden="true" className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
          <Input
            id={enId}
            name="full_name_en"
            lang="en"
            autoComplete="given-name"
            inputMode="text"
            aria-required={required || undefined}
            aria-invalid={enError ? true : undefined}
            aria-describedby={cn(enError ? enErrId : '', enTrim ? enHintId : '').trim() || undefined}
            onBlur={() => setTouched((t) => ({ ...t, en: true }))}
            value={value.full_name_en || ''}
            onChange={(e) => update({ full_name_en: e.target.value })}
            disabled={disabled}
            placeholder={placeholderEn}
            dir="ltr"
            maxLength={100}
            className={cn(
              'h-12 ps-10 rounded-xl text-sm placeholder:text-muted-foreground/50',
              'transition-colors focus-visible:ring-2 focus-visible:ring-primary/30',
              enError && 'border-destructive focus-visible:ring-destructive/30',
            )}
          />
        </div>
        {enTrim && !enError && (
          <p id={enHintId} dir="ltr" className="text-[11px] text-muted-foreground truncate">
            <span className="me-1 opacity-70">{previewLabel}:</span>
            <span className="font-medium text-foreground">{enTrim}</span>
          </p>
        )}
        {enError && (
          <p id={enErrId} role="alert" aria-live="polite" className="text-xs text-destructive">
            {enError}
          </p>
        )}
      </div>

      {showUsername && (
        <div>
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