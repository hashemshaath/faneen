/**
 * Per-lead Google quick-search log. Entries persist in localStorage under
 * `qitaat_provider_lead_google_log_v1` keyed by lead id. The operator can
 * run a fresh search (auto-includes name + city + CR + specialties),
 * save/label any entry, copy the URL to clipboard, or reopen it later.
 */
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Copy, Star, StarOff, Trash2, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ProviderLeadRow } from '@/modules/providers';
import { Bi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';

const STORAGE_KEY = 'qitaat_provider_lead_google_log_v1';

export interface GoogleLogEntry {
  id: string;
  query: string;
  url: string;
  at: string;
  saved?: boolean;
  label?: string;
}

type LogMap = Record<string, GoogleLogEntry[]>;

function readAll(): LogMap {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as LogMap;
  } catch {
    return {};
  }
}

function writeAll(map: LogMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function buildGoogleQuery(lead: ProviderLeadRow, extras?: string): string {
  const parts = [
    lead.name_ar,
    lead.name_en,
    lead.city,
    lead.cr_number ? `سجل ${lead.cr_number}` : null,
    ...(lead.specialties ?? []).slice(0, 4),
    extras,
  ].filter(Boolean) as string[];
  return parts.join(' ');
}

export function googleUrl(q: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

interface Props {
  lead: ProviderLeadRow;
}

export const GoogleSearchLog: React.FC<Props> = ({ lead }) => {
  const { isRTL } = useLanguage();
  const t = (ar: string, en: string) => (isRTL ? ar : en);
  const [entries, setEntries] = useState<GoogleLogEntry[]>([]);
  const [extra, setExtra] = useState('');

  useEffect(() => {
    setEntries(readAll()[lead.id] ?? []);
  }, [lead.id]);

  const persist = (next: GoogleLogEntry[]) => {
    setEntries(next);
    const all = readAll();
    if (next.length === 0) delete all[lead.id];
    else all[lead.id] = next;
    writeAll(all);
  };

  const runSearch = () => {
    const q = buildGoogleQuery(lead, extra.trim() || undefined);
    const url = googleUrl(q);
    const entry: GoogleLogEntry = {
      id: `${Date.now()}`,
      query: q,
      url,
      at: new Date().toISOString(),
    };
    persist([entry, ...entries].slice(0, 50));
    window.open(url, '_blank', 'noopener,noreferrer');
    setExtra('');
  };

  const toggleSave = (id: string) =>
    persist(entries.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e)));

  const remove = (id: string) => {
    const e = entries.find((x) => x.id === id);
    if (e?.saved) {
      // Protect saved entries unless explicitly unsaved first.
      toast.info(t('ألغِ الحفظ أولًا', 'Unsave first'));
      return;
    }
    persist(entries.filter((e2) => e2.id !== id));
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('تم النسخ', 'Copied'));
    } catch {
      toast.error(t('تعذر النسخ', 'Copy failed'));
    }
  };

  const setLabel = (id: string, label: string) =>
    persist(entries.map((e) => (e.id === id ? { ...e, label } : e)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={t('كلمات إضافية (اختياري)', 'Extra terms (optional)')}
          className="h-9 flex-1 rounded-xl text-[12px]"
        />
        <Button onClick={runSearch} size="sm" className="hover-lift h-9 rounded-xl">
          <Search className="me-1.5 h-3.5 w-3.5" aria-hidden />
          <Bi ar="بحث الآن" en="Search now" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        <Bi
          ar="يشمل الاستعلام تلقائيًا: الاسم، المدينة، السجل، وحتى 4 تخصصات."
          en="Query auto-includes: name, city, CR, and up to 4 specialties."
        />
      </p>

      {entries.length === 0 ? (
        <p className="rounded-xl border bg-muted/30 p-4 text-center text-[11px] text-muted-foreground">
          <Bi ar="لا يوجد سجل بحث بعد." en="No search history yet." />
        </p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((e) => (
            <li key={e.id} className={`rounded-xl border p-2 ${e.saved ? 'border-primary/40 bg-primary/[0.03]' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium" title={e.query}>
                    {e.label ? <span className="me-1 text-primary">[{e.label}]</span> : null}
                    {e.query}
                  </p>
                  <p className="tech-content text-[10px] text-muted-foreground">
                    {new Date(e.at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(e.url)} title={t('نسخ', 'Copy')}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild title={t('فتح', 'Open')}>
                    <a href={e.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${e.saved ? 'text-primary' : ''}`}
                    onClick={() => toggleSave(e.id)}
                    title={e.saved ? t('إلغاء الحفظ', 'Unsave') : t('حفظ', 'Save')}
                  >
                    {e.saved ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => remove(e.id)}
                    title={t('حذف', 'Delete')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {e.saved && (
                <Input
                  value={e.label ?? ''}
                  onChange={(ev) => setLabel(e.id, ev.target.value)}
                  placeholder={t('تسمية (اختياري)', 'Label (optional)')}
                  className="mt-1.5 h-7 rounded-lg text-[11px]"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};