import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Plus, Search, Tag, X } from 'lucide-react';
import { DEFAULT_SERVICES_AR, DEFAULT_SERVICES_EN } from '../constants';

export interface ServiceChipSelectorProps {
  catalogNames: string[];
  values: string[];
  onChange: (v: string[]) => void;
  isRTL: boolean;
}

export const ServiceChipSelector: React.FC<ServiceChipSelectorProps> = ({ catalogNames, values, onChange, isRTL }) => {
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const allServices = useMemo(() => {
    const defaults = isRTL ? DEFAULT_SERVICES_AR : DEFAULT_SERVICES_EN;
    const combined = [...defaults, ...catalogNames];
    const seen = new Set<string>();
    return combined.filter((n) => {
      const l = n.toLowerCase();
      if (seen.has(l)) return false;
      seen.add(l);
      return true;
    });
  }, [catalogNames, isRTL]);

  const normalized = values.map((v) => v.trim()).filter(Boolean);
  const isSelected = (n: string) => normalized.some((v) => v.toLowerCase() === n.toLowerCase());
  const toggle = (n: string) => {
    if (isSelected(n)) onChange(normalized.filter((v) => v.toLowerCase() !== n.toLowerCase()));
    else onChange([...normalized, n]);
  };
  const addCustom = () => {
    const v = query.trim();
    if (!v) return;
    if (!isSelected(v)) onChange([...normalized, v]);
    setQuery('');
  };
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allServices;
    return allServices.filter((n) => n.toLowerCase().includes(q));
  }, [allServices, query]);
  const queryIsNew = query.trim().length > 0 && !allServices.some((n) => n.toLowerCase() === query.trim().toLowerCase()) && !isSelected(query.trim());

  return (
    <div className="space-y-2.5">
      {normalized.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {normalized.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 h-8 px-2.5 text-[12px] leading-none">
              <Tag className="w-3 h-3" />
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
          placeholder={t('ابحث عن خدمة أو أضف تخصصاً', 'Search services or add a specialty')}
          className="h-11 rounded-xl ps-9 pe-20 text-[14px]"
        />
        {queryIsNew && (
          <button type="button" onClick={addCustom} className="absolute end-1.5 top-1/2 -translate-y-1/2 h-8 px-2.5 rounded-lg text-[12px] font-medium bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
            <Plus className="w-3 h-3" />
            {t('إضافة', 'Add')}
          </button>
        )}
      </div>

      <div className="rounded-xl border bg-muted/20 p-2.5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
          {t('من خدمات المنصة', 'Platform catalog')}
        </div>
        <div className={`flex flex-wrap gap-1.5 overflow-hidden ${expanded ? 'max-h-none' : 'max-h-[80px]'}`}>
          {filtered.slice(0, 60).map((name) => {
            const active = isSelected(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className={`h-8 text-[12px] leading-none rounded-full border px-2.5 inline-flex items-center gap-1 ${
                  active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-primary/5 hover:border-primary/40'
                }`}
              >
                {!active && <Plus className="w-3 h-3 opacity-70" />}
                <span dir="auto">{name}</span>
              </button>
            );
          })}
        </div>
        {filtered.length > 6 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-[12px] font-medium text-primary hover:underline"
          >
            {expanded ? t('عرض أقل', 'Show less') : t('عرض المزيد', 'Show more')}
          </button>
        )}
      </div>
    </div>
  );
};