import React, { useMemo, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Info, Plus, Search, Tag, X, Paperclip, CheckCircle2, FileText } from 'lucide-react';

export interface CategoryOption {
  id: string;
  name_ar: string;
  name_en: string;
}

export const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2.5 pb-3 mb-1 border-b border-border/60">
    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center [&_svg]:w-[18px] [&_svg]:h-[18px]">{icon}</span>
    <h2 className="text-[15px] sm:text-base font-semibold leading-snug tracking-tight">{title}</h2>
  </div>
);

export const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
}> = ({ label, children, hint, error, htmlFor, required }) => {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errId = htmlFor ? `${htmlFor}-err` : undefined;
  return (
    <div className="space-y-1.5" data-field-error={error ? 'true' : undefined}>
      <Label htmlFor={htmlFor} className="text-[13px] font-medium leading-tight flex items-center gap-1 text-foreground/90">
        <span>{label}</span>
        {required && <span className="text-destructive" aria-hidden>*</span>}
      </Label>
      {children}
      {error ? (
        <p id={errId} className="text-[12px] leading-[16px] text-destructive flex items-start gap-1" role="alert">
          <AlertCircle className="w-3.5 h-3.5 mt-[2px] shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[11.5px] leading-[16px] text-muted-foreground flex items-start gap-1">
          <Info className="w-3.5 h-3.5 mt-[2px] shrink-0 opacity-70" />
          <span>{hint}</span>
        </p>
      ) : null}
    </div>
  );
};

/** Tailwind classes to mark an input as invalid (red ring + border). */
export const invalidInputClass = (hasError?: boolean) =>
  hasError ? 'border-destructive focus-visible:ring-destructive/40' : '';

/**
 * Default platform services always shown alongside catalog categories.
 */
const DEFAULT_SERVICES_AR = [
  'مطابخ ألمنيوم',
  'مطابخ خشب',
  'مطابخ عالمية',
  'أنظمة ذكية',
  'مصاعد',
  'حلول استدامة',
  'طاقة شمسية',
  'أنظمة مراقبة',
  'ديكورات خشبية',
  'أعمال ديكور',
  'خزائن ملابس',
];

const DEFAULT_SERVICES_EN = [
  'Aluminum Kitchens',
  'Wood Kitchens',
  'Modern Kitchens',
  'Smart Systems',
  'Elevators',
  'Sustainability Solutions',
  'Solar Energy',
  'Surveillance Systems',
  'Wood Decorations',
  'Decor Works',
  'Wardrobes',
];

/**
 * SpecialtiesPicker — links to the site's categories catalog.
 * Users pick from existing services (chips) or add custom specialties.
 */
export const SpecialtiesPicker: React.FC<{
  catalog: CategoryOption[];
  values: string[];
  onChange: (v: string[]) => void;
  isRTL: boolean;
}> = ({ catalog, values, onChange, isRTL }) => {
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const catalogNames = useMemo(
    () => catalog.map((c) => (isRTL ? c.name_ar : c.name_en) || c.name_ar || c.name_en),
    [catalog, isRTL],
  );

  // Merge catalog with default services (defaults first, then catalog, deduplicated)
  const allServices = useMemo(() => {
    const defaults = isRTL ? DEFAULT_SERVICES_AR : DEFAULT_SERVICES_EN;
    const combined = [...defaults, ...catalogNames];
    const seen = new Set<string>();
    return combined.filter((n) => {
      const lower = n.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [catalogNames, isRTL]);

  const normalized = values.map((v) => v.trim()).filter(Boolean);
  const isSelected = (name: string) => normalized.some((v) => v.toLowerCase() === name.toLowerCase());

  const toggle = (name: string) => {
    if (isSelected(name)) {
      onChange(normalized.filter((v) => v.toLowerCase() !== name.toLowerCase()));
    } else {
      onChange([...normalized, name]);
    }
  };

  const addCustom = () => {
    const v = query.trim();
    if (!v) return;
    if (!isSelected(v)) onChange([...normalized, v]);
    setQuery('');
  };

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allServices;
    return allServices.filter((n) => n.toLowerCase().includes(q));
  }, [allServices, query]);

  const queryIsNew =
    query.trim().length > 0 &&
    !allServices.some((n) => n.toLowerCase() === query.trim().toLowerCase()) &&
    !isSelected(query.trim());

  return (
    <div className="space-y-3">
      {normalized.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {normalized.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 h-[34px] px-3 py-1.5 text-[12px] leading-none">
              <Tag className="w-3.5 h-3.5" />
              <span dir="auto">{v}</span>
              <button type="button" onClick={() => toggle(v)} className="rounded-full hover:bg-primary/20 p-0.5 -me-1" aria-label={t('إزالة', 'Remove')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          dir="auto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder={t('ابحث في الخدمات أو أضف تخصصاً جديداً', 'Search services or add a custom specialty')}
          className="h-[46px] sm:h-12 rounded-xl ps-9 pe-24 text-[14px] placeholder:text-[13px]"
        />
        {queryIsNew && (
          <button type="button" onClick={addCustom} className="absolute end-1.5 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg text-[12px] font-medium bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            {t('إضافة', 'Add')}
          </button>
        )}
      </div>

      <div className="rounded-xl border bg-muted/20 p-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
          {t('من خدمات المنصة', 'From platform catalog')}
        </div>
        {filteredCatalog.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-2">
            {t('لا توجد نتائج — يمكنك إضافتها كتخصص مخصص.', 'No match — add as a custom specialty.')}
          </p>
        ) : (
          <>
            {/* Mobile: 2-row collapse with show-more; Desktop: scroll list */}
            <div
              className={`flex flex-wrap gap-1.5 overflow-hidden sm:max-h-40 sm:overflow-y-auto sm:no-scrollbar ${
                expanded ? 'max-h-none' : 'max-h-[84px]'
              } sm:max-h-40`}
            >
              {filteredCatalog.slice(0, 70).map((name) => {
                const active = isSelected(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggle(name)}
                    className={`h-[34px] text-[12px] leading-none rounded-full border px-3 py-1.5 transition-all inline-flex items-center gap-1 ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-primary/5 hover:border-primary/40'
                    }`}
                  >
                    {!active && <Plus className="w-3 h-3 opacity-70" />}
                    <span dir="auto">{name}</span>
                  </button>
                );
              })}
            </div>
            {filteredCatalog.length > 6 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="sm:hidden mt-2 text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                {expanded ? t('عرض أقل', 'Show less') : t('عرض المزيد', 'Show more')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * FileUploadField — compact mobile-friendly file picker matching the design spec.
 * Container 52px, button 40px × ~100px, file-name 12px.
 */
export const FileUploadField: React.FC<{
  file: File | null;
  accept?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  buttonLabel: string;
  emptyLabel: string;
}> = ({ file, accept, onChange, buttonLabel, emptyLabel }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="h-[52px] rounded-xl border bg-background flex items-center gap-2 ps-3 pe-1.5 relative">
      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
      <span
        className={`flex-1 min-w-0 truncate text-[12px] ${
          file ? 'text-foreground' : 'text-muted-foreground'
        }`}
        dir="auto"
      >
        {file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : emptyLabel}
      </span>
      {file && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="h-10 min-w-[100px] px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 shrink-0"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {buttonLabel}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        onChange={onChange}
        className="sr-only"
      />
    </div>
  );
};

/**
 * TagInput — generic free-form chip input (used for Brands).
 */
export const TagInput: React.FC<{
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  dir?: 'auto' | 'ltr' | 'rtl';
}> = ({ values, onChange, placeholder, dir = 'auto' }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (!values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setInput('');
  };
  return (
    <div className="rounded-xl border bg-background px-2.5 py-2 min-h-[3rem] flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm border">
          <span dir="auto">{v}</span>
          <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="rounded-full hover:bg-foreground/10 p-0.5">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        dir={dir}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !input && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={add}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm px-1.5 py-1"
      />
    </div>
  );
};