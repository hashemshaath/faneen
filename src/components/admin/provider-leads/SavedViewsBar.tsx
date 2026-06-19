/**
 * Saved Views — quick filter presets persisted to localStorage per
 * admin user. Stores the entire filter snapshot; a single click
 * restores it. No DB tables required.
 */
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Save, X, Bookmark } from 'lucide-react';
import { Bi } from '@/components/common/Bilingual';
import type { ProviderLeadStatus } from '@/modules/providers';
import type { SortKey } from './ProviderLeadsFilters';
import { toast } from 'sonner';

export interface ViewSnapshot {
  name: string;
  status: ProviderLeadStatus | 'all';
  city: string;
  minCompleteness: number;
  search: string;
  sort: SortKey;
}

const STORAGE_KEY = 'qitaat_provider_leads_views_v1';

function loadViews(): ViewSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ViewSnapshot[]) : [];
  } catch {
    return [];
  }
}

function persist(views: ViewSnapshot[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views.slice(0, 12)));
}

interface Props {
  current: Omit<ViewSnapshot, 'name'>;
  onApply: (v: ViewSnapshot) => void;
}

export const SavedViewsBar: React.FC<Props> = ({ current, onApply }) => {
  const [views, setViews] = useState<ViewSnapshot[]>(() => loadViews());
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => persist(views), [views]);

  const save = () => {
    const n = name.trim();
    if (!n) return;
    const next = [{ name: n, ...current }, ...views.filter((v) => v.name !== n)];
    setViews(next);
    setEditing(false);
    setName('');
    toast.success('تم حفظ العرض');
  };
  const remove = (n: string) => setViews(views.filter((v) => v.name !== n));

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border bg-muted/30 px-2 py-1.5 text-[11px]">
      <Bookmark className="me-0.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="me-1 text-muted-foreground"><Bi ar="عروض محفوظة" en="Saved views" /></span>
      {views.length === 0 && !editing && (
        <span className="text-muted-foreground/70"><Bi ar="لا توجد بعد — احفظ الفلاتر الحالية." en="None yet — save current filters." /></span>
      )}
      {views.map((v) => (
        <span key={v.name} className="group inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5">
          <button onClick={() => onApply(v)} className="inline-flex items-center gap-1 font-medium hover:text-primary">
            <Star className="h-3 w-3 text-warning" aria-hidden />
            {v.name}
          </button>
          <button onClick={() => remove(v.name)} className="opacity-0 transition group-hover:opacity-100" aria-label={`Delete ${v.name}`}>
            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </span>
      ))}
      <div className="ms-auto inline-flex items-center gap-1.5">
        {editing ? (
          <>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم العرض"
              onKeyDown={(e) => e.key === 'Enter' && save()}
              className="h-7 w-40 rounded-md text-[11px]"
            />
            <Button size="sm" onClick={save} className="h-7 rounded-md px-2 text-[11px]">
              <Save className="me-1 h-3 w-3" />حفظ
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 rounded-md px-2 text-[11px]">
              إلغاء
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 rounded-md px-2 text-[11px]">
            <Save className="me-1 h-3 w-3" /><Bi ar="حفظ كعرض" en="Save view" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default SavedViewsBar;