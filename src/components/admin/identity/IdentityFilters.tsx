/**
 * IdentityFilters — Compact quick-filter strip + Saved Views.
 * Persists named views to localStorage and writes filters into URL for
 * shareable deep links.
 */
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Bookmark, BookmarkPlus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

export interface IdentityFilterState {
  accountType: 'all' | 'individual' | 'business' | 'company';
  tier: 'all' | 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'all' | 'verified' | 'pending' | 'disabled' | 'active';
}

export const EMPTY_FILTERS: IdentityFilterState = {
  accountType: 'all', tier: 'all', status: 'all',
};

export interface SavedView {
  id: string;
  name: string;
  view: string;
  search: string;
  filters: IdentityFilterState;
  createdAt: string;
}

const STORAGE_KEY = 'qitaat_identity_saved_views_v1';

function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function persistViews(views: SavedView[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(views)); } catch { /* ignore */ }
}

interface Props {
  filters: IdentityFilterState;
  onChange: (next: IdentityFilterState) => void;
  currentView: string;
  currentSearch: string;
  onApplyView: (v: SavedView) => void;
  isRTL: boolean;
}

export const IdentityFilters: React.FC<Props> = ({
  filters, onChange, currentView, currentSearch, onApplyView, isRTL,
}) => {
  const [views, setViews] = useState<SavedView[]>([]);
  const [namingOpen, setNamingOpen] = useState(false);
  const [draftName, setDraftName] = useState('');

  useEffect(() => { setViews(loadViews()); }, []);

  const reset = () => onChange(EMPTY_FILTERS);
  const hasFilter = filters.accountType !== 'all' || filters.tier !== 'all' || filters.status !== 'all';

  const saveView = () => {
    const name = draftName.trim();
    if (!name) { toast.error(isRTL ? 'أدخل اسم العرض' : 'Enter a view name'); return; }
    const next: SavedView = {
      id: `v-${Date.now()}`, name, view: currentView,
      search: currentSearch, filters, createdAt: new Date().toISOString(),
    };
    const updated = [next, ...views].slice(0, 20);
    setViews(updated); persistViews(updated);
    setDraftName(''); setNamingOpen(false);
    toast.success(isRTL ? `تم حفظ "${name}"` : `Saved "${name}"`);
  };

  const deleteView = (id: string) => {
    const updated = views.filter(v => v.id !== id);
    setViews(updated); persistViews(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filters.accountType} onValueChange={(v: IdentityFilterState['accountType']) => onChange({ ...filters, accountType: v })}>
          <SelectTrigger className="h-9 rounded-xl w-auto min-w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'All types'}</SelectItem>
            <SelectItem value="individual">{isRTL ? 'فرد' : 'Individual'}</SelectItem>
            <SelectItem value="business">{isRTL ? 'مزود خدمة' : 'Provider'}</SelectItem>
            <SelectItem value="company">{isRTL ? 'شركة' : 'Company'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.tier} onValueChange={(v: IdentityFilterState['tier']) => onChange({ ...filters, tier: v })}>
          <SelectTrigger className="h-9 rounded-xl w-auto min-w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? 'كل العضويات' : 'All tiers'}</SelectItem>
            <SelectItem value="free">{isRTL ? 'مجاني' : 'Free'}</SelectItem>
            <SelectItem value="basic">{isRTL ? 'أساسي' : 'Basic'}</SelectItem>
            <SelectItem value="premium">{isRTL ? 'مميز' : 'Premium'}</SelectItem>
            <SelectItem value="enterprise">{isRTL ? 'مؤسسات' : 'Enterprise'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={(v: IdentityFilterState['status']) => onChange({ ...filters, status: v })}>
          <SelectTrigger className="h-9 rounded-xl w-auto min-w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? 'كل الحالات' : 'Any status'}</SelectItem>
            <SelectItem value="verified">{isRTL ? 'موثّق' : 'Verified'}</SelectItem>
            <SelectItem value="pending">{isRTL ? 'بانتظار المراجعة' : 'Pending'}</SelectItem>
            <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
            <SelectItem value="disabled">{isRTL ? 'معطّل' : 'Disabled'}</SelectItem>
          </SelectContent>
        </Select>
        {hasFilter && (
          <Button size="sm" variant="ghost" className="h-9 rounded-xl gap-1 text-xs" onClick={reset}>
            <X className="w-3 h-3" />{isRTL ? 'مسح الفلاتر' : 'Clear filters'}
          </Button>
        )}
        <div className="ms-auto flex items-center gap-1.5">
          {!namingOpen ? (
            <Button size="sm" variant="outline" className="h-9 rounded-xl gap-1.5 text-xs"
              onClick={() => setNamingOpen(true)}>
              <BookmarkPlus className="w-3.5 h-3.5" />{isRTL ? 'حفظ كعرض' : 'Save view'}
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveView(); if (e.key === 'Escape') { setNamingOpen(false); setDraftName(''); } }}
                placeholder={isRTL ? 'اسم العرض' : 'View name'}
                className="h-9 rounded-xl w-40 text-xs" />
              <Button size="sm" className="h-9 rounded-xl text-xs" onClick={saveView}>{isRTL ? 'حفظ' : 'Save'}</Button>
              <Button size="sm" variant="ghost" className="h-9 rounded-xl text-xs" onClick={() => { setNamingOpen(false); setDraftName(''); }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {views.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Bookmark className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground shrink-0">{isRTL ? 'العروض المحفوظة:' : 'Saved views:'}</span>
          {views.map(v => (
            <Badge key={v.id} variant="outline"
              className="cursor-pointer hover:bg-accent/10 hover:border-accent/40 group text-[10px] gap-1 px-2 py-0.5"
              onClick={() => onApplyView(v)}>
              {v.name}
              <button onClick={(e) => { e.stopPropagation(); deleteView(v.id); }}
                className="opacity-0 group-hover:opacity-100 text-destructive">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};