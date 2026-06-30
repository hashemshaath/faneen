/**
 * CountryCodeSelect — searchable country dialing-code picker.
 *
 * Visual reference: flag + dial code trigger, popover with search input,
 * checkable list of countries with bilingual names. Used by PhoneField and
 * PhoneInput so every phone input across the app shares the same UX.
 */
import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { countryCodes } from '@/services/auth/constants';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

export interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export const CountryCodeSelect: React.FC<CountryCodeSelectProps> = ({
  value, onChange, disabled, error, className,
}) => {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = countryCodes.find(c => c.code === value) ?? countryCodes[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countryCodes;
    return countryCodes.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name_ar.toLowerCase().includes(q) ||
      c.name_en.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={isRTL ? 'مفتاح الدولة' : 'Country code'}
          aria-expanded={open}
          className={cn(
            'inline-flex items-center gap-1.5 h-10 min-w-[110px] rounded-xl border border-input bg-background px-3 text-sm tech-content',
            'focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          dir="ltr"
        >
          <span className="text-base leading-none">{selected.flag}</span>
          <span className="font-medium">{selected.code}</span>
          <ChevronDown className="ms-auto w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 w-[280px]"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRTL ? 'ابحث عن دولة...' : 'Search country...'}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {isRTL ? 'لا توجد نتائج' : 'No results'}
            </li>
          )}
          {filtered.map((c) => {
            const isSelected = c.code === value;
            return (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onChange(c.code); setOpen(false); setQuery(''); }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
                    isSelected && 'bg-primary/10 text-primary font-medium',
                  )}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 text-start truncate">
                    {isRTL ? c.name_ar : c.name_en}
                  </span>
                  <span className={cn('tech-content', isSelected ? 'text-primary' : 'text-muted-foreground')} dir="ltr">{c.code}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

export default CountryCodeSelect;