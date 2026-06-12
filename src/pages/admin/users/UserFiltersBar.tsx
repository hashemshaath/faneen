import React from 'react';
import {
  ArrowUpDown, Briefcase, Building2, Ban, ChevronDown, ChevronUp,
  Command, Crown, Filter, LayoutList, Link2, Rows3, Search, Shield,
  Sparkles, Users, X, Zap,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pickBi } from '@/components/common/Bilingual';
import type {
  Density, SortKey, SortDir, FilterScope, FilterBusinessLink,
} from './_shared';

/**
 * PR-4 of the AdminUsers refactor. Controlled filters/scope/sort/density bar.
 *
 * All filter state still lives in `AdminUsers.tsx` — this component is purely
 * a controlled view. Setters are passed verbatim; the parent already
 * wraps the relevant ones in `useCallback` (e.g. `handleSearchChange`) so we
 * do not re-wrap here.
 */
export type UserFiltersBarProps = {
  isRTL: boolean;

  // Scope + quick-filter chip state
  filterScope: FilterScope;
  setFilterScope: (v: FilterScope) => void;
  filterAccountType: string;
  setFilterAccountType: (v: string) => void;
  filterTier: string;
  setFilterTier: (v: string) => void;
  filterRole: string;
  setFilterRole: (v: string) => void;
  filterBusinessLink: FilterBusinessLink;
  setFilterBusinessLink: (v: FilterBusinessLink) => void;
  setSortKey: (v: SortKey) => void;
  setSortDir: (v: SortDir) => void;
  setPage: (n: number) => void;

  // Search row
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchTerm: string;
  handleSearchChange: (val: string) => void;
  deferredSearch: string;

  // Selection / counts
  allOnPageSelected: boolean;
  toggleSelectPage: () => void;
  resultsCount: number;
  page: number;
  totalPages: number;

  // Density + sort
  density: Density;
  setDensity: (d: Density) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  cycleSort: (key: SortKey) => void;
};

export const UserFiltersBar = React.memo(({
  isRTL,
  filterScope, setFilterScope,
  filterAccountType, setFilterAccountType,
  filterTier, setFilterTier,
  filterRole, setFilterRole,
  filterBusinessLink, setFilterBusinessLink,
  setSortKey, setSortDir, setPage,
  searchInputRef, searchTerm, handleSearchChange, deferredSearch,
  allOnPageSelected, toggleSelectPage,
  resultsCount, page, totalPages,
  density, setDensity,
  sortKey, sortDir, cycleSort,
}: UserFiltersBarProps) => (
  <>
    {/* Scope + Quick filter chips */}
    <div className="flex items-center gap-2 flex-wrap">
      {([
        { key: 'all',      icon: Users, ar: 'الجميع',         en: 'All',      active: filterScope === 'all' },
        { key: 'staff',    icon: Crown, ar: 'فريق الإدارة',   en: 'Staff',    active: filterScope === 'staff' },
        { key: 'disabled', icon: Ban,   ar: 'المعطّلون',      en: 'Disabled', active: filterScope === 'disabled' },
      ] as const).map(s => {
        const Icon = s.icon;
        return (
          <button key={s.key} onClick={() => { setFilterScope(s.key); setPage(1); }}
            className={`text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all
              ${s.active ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
            <Icon className="w-3 h-3" />{isRTL ? s.ar : s.en}
          </button>
        );
      })}
      <span className="text-border/60" aria-hidden>•</span>
      {([
        { key: 'recent', icon: Zap, ar: 'أحدث 7 أيام', en: 'New 7d', active: false, onClick: () => { setSortKey('created_at'); setSortDir('desc'); } },
        { key: 'providers', icon: Briefcase, ar: 'مزودي الخدمات', en: 'Providers', active: filterAccountType === 'business', onClick: () => { setFilterAccountType(filterAccountType === 'business' ? 'all' : 'business'); setPage(1); } },
        { key: 'companies', icon: Building2, ar: 'الشركات', en: 'Companies', active: filterAccountType === 'company', onClick: () => { setFilterAccountType(filterAccountType === 'company' ? 'all' : 'company'); setPage(1); } },
        { key: 'premium', icon: Crown, ar: 'مميز فأعلى', en: 'Premium+', active: filterTier === 'premium' || filterTier === 'enterprise', onClick: () => { setFilterTier(filterTier === 'premium' ? 'enterprise' : filterTier === 'enterprise' ? 'all' : 'premium'); setPage(1); } },
        { key: 'no_role', icon: Shield, ar: 'بدون صلاحيات', en: 'No role', active: filterRole === 'no_role', onClick: () => { setFilterRole(filterRole === 'no_role' ? 'all' : 'no_role'); setPage(1); } },
        { key: 'multi', icon: Link2, ar: 'مرتبط بعدة منشآت', en: 'Multi-business', active: filterBusinessLink === 'multi', onClick: () => { setFilterBusinessLink(filterBusinessLink === 'multi' ? 'all' : 'multi'); setPage(1); } },
      ]).map(c => {
        const Icon = c.icon;
        return (
          <button key={c.key} onClick={c.onClick}
            className={`text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all
              ${c.active ? 'bg-accent text-accent-foreground border-accent shadow-sm' : 'bg-card border-border/40 text-muted-foreground hover:border-accent/40 hover:text-foreground'}`}>
            <Icon className="w-3 h-3" />{isRTL ? c.ar : c.en}
          </button>
        );
      })}
    </div>

    {/* Filters */}
    <div className="rounded-2xl border border-border/30 bg-card p-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" style={{ insetInlineStart: '12px' }} />
          <Input ref={searchInputRef} value={searchTerm} onChange={e => handleSearchChange(e.target.value)}
           placeholder={pickBi(isRTL, 'بحث بالاسم، البريد، الجوال، أو رقم USR/ENT', 'Search by name, email, phone, USR or ENT')}
            className="ps-10 pe-16 h-10 rounded-xl bg-muted/30 border-border/20 focus:bg-background" dir="auto" />
          <kbd className="hidden sm:inline-flex absolute top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-border/40 bg-background/80 text-[10px] text-muted-foreground font-mono pointer-events-none"
            style={{ insetInlineEnd: '10px' }}>
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>
        <Select value={filterRole} onValueChange={(v) => { setFilterRole(v); setPage(1); }}>
          <SelectTrigger className="w-full md:w-40 h-10 rounded-xl"><Filter className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pickBi(isRTL, 'كل الصلاحيات', 'All Roles')}</SelectItem>
            <SelectItem value="super_admin">{pickBi(isRTL, 'مشرف أعلى', 'Super Admin')}</SelectItem>
            <SelectItem value="admin">{pickBi(isRTL, 'مشرف', 'Admin')}</SelectItem>
            <SelectItem value="moderator">{pickBi(isRTL, 'مشرف محتوى', 'Moderator')}</SelectItem>
            <SelectItem value="user">{pickBi(isRTL, 'مستخدم', 'User')}</SelectItem>
            <SelectItem value="no_role">{pickBi(isRTL, 'بدون صلاحيات', 'No Role')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAccountType} onValueChange={(v) => { setFilterAccountType(v); setPage(1); }}>
          <SelectTrigger className="w-full md:w-40 h-10 rounded-xl"><Building2 className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pickBi(isRTL, 'كل الأنواع', 'All Types')}</SelectItem>
            <SelectItem value="individual">{pickBi(isRTL, 'أفراد', 'Individuals')}</SelectItem>
            <SelectItem value="business">{pickBi(isRTL, 'مزودين', 'Providers')}</SelectItem>
            <SelectItem value="company">{pickBi(isRTL, 'شركات', 'Companies')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTier} onValueChange={(v) => { setFilterTier(v); setPage(1); }}>
          <SelectTrigger className="w-full md:w-36 h-10 rounded-xl"><Sparkles className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pickBi(isRTL, 'كل العضويات', 'All Tiers')}</SelectItem>
            <SelectItem value="free">{pickBi(isRTL, 'مجاني', 'Free')}</SelectItem>
            <SelectItem value="basic">{pickBi(isRTL, 'أساسي', 'Basic')}</SelectItem>
            <SelectItem value="premium">{pickBi(isRTL, 'مميز', 'Premium')}</SelectItem>
            <SelectItem value="enterprise">{pickBi(isRTL, 'مؤسسات', 'Enterprise')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBusinessLink} onValueChange={(v) => { setFilterBusinessLink(v as FilterBusinessLink); setPage(1); }}>
          <SelectTrigger className="w-full md:w-44 h-10 rounded-xl"><Link2 className="w-4 h-4 me-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pickBi(isRTL, 'كل الارتباطات', 'All links')}</SelectItem>
            <SelectItem value="none">{pickBi(isRTL, 'بدون منشآت', 'No business')}</SelectItem>
            <SelectItem value="single">{pickBi(isRTL, 'منشأة واحدة', 'Single business')}</SelectItem>
            <SelectItem value="multi">{pickBi(isRTL, 'عدة منشآت', 'Multiple businesses')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Sort + select-all + counter */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20 flex-wrap">
        <Checkbox checked={allOnPageSelected} onCheckedChange={() => toggleSelectPage()} />
        <span className="text-[11px] text-muted-foreground">
          {isRTL ? `${resultsCount} نتيجة • صفحة ${page}/${totalPages}` : `${resultsCount} results • Page ${page}/${totalPages}`}
        </span>
        {(deferredSearch || filterRole !== 'all' || filterAccountType !== 'all' || filterTier !== 'all' || filterBusinessLink !== 'all' || filterScope !== 'all') && (
          <button
            onClick={() => { handleSearchChange(''); setFilterRole('all'); setFilterAccountType('all'); setFilterTier('all'); setFilterBusinessLink('all'); setFilterScope('all'); }}
            className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <X className="w-3 h-3" />{pickBi(isRTL, 'مسح الفلاتر', 'Clear filters')}
          </button>
        )}
        <div className="ms-auto flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex rounded-lg border border-border/30 p-0.5 bg-muted/30">
            <button onClick={() => setDensity('comfortable')}
              className={`p-1 rounded ${density === 'comfortable' ? 'bg-card shadow-sm text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              title={pickBi(isRTL, 'مريح', 'Comfortable')} aria-label={pickBi(isRTL, 'مريح', 'Comfortable')}>
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setDensity('compact')}
              className={`p-1 rounded ${density === 'compact' ? 'bg-card shadow-sm text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              title={pickBi(isRTL, 'مضغوط', 'Compact')} aria-label={pickBi(isRTL, 'مضغوط', 'Compact')}>
              <Rows3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground">{pickBi(isRTL, 'ترتيب:', 'Sort:')}</span>
          {([
            ['created_at', pickBi(isRTL, 'الأحدث', 'Date')],
            ['full_name', pickBi(isRTL, 'الاسم', 'Name')],
            ['membership_tier', pickBi(isRTL, 'العضوية', 'Tier')],
            ['account_type', pickBi(isRTL, 'النوع', 'Type')],
          ] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => cycleSort(k)}
              className={`text-[11px] gap-1 inline-flex items-center px-2 py-1 rounded-lg border transition-colors
                ${sortKey === k ? 'border-accent text-accent bg-accent/10' : 'border-border/30 text-muted-foreground hover:border-border'}`}>
              {lbl}
              {sortKey === k ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  </>
));
UserFiltersBar.displayName = 'UserFiltersBar';
