import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, Tag, X } from 'lucide-react';

export interface CategoryOption {
  id: string;
  name_ar: string;
  name_en: string;
}

export const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 pb-2 border-b">
    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</span>
    <h2 className="text-lg font-semibold">{title}</h2>
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-sm">{label}</Label>
    {children}
  </div>
);

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

  const catalogNames = useMemo(
    () => catalog.map((c) => (isRTL ? c.name_ar : c.name_en) || c.name_ar || c.name_en),
    [catalog, isRTL],
  );

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
    if (!q) return catalogNames;
    return catalogNames.filter((n) => n.toLowerCase().includes(q));
  }, [catalogNames, query]);

  const queryIsNew =
    query.trim().length > 0 &&
    !catalogNames.some((n) => n.toLowerCase() === query.trim().toLowerCase()) &&
    !isSelected(query.trim());

  return (
    <div className="space-y-3">
      {normalized.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {normalized.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-sm">
              <Tag className="w-3.5 h-3.5" />
              <span dir="auto">{v}</span>
              <button type="button" onClick={() => toggle(v)} className="rounded-full hover:bg-primary/20 p-0.5" aria-label={t('إزالة', 'Remove')}>
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
          className="h-12 rounded-xl ps-9 pe-24"
        />
        {queryIsNew && (
          <button type="button" onClick={addCustom} className="absolute end-1.5 top-1/2 -translate-y-1/2 h-9 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
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
          <p className="text-xs text-muted-foreground py-2">
            {t('لا توجد نتائج — يمكنك إضافتها كتخصص مخصص.', 'No match — add as a custom specialty.')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto no-scrollbar">
            {filteredCatalog.slice(0, 60).map((name) => {
              const active = isSelected(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggle(name)}
                  className={`text-xs rounded-full border px-3 py-1.5 transition-all ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-primary/5 hover:border-primary/40'}`}
                >
                  <span dir="auto">{name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
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