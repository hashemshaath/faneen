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
import { Skeleton } from '@/components/ui/skeleton';
import {
  HomeSectorsStatsSection,
  HomeSectorsListSection,
  HomeSectorRow as HomeSectorRowCard,
  type HomeSectorRowState,
  type HomeSectorIconOption,
} from '@/components/admin/content/home';

const BODY_MAX = 140;
const TITLE_MAX = 40;

type RowState = HomeSectorRowState;

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

  const iconOptions: HomeSectorIconOption[] = useMemo(
    () => SECTOR_ICON_NAMES.map((name) => ({
      name,
      Icon: resolveSectorIcon(name, FallbackIcon),
    })),
    [],
  );

  const dirtyCount = Object.values(drafts).filter((d) => d.dirty).length;
  const hiddenCount = eligible.length - visible.length;

  const rowLabels = {
    titleAr: bi('العنوان (عربي)', 'Title (Arabic)'),
    titleEn: bi('العنوان (إنجليزي)', 'Title (English)'),
    bodyAr: bi('الوصف القصير (عربي)', 'Short body (Arabic)'),
    bodyEn: bi('الوصف القصير (إنجليزي)', 'Short body (English)'),
    icon: bi('الأيقونة', 'Icon'),
    show: bi('إظهار على الرئيسية', 'Show on home'),
    showHint: bi('الحدّ الأقصى 10 بلاطات', 'Hard cap: 10 tiles'),
    visible: bi('ظاهر', 'Visible'),
    hidden: bi('مخفي', 'Hidden'),
    unsaved: bi('تغييرات غير محفوظة', 'Unsaved'),
    discard: bi('تجاهل', 'Discard'),
    save: bi('حفظ', 'Save'),
    up: bi('للأعلى', 'Up'),
    down: bi('للأسفل', 'Down'),
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

        {!isLoading && (
          <div className="mb-4">
            <HomeSectorsStatsSection
              isRTL={isRTL}
              total={eligible.length}
              visible={visible.length}
              hidden={hiddenCount}
              unsaved={dirtyCount}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : (
          <HomeSectorsListSection>
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
                  <HomeSectorRowCard
                    key={row.id}
                    isRTL={isRTL}
                    row={{ id: row.id, slug: row.slug, name_ar: row.name_ar, name_en: row.name_en ?? null }}
                    state={s}
                    Icon={Icon}
                    iconOptions={iconOptions}
                    posInVisible={posInVisible}
                    canUp={canUp}
                    canDown={canDown}
                    isSaving={mutation.isPending}
                    titleMax={TITLE_MAX}
                    bodyMax={BODY_MAX}
                    onMoveUp={() => swap(row, -1)}
                    onMoveDown={() => swap(row, 1)}
                    onChange={(patch) => update(row, patch)}
                    onSave={() => save(row)}
                    onReset={() => reset(row)}
                    labels={rowLabels}
                  />
                );
              })}
          </HomeSectorsListSection>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminHomeSectors;