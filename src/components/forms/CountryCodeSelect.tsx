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
      c.short_ar.toLowerCase().includes(q) ||
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
            'inline-flex items-center gap-2 h-11 min-w-[120px] rounded-xl border border-input bg-background ps-3 pe-2.5 text-sm tech-content',
            'transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          dir="ltr"
        >
          <span className="text-lg leading-none">{selected.flag}</span>
          <span className="font-semibold tracking-tight">{selected.code}</span>
          <ChevronDown
            className={cn(
              'ms-auto w-4 h-4 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180 text-foreground',
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="p-0 w-[300px] overflow-hidden rounded-xl border border-border/80 shadow-lg"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-2 border-b bg-muted/30 px-3.5 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRTL ? 'ابحث عن دولة...' : 'Search country...'}
            className="flex-1 bg-transparent text-sm leading-none outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto py-1.5" role="listbox">
          {filtered.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {isRTL ? 'لا توجد نتائج' : 'No results'}
            </li>
          )}
          {filtered.map((c) => {
            const isSelected = c.code === value;
            return (
              <li key={c.code} className="px-1.5">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onChange(c.code); setOpen(false); setQuery(''); }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                    'hover:bg-accent focus-visible:bg-accent focus:outline-none',
                    isSelected && 'bg-primary/10 text-primary hover:bg-primary/15',
                  )}
                >
                  <span className="text-lg leading-none shrink-0">{c.flag}</span>
                  <span className={cn('flex-1 text-start truncate', isSelected && 'font-semibold')}>
                    {isRTL ? c.short_ar : c.name_en}
                  </span>
                  <span
                    className={cn(
                      'tech-content text-xs tabular-nums',
                      isSelected ? 'text-primary font-semibold' : 'text-muted-foreground',
                    )}
                    dir="ltr"
                  >
                    {c.code}
                  </span>
                  <Check
                    className={cn(
                      'w-4 h-4 shrink-0 transition-opacity',
                      isSelected ? 'opacity-100 text-primary' : 'opacity-0',
                    )}
                  />
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