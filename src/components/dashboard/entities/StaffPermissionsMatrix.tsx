/**
 * Inline permissions matrix editor for a single `business_staff` row.
 *
 * - Reads role defaults from the workspace permissions catalog.
 * - Lets the manager toggle each permission ON/OFF and persists the
 *   resulting array to `business_staff.permissions_override` as JSONB.
 * - When all checks match the role defaults exactly, persists `null` so
 *   future role-default changes flow through automatically.
 * - UI-only hint; RLS + `has_permission` on the server remain authoritative.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark, Check, ChevronDown, ChevronUp, Download, Minus, Pin, Plus,
  RotateCcw, Save, Search, ShieldCheck, Sparkles, Upload, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { pickBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  WORKSPACE_PERMISSIONS,
  WORKSPACE_ROLES,
  getDefaultPermissionsForRole,
  type WorkspacePermission,
} from '@/modules/workspace/permissions';
import { updateBusinessStaffById } from '@/modules/businesses/services/updateBusinessStaffById';

// Local-only storage for user-saved permission templates (UI convenience).
const PRESETS_STORAGE_KEY = 'qitaat_perm_presets_v1';
interface CustomPreset { id: string; name: string; perms: string[]; created_at: number }

function readPresets(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((p): p is CustomPreset =>
      !!p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.perms),
    );
  } catch { return []; }
}
function writePresets(list: CustomPreset[]): void {
  try { localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

const DOMAIN_LABELS: Record<string, { ar: string; en: string }> = {
  entity: { ar: 'الكيان', en: 'Entity' },
  staff: { ar: 'الموظفون', en: 'Staff' },
  locations: { ar: 'المواقع', en: 'Locations' },
  services: { ar: 'الخدمات', en: 'Services' },
  leads: { ar: 'الطلبات', en: 'Leads' },
  quotes: { ar: 'عروض الأسعار', en: 'Quotes' },
  contracts: { ar: 'العقود', en: 'Contracts' },
  bookings: { ar: 'الحجوزات', en: 'Bookings' },
  documents: { ar: 'المستندات', en: 'Documents' },
  memberships: { ar: 'العضويات', en: 'Memberships' },
  payments: { ar: 'المدفوعات', en: 'Payments' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
};

const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  view: { ar: 'عرض', en: 'View' },
  manage: { ar: 'إدارة', en: 'Manage' },
  verify: { ar: 'توثيق', en: 'Verify' },
  create: { ar: 'إنشاء', en: 'Create' },
  respond: { ar: 'رد', en: 'Respond' },
  sign: { ar: 'توقيع', en: 'Sign' },
  upload: { ar: 'رفع', en: 'Upload' },
};

function groupByDomain(perms: readonly string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const [d] = p.split('.');
    (groups[d] ??= []).push(p);
  }
  return groups;
}

// Pinned domains surface at the top of the matrix for quick access.
const PINNED_DOMAINS = ['contracts', 'payments', 'leads'] as const;

function sortDomains(domains: string[]): string[] {
  const pinned = PINNED_DOMAINS.filter((d) => domains.includes(d));
  const rest = domains.filter((d) => !pinned.includes(d as typeof PINNED_DOMAINS[number]));
  return [...pinned, ...rest];
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  for (const v of b) if (!sa.has(v)) return false;
  return true;
}

function parseOverride(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string');
  return null;
}

export interface StaffPermissionsMatrixProps {
  staffId: string;
  role: string;
  permissionsOverride: unknown;
  isPrimaryManager: boolean;
  canEdit: boolean;
  onSaved?: () => void;
}

export const StaffPermissionsMatrix: React.FC<StaffPermissionsMatrixProps> = ({
  staffId, role, permissionsOverride, isPrimaryManager, canEdit, onSaved,
}) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const defaults = useMemo(() => getDefaultPermissionsForRole(role) as string[], [role]);
  const override = useMemo(() => parseOverride(permissionsOverride), [permissionsOverride]);
  const initial = override ?? defaults;

  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'granted' | 'changed' | 'denied'>('all');
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());
  const [templateRole, setTemplateRole] = useState<string>('');
  const [presets, setPresets] = useState<CustomPreset[]>(() => readPresets());
  const [presetName, setPresetName] = useState('');
  const [showPresetForm, setShowPresetForm] = useState(false);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PRESETS_STORAGE_KEY) setPresets(readPresets());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = (p: string) => {
    if (!canEdit || isPrimaryManager) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  };

  const resetToRole = () => setSelected(new Set(defaults));

  const setDomainAll = (perms: string[], on: boolean) => {
    if (!canEdit || isPrimaryManager) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of perms) { if (on) next.add(p); else next.delete(p); }
      return next;
    });
  };

  const toggleDomainCollapse = (d: string) => {
    setCollapsedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  };

  const applyTemplate = (roleKey: string) => {
    if (!canEdit || isPrimaryManager || !roleKey) return;
    const tplDefaults = getDefaultPermissionsForRole(roleKey) as string[];
    setSelected(new Set(tplDefaults));
    setTemplateRole('');
    toast({ title: pickBi(isRTL, 'تم تطبيق القالب', 'Template applied') });
  };

  const applyCustomPreset = (presetId: string) => {
    if (!canEdit || isPrimaryManager) return;
    const p = presets.find((x) => x.id === presetId);
    if (!p) return;
    const valid = p.perms.filter((x): x is WorkspacePermission =>
      (WORKSPACE_PERMISSIONS as readonly string[]).includes(x),
    );
    setSelected(new Set(valid));
    toast({ title: pickBi(isRTL, `طُبّق: ${p.name}`, `Applied: ${p.name}`) });
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const next: CustomPreset = {
      id: `pst_${Date.now()}`,
      name,
      perms: Array.from(selected),
      created_at: Date.now(),
    };
    const updated = [next, ...presets].slice(0, 20);
    setPresets(updated);
    writePresets(updated);
    setPresetName('');
    setShowPresetForm(false);
    toast({ title: pickBi(isRTL, 'تم حفظ القالب', 'Preset saved') });
  };

  const deletePreset = (presetId: string) => {
    const updated = presets.filter((p) => p.id !== presetId);
    setPresets(updated);
    writePresets(updated);
  };

  const exportJson = () => {
    const payload = { role, permissions: Array.from(selected).sort(), exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permissions-${role}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result ?? ''));
        const list = Array.isArray(obj?.permissions) ? obj.permissions : [];
        const valid = list.filter((x: unknown): x is WorkspacePermission =>
          typeof x === 'string' && (WORKSPACE_PERMISSIONS as readonly string[]).includes(x),
        );
        if (valid.length === 0) throw new Error('empty');
        setSelected(new Set(valid));
        toast({ title: pickBi(isRTL, 'تم الاستيراد', 'Imported'), description: `${valid.length} ${pickBi(isRTL, 'صلاحية', 'permissions')}` });
      } catch {
        toast({ title: pickBi(isRTL, 'ملف غير صالح', 'Invalid file'), variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  };

  const grantAll = () => {
    if (!canEdit || isPrimaryManager) return;
    setSelected(new Set(WORKSPACE_PERMISSIONS));
  };
  const denyAll = () => {
    if (!canEdit || isPrimaryManager) return;
    setSelected(new Set());
  };

  const dirty = !sameSet(Array.from(selected), initial);
  const matchesDefaults = sameSet(Array.from(selected), defaults);

  // Diff vs role defaults
  const diff = useMemo(() => {
    const sel = new Set(selected);
    const def = new Set(defaults);
    const added: string[] = [];
    const removed: string[] = [];
    for (const p of sel) if (!def.has(p)) added.push(p);
    for (const p of def) if (!sel.has(p)) removed.push(p);
    return { added, removed };
  }, [selected, defaults]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = matchesDefaults
        ? { permissions_override: null }
        : { permissions_override: Array.from(selected) };
      const res = await updateBusinessStaffById({ id: staffId, values: payload });
      if (res.error) throw res.error;
      toast({ title: pickBi(isRTL, 'تم حفظ الصلاحيات', 'Permissions saved') });
      onSaved?.();
    } catch (err) {
      toast({
        title: pickBi(isRTL, 'تعذّر الحفظ', 'Save failed'),
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const grouped = useMemo(() => groupByDomain(WORKSPACE_PERMISSIONS), []);
  const totalSelected = selected.size;
  const totalAvailable = WORKSPACE_PERMISSIONS.length;

  const matches = (domain: string, perm: string): boolean => {
    const q = query.trim().toLowerCase();
    if (q) {
      const action = perm.split('.')[1] ?? '';
      const haystack = [
        perm, domain, action,
        DOMAIN_LABELS[domain]?.ar ?? '', DOMAIN_LABELS[domain]?.en ?? '',
        ACTION_LABELS[action]?.ar ?? '', ACTION_LABELS[action]?.en ?? '',
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    const isOn = selected.has(perm);
    const inDefault = defaults.includes(perm);
    if (filter === 'granted' && !isOn) return false;
    if (filter === 'denied' && isOn) return false;
    if (filter === 'changed' && isOn === inDefault) return false;
    return true;
  };

  const visibleDomains = useMemo(() => {
    const ordered = sortDomains(Object.keys(grouped));
    return ordered
      .map((d) => ({ domain: d, perms: grouped[d].filter((p) => matches(d, p)) }))
      .filter((g) => g.perms.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped, query, filter, selected, defaults]);

  const FILTER_CHIPS: { value: typeof filter; ar: string; en: string }[] = [
    { value: 'all', ar: 'الكل', en: 'All' },
    { value: 'granted', ar: 'الممنوحة', en: 'Granted' },
    { value: 'changed', ar: 'المختلفة عن الدور', en: 'Changed' },
    { value: 'denied', ar: 'المرفوضة', en: 'Denied' },
  ];

  return (
    <div className="mt-2 border-t border-border/40 pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-[11px] text-muted-foreground hover:text-foreground transition"
      >
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          {pickBi(isRTL, 'مصفوفة الصلاحيات', 'Permissions matrix')}
          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
            {totalSelected}/{totalAvailable}
          </Badge>
          {override && !matchesDefaults && (
            <Badge className="text-[9px] h-4 px-1.5 bg-amber-500/20 text-amber-700 border-amber-500/30 hover:bg-amber-500/20">
              {pickBi(isRTL, 'مخصصة', 'Custom')}
            </Badge>
          )}
        </span>
        <span className="text-[10px]">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {isPrimaryManager && (
            <p className="text-[11px] text-amber-600">
              {pickBi(isRTL, 'المدير الرئيسي يملك جميع الصلاحيات تلقائيًا.', 'Primary manager has all permissions by default.')}
            </p>
          )}

          {/* Toolbar: search + filter chips + role template + global actions */}
          <div className="space-y-2">
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 start-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={pickBi(isRTL, 'ابحث في الصلاحيات...', 'Search permissions...')}
                  className="h-8 ps-7 text-[11px]"
                />
              </div>
              {canEdit && !isPrimaryManager && (
                <div className="flex items-center gap-1.5">
                  <Select value={templateRole} onValueChange={applyTemplate}>
                    <SelectTrigger className="h-8 text-[11px] w-[180px]">
                      <Sparkles className="w-3 h-3 me-1 text-primary" />
                      <SelectValue placeholder={pickBi(isRTL, 'تطبيق قالب دور…', 'Apply role template…')} />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKSPACE_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="text-[11px]">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={grantAll} variant="outline" size="sm" className="h-8 px-2 text-[10px]">
                    {pickBi(isRTL, 'منح الكل', 'Grant all')}
                  </Button>
                  <Button onClick={denyAll} variant="outline" size="sm" className="h-8 px-2 text-[10px]">
                    {pickBi(isRTL, 'رفض الكل', 'Deny all')}
                  </Button>
                </div>
              )}
            </div>

            {/* Custom presets row */}
            {canEdit && !isPrimaryManager && (
              <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-lg bg-muted/30 border border-border/30">
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  <Bookmark className="w-3 h-3" />
                  {pickBi(isRTL, 'قوالب محفوظة', 'Saved presets')}
                </span>
                {presets.length === 0 && (
                  <span className="text-[10px] text-muted-foreground/70">—</span>
                )}
                {presets.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-0.5 rounded-full bg-background border border-border/40 ps-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => applyCustomPreset(p.id)}
                      className="py-0.5 hover:text-primary transition"
                      title={`${p.perms.length} ${pickBi(isRTL, 'صلاحية', 'perms')}`}
                    >
                      {p.name}
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 ms-1">{p.perms.length}</Badge>
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePreset(p.id)}
                      className="px-1.5 py-0.5 text-muted-foreground hover:text-destructive"
                      title={pickBi(isRTL, 'حذف', 'Delete')}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <div className="ms-auto inline-flex items-center gap-1">
                  {showPresetForm ? (
                    <>
                      <Input
                        autoFocus
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') { setShowPresetForm(false); setPresetName(''); } }}
                        placeholder={pickBi(isRTL, 'اسم القالب…', 'Preset name…')}
                        className="h-7 text-[10px] w-32"
                      />
                      <Button onClick={savePreset} disabled={!presetName.trim()} size="sm" className="h-7 px-2 text-[10px]">
                        <Save className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setShowPresetForm(true)} variant="ghost" size="sm" className="h-7 px-2 text-[10px]">
                      <Plus className="w-3 h-3 me-0.5" />
                      {pickBi(isRTL, 'احفظ كقالب', 'Save as preset')}
                    </Button>
                  )}
                  <Button onClick={exportJson} variant="ghost" size="sm" className="h-7 px-2 text-[10px]" title="Export JSON">
                    <Download className="w-3 h-3" />
                  </Button>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) importJson(f);
                        e.currentTarget.value = '';
                      }}
                    />
                    <span className="h-7 px-2 text-[10px] inline-flex items-center rounded-md hover:bg-accent hover:text-accent-foreground" title="Import JSON">
                      <Upload className="w-3 h-3" />
                    </span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTER_CHIPS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFilter(c.value)}
                  className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                    filter === c.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/40 text-muted-foreground border-border/40 hover:border-primary/40'
                  }`}
                >
                  {pickBi(isRTL, c.ar, c.en)}
                </button>
              ))}
              <span className="text-[10px] text-muted-foreground ms-auto inline-flex items-center gap-2">
                {diff.added.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-600">
                    <Plus className="w-2.5 h-2.5" />{diff.added.length}
                  </span>
                )}
                {diff.removed.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-rose-600">
                    <Minus className="w-2.5 h-2.5" />{diff.removed.length}
                  </span>
                )}
                {diff.added.length === 0 && diff.removed.length === 0 && (
                  <span>{pickBi(isRTL, 'مطابق للدور', 'Matches role')}</span>
                )}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDomains.map(({ domain, perms }) => {
              const isPinned = (PINNED_DOMAINS as readonly string[]).includes(domain);
              const allPerms = grouped[domain] ?? [];
              const grantedCount = allPerms.filter((p) => selected.has(p)).length;
              const allOn = grantedCount === allPerms.length;
              const noneOn = grantedCount === 0;
              const customDomain = allPerms.some(
                (p) => selected.has(p) !== defaults.includes(p),
              );
              const collapsed = collapsedDomains.has(domain);
              return (
              <div
                key={domain}
                className={`rounded-lg border p-2.5 ${
                  isPinned ? 'border-primary/40 bg-primary/5' : 'border-border/40 bg-muted/20'
                } ${customDomain ? 'ring-1 ring-amber-500/30' : ''}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <button
                    type="button"
                    onClick={() => toggleDomainCollapse(domain)}
                    className="text-[11px] font-semibold flex items-center gap-1.5 hover:text-primary transition"
                  >
                    {isPinned && <Pin className="w-3 h-3 text-primary" />}
                    {pickBi(isRTL, DOMAIN_LABELS[domain]?.ar ?? domain, DOMAIN_LABELS[domain]?.en ?? domain)}
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                      {grantedCount}/{allPerms.length}
                    </Badge>
                    {customDomain && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title={pickBi(isRTL, 'مخصصة', 'Custom')} />
                    )}
                    {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </button>
                  {canEdit && !isPrimaryManager && !collapsed && (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setDomainAll(allPerms, true)}
                        disabled={allOn}
                        className="text-[9px] px-1 py-0.5 rounded text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={pickBi(isRTL, 'منح الكل', 'Grant all')}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDomainAll(allPerms, false)}
                        disabled={noneOn}
                        className="text-[9px] px-1 py-0.5 rounded text-rose-600 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={pickBi(isRTL, 'رفض الكل', 'Deny all')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                {!collapsed && (
                <>
                {canEdit && !isPrimaryManager && (() => {
                  const viewPerms = allPerms.filter((p) => p.endsWith('.view'));
                  const nonViewPerms = allPerms.filter((p) => !p.endsWith('.view'));
                  // detect current level
                  const onCount = grantedCount;
                  const viewOn = viewPerms.every((p) => selected.has(p)) && nonViewPerms.every((p) => !selected.has(p));
                  const level: 'none' | 'view' | 'manage' =
                    onCount === 0 ? 'none' : viewOn ? 'view' : allOn ? 'manage' : 'none';
                  const setLevel = (lvl: 'none' | 'view' | 'manage') => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      for (const p of allPerms) next.delete(p);
                      if (lvl === 'view') for (const p of viewPerms) next.add(p);
                      else if (lvl === 'manage') for (const p of allPerms) next.add(p);
                      return next;
                    });
                  };
                  const PILLS: { v: typeof level; ar: string; en: string }[] = [
                    { v: 'none', ar: 'لا شيء', en: 'None' },
                    { v: 'view', ar: 'قراءة', en: 'View' },
                    { v: 'manage', ar: 'إدارة', en: 'Manage' },
                  ];
                  return (
                    <div className="flex items-center gap-0.5 mb-1.5 p-0.5 rounded-md bg-background/60 border border-border/30">
                      {PILLS.map((pl) => (
                        <button
                          key={pl.v}
                          type="button"
                          onClick={() => setLevel(pl.v)}
                          className={`flex-1 text-[9px] py-1 rounded transition-all ${
                            level === pl.v
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                          title={pickBi(isRTL, `ضبط ${pl.ar}`, `Set ${pl.en}`)}
                        >
                          {pickBi(isRTL, pl.ar, pl.en)}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                <div className="space-y-1">
                  {perms.map((p) => {
                    const action = p.split('.')[1] ?? '';
                    const isOn = selected.has(p);
                    const inDefault = defaults.includes(p);
                    const disabled = !canEdit || isPrimaryManager;
                    const changed = isOn !== inDefault;
                    return (
                      <label
                        key={p}
                        className={`flex items-center gap-2 text-[11px] cursor-pointer rounded px-1 -mx-1 ${
                          disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-background/60'
                        } ${changed ? 'bg-amber-500/5' : ''}`}
                      >
                        <Checkbox
                          checked={isOn}
                          disabled={disabled}
                          onCheckedChange={() => toggle(p)}
                          className="h-3.5 w-3.5"
                        />
                        <span className={`flex-1 ${isOn ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {pickBi(isRTL, ACTION_LABELS[action]?.ar ?? action, ACTION_LABELS[action]?.en ?? action)}
                        </span>
                        {changed ? (
                          isOn ? (
                            <span className="text-[8px] px-1 rounded bg-emerald-500/15 text-emerald-700">+</span>
                          ) : (
                            <span className="text-[8px] px-1 rounded bg-rose-500/15 text-rose-700">−</span>
                          )
                        ) : inDefault ? (
                          <span className="text-[9px] text-muted-foreground/70" title={pickBi(isRTL, 'افتراضي الدور', 'Role default')}>
                            <Check className="w-2.5 h-2.5 inline" />
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
                </>
                )}
              </div>
              );
            })}
            {visibleDomains.length === 0 && (
              <p className="text-[11px] text-muted-foreground col-span-full text-center py-4">
                {pickBi(isRTL, 'لا توجد نتائج مطابقة', 'No matching permissions')}
              </p>
            )}
          </div>
          {canEdit && !isPrimaryManager && (
            <div className={`flex items-center justify-between gap-2 pt-2 mt-1 -mx-2 px-2 border-t border-border/40 ${
              dirty ? 'sticky bottom-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 py-2 rounded-b-lg shadow-[0_-4px_12px_-8px_rgba(0,0,0,0.15)]' : ''
            }`}>
              <div className="text-[10px] text-muted-foreground">
                {dirty ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {pickBi(isRTL, 'تغييرات غير محفوظة', 'Unsaved changes')}
                  </span>
                ) : (
                  <span>{pickBi(isRTL, 'محفوظ', 'Saved')}</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <Button onClick={resetToRole} variant="ghost" size="sm" disabled={saving} className="h-7 text-[11px]">
                  <RotateCcw className="w-3 h-3 me-1" />
                  {pickBi(isRTL, 'افتراضي الدور', 'Role defaults')}
                </Button>
                <Button onClick={handleSave} size="sm" disabled={saving || !dirty} className="h-7 text-[11px]">
                  <Save className="w-3 h-3 me-1" />
                  {pickBi(isRTL, 'حفظ', 'Save')}
                </Button>
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground leading-snug">
            {pickBi(
              isRTL,
              'تظهر الشاشات والإجراءات للموظف في الشريط الجانبي بناءً على هذه الصلاحيات. سياسات الخادم تبقى المرجع الأساسي.',
              'Sidebar items and actions shown to this member are gated by these permissions. Server policies remain authoritative.',
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default StaffPermissionsMatrix;