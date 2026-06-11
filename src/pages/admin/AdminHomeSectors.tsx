/**
 * AdminHomeSectors — manage the 10 tiles rendered by `HomeSectorGrid`.
 *
 * Storage: `taxonomy_categories.metadata.home_grid` (see homeSectors service).
 * Reorder: simple up/down buttons (consistent with AdminHomeFaq) — no popups.
 *
 * IMPORTANT: This screen does NOT create or delete primary_activity rows.
 * Those live in the Taxonomy Center. Here we only adjust which canonical
 * primaries appear on the home grid, their order, and their tile copy.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Square as FallbackIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useBi } from '@/components/common/Bilingual';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  useAdminHomeSectors,
  updateHomeSectorOverride,
  HOME_SECTOR_TILES_KEY,
  HOME_SECTOR_TILES_ADMIN_KEY,
  SECTOR_ICON_NAMES,
  resolveSectorIcon,
  type HomeSectorOverride,
  type HomeSectorRow,
} from '@/modules/home';
import { HOME_ALLOWED_SLUGS, HOME_SECTOR_GRID_SLUGS } from '@/components/home/v2/data/homeTaxonomy';
import { HOME_SECTOR_GRID_DEFAULTS } from '@/components/home/v2/sections/HomeSectorGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const BODY_MAX = 140;
const TITLE_MAX = 40;

interface RowState {
  show: boolean;
  position: number;
  icon: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  dirty: boolean;
}

function defaultsFor(slug: string) {
  return HOME_SECTOR_GRID_DEFAULTS.find((d) => d.slug === slug);
}

function initialRowState(row: HomeSectorRow): RowState {
  const def = defaultsFor(row.slug);
  const o = row.override;
  const defaultShow = HOME_SECTOR_GRID_SLUGS.includes(
    row.slug as typeof HOME_SECTOR_GRID_SLUGS[number],
  );
  const defaultPosition = HOME_SECTOR_GRID_SLUGS.indexOf(
    row.slug as typeof HOME_SECTOR_GRID_SLUGS[number],
  );
  return {
    show: typeof o.show === 'boolean' ? o.show : defaultShow,
    position: typeof o.position === 'number' ? o.position : defaultPosition >= 0 ? defaultPosition + 1 : 99,
    icon: o.icon ?? def?.iconName ?? 'Square',
    title_ar: o.title_ar ?? def?.titleAr ?? row.name_ar,
    title_en: o.title_en ?? def?.titleEn ?? row.name_en ?? '',
    body_ar: o.body_ar ?? def?.bodyAr ?? '',
    body_en: o.body_en ?? def?.bodyEn ?? '',
    dirty: false,
  };
}

function validate(s: RowState, bi: ReturnType<typeof useBi>): string | null {
  if (s.title_ar.trim().length < 2 || s.title_ar.length > TITLE_MAX)
    return bi(`العنوان (عربي) 2–${TITLE_MAX} حرفًا`, `Arabic title must be 2–${TITLE_MAX} chars`);
  if (s.title_en && s.title_en.length > TITLE_MAX)
    return bi(`العنوان (إنجليزي) أقل من ${TITLE_MAX}`, `English title under ${TITLE_MAX} chars`);
  if (s.body_ar.length > BODY_MAX) return bi(`الوصف ≤ ${BODY_MAX}`, `Body ≤ ${BODY_MAX}`);
  if (s.body_en.length > BODY_MAX) return bi(`Body ≤ ${BODY_MAX}`, `Body ≤ ${BODY_MAX}`);
  if (!SECTOR_ICON_NAMES.includes(s.icon)) return bi('الأيقونة غير معروفة', 'Unknown icon');
  return null;
}

const AdminHomeSectors: React.FC = () => {
  useNoIndex();
  const bi = useBi();
  const { isRTL } = useLanguage();
  const qc = useQueryClient();
  const { data: rows, isLoading } = useAdminHomeSectors();

  // Only canonical primaries — keep this admin focused on Home concerns.
  const eligible = useMemo(
    () => (rows ?? []).filter((r) => HOME_ALLOWED_SLUGS.has(r.slug)),
    [rows],
  );

  const [drafts, setDrafts] = useState<Record<string, RowState>>({});
  const stateFor = useCallback(
    (row: HomeSectorRow): RowState => drafts[row.id] ?? initialRowState(row),
    [drafts],
  );

  const update = (row: HomeSectorRow, patch: Partial<RowState>) => {
    setDrafts((d) => ({
      ...d,
      [row.id]: { ...stateFor(row), ...patch, dirty: true },
    }));
  };

  const reset = (row: HomeSectorRow) =>
    setDrafts((d) => {
      const next = { ...d };
      delete next[row.id];
      return next;
    });

  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: HomeSectorOverride }) =>
      updateHomeSectorOverride(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HOME_SECTOR_TILES_KEY });
      qc.invalidateQueries({ queryKey: HOME_SECTOR_TILES_ADMIN_KEY });
    },
  });

  const save = async (row: HomeSectorRow) => {
    const s = stateFor(row);
    const err = validate(s, bi);
    if (err) { toast.error(err); return; }
    try {
      await mutation.mutateAsync({
        id: row.id,
        patch: {
          show: s.show,
          position: s.position,
          icon: s.icon,
          title_ar: s.title_ar,
          title_en: s.title_en,
          body_ar: s.body_ar,
          body_en: s.body_en,
        },
      });
      reset(row);
      toast.success(bi('تم الحفظ', 'Saved'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown';
      toast.error(bi(`فشل الحفظ: ${msg}`, `Save failed: ${msg}`));
    }
  };

  // Position swap (up/down) is just a local position-field edit on two rows.
  const visible = useMemo(
    () => [...eligible]
      .filter((r) => stateFor(r).show)
      .sort((a, b) => stateFor(a).position - stateFor(b).position),
    [eligible, stateFor],
  );

  const swap = (row: HomeSectorRow, dir: -1 | 1) => {
    const idx = visible.findIndex((r) => r.id === row.id);
    const other = visible[idx + dir];
    if (!other) return;
    const a = stateFor(row);
    const b = stateFor(other);
    update(row, { position: b.position });
    update(other, { position: a.position });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <header className="mb-6">
          <h1 className="font-heading text-2xl font-bold">
            {bi('قطاعات الصفحة الرئيسية', 'Home sectors')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bi(
              'تحكّم في البلاطات الـ10 الظاهرة في الشبكة العلوية للصفحة الرئيسية: العنوان، الوصف القصير، الأيقونة، الترتيب، والإظهار.',
              'Control the 10 tiles shown in the homepage grid: title, short body, icon, order, and visibility.',
            )}
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {eligible
              .sort((a, b) => stateFor(a).position - stateFor(b).position)
              .map((row) => {
                const s = stateFor(row);
                const def = defaultsFor(row.slug);
                const Icon = resolveSectorIcon(s.icon, def?.Icon ?? FallbackIcon);
                const posInVisible = visible.findIndex((r) => r.id === row.id);
                const canUp = s.show && posInVisible > 0;
                const canDown = s.show && posInVisible >= 0 && posInVisible < visible.length - 1;
                return (
                  <Card key={row.id} className={s.show ? '' : 'opacity-70'}>
                    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 shrink-0">
                          <Icon className="w-5 h-5" strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">
                            {bi(s.title_ar || row.name_ar, s.title_en || row.name_en || row.name_ar)}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[10px] tech-content">{row.slug}</Badge>
                            {s.show ? (
                              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                {bi('ظاهر', 'Visible')} · #{posInVisible + 1}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">{bi('مخفي', 'Hidden')}</Badge>
                            )}
                            {s.dirty && (
                              <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                {bi('تغييرات غير محفوظة', 'Unsaved')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" disabled={!canUp} onClick={() => swap(row, -1)} aria-label={bi('للأعلى', 'Up')}>
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={!canDown} onClick={() => swap(row, 1)} aria-label={bi('للأسفل', 'Down')}>
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">{bi('العنوان (عربي)', 'Title (Arabic)')}</Label>
                          <Input dir="auto" maxLength={TITLE_MAX} value={s.title_ar}
                            onChange={(e) => update(row, { title_ar: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{bi('العنوان (إنجليزي)', 'Title (English)')}</Label>
                          <Input dir="auto" maxLength={TITLE_MAX} value={s.title_en}
                            onChange={(e) => update(row, { title_en: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{bi('الوصف القصير (عربي)', 'Short body (Arabic)')}</Label>
                          <Textarea dir="auto" rows={2} maxLength={BODY_MAX} value={s.body_ar}
                            onChange={(e) => update(row, { body_ar: e.target.value })} />
                          <span className="text-[10px] text-muted-foreground">{s.body_ar.length}/{BODY_MAX}</span>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{bi('الوصف القصير (إنجليزي)', 'Short body (English)')}</Label>
                          <Textarea dir="auto" rows={2} maxLength={BODY_MAX} value={s.body_en}
                            onChange={(e) => update(row, { body_en: e.target.value })} />
                          <span className="text-[10px] text-muted-foreground">{s.body_en.length}/{BODY_MAX}</span>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{bi('الأيقونة', 'Icon')}</Label>
                          <Select value={s.icon} onValueChange={(v) => update(row, { icon: v })} dir={isRTL ? 'rtl' : 'ltr'}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-72">
                              {SECTOR_ICON_NAMES.map((name) => {
                                const I = resolveSectorIcon(name, Icon);
                                return (
                                  <SelectItem key={name} value={name}>
                                    <span className="inline-flex items-center gap-2">
                                      <I className="w-4 h-4" strokeWidth={1.75} />
                                      <span className="tech-content">{name}</span>
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4">
                          <div>
                            <Label className="text-xs flex items-center gap-1.5">
                              {s.show ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              {bi('إظهار على الرئيسية', 'Show on home')}
                            </Label>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {bi('الحدّ الأقصى 10 بلاطات', 'Hard cap: 10 tiles')}
                            </p>
                          </div>
                          <Switch checked={s.show} onCheckedChange={(v) => update(row, { show: v })} />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        {s.dirty && (
                          <Button variant="ghost" size="sm" onClick={() => reset(row)}>
                            <RotateCcw className="w-4 h-4 me-1.5" />
                            {bi('تجاهل', 'Discard')}
                          </Button>
                        )}
                        <Button size="sm" disabled={!s.dirty || mutation.isPending} onClick={() => save(row)}>
                          {mutation.isPending
                            ? <Loader2 className="w-4 h-4 me-1.5 animate-spin" />
                            : <Save className="w-4 h-4 me-1.5" />}
                          {bi('حفظ', 'Save')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminHomeSectors;