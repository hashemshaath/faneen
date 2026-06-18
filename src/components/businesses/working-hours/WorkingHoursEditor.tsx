import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Copy, CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { pickBi } from '@/components/common/Bilingual';
import {
  DAY_KEYS,
  type DayKey,
  type WorkingHours,
  type Period,
  type HoursException,
  emptyWorkingHours,
  normalizeWorkingHours,
  copyDayHours,
  applyHoursToDays,
} from '@/modules/businesses/services/workingHours';

const dayLabels: Record<DayKey, { ar: string; en: string }> = {
  sunday: { ar: 'الأحد', en: 'Sun' },
  monday: { ar: 'الاثنين', en: 'Mon' },
  tuesday: { ar: 'الثلاثاء', en: 'Tue' },
  wednesday: { ar: 'الأربعاء', en: 'Wed' },
  thursday: { ar: 'الخميس', en: 'Thu' },
  friday: { ar: 'الجمعة', en: 'Fri' },
  saturday: { ar: 'السبت', en: 'Sat' },
};

export interface WorkingHoursEditorProps {
  isRTL: boolean;
  value: WorkingHours | unknown;
  onChange: (next: WorkingHours) => void;
  /** When true, exposes the "Apply to all branches" button. */
  showApplyToAllBranches?: boolean;
  onApplyToAllBranches?: () => void;
  applyingToAllBranches?: boolean;
}

export const WorkingHoursEditor: React.FC<WorkingHoursEditorProps> = ({
  isRTL,
  value,
  onChange,
  showApplyToAllBranches,
  onApplyToAllBranches,
  applyingToAllBranches,
}) => {
  const hours = useMemo(() => normalizeWorkingHours(value), [value]);

  const setHours = (next: WorkingHours) => onChange(next);
  const setPeriods = (day: DayKey, periods: Period[]) =>
    setHours({ ...hours, weekly: { ...hours.weekly, [day]: periods } });

  const addPeriod = (day: DayKey) =>
    setPeriods(day, [...(hours.weekly[day] ?? []), { start: '09:00', end: '17:00' }]);

  const removePeriod = (day: DayKey, idx: number) =>
    setPeriods(day, (hours.weekly[day] ?? []).filter((_, i) => i !== idx));

  const updatePeriod = (day: DayKey, idx: number, patch: Partial<Period>) =>
    setPeriods(
      day,
      (hours.weekly[day] ?? []).map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    );

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-foreground/80">
          {pickBi(isRTL, 'ساعات العمل الأسبوعية', 'Weekly Working Hours')}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <UnifiedHoursMenu isRTL={isRTL} onApply={(days, periods) => setHours(applyHoursToDays(hours, days, periods))} />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={() => setHours(emptyWorkingHours())}
          >
            {pickBi(isRTL, 'إعادة ضبط', 'Reset')}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {DAY_KEYS.map((day) => (
          <DayRow
            key={day}
            day={day}
            isRTL={isRTL}
            periods={hours.weekly[day] ?? []}
            onToggleClosed={(closed) => setPeriods(day, closed ? [] : [{ start: '09:00', end: '17:00' }])}
            onAddPeriod={() => addPeriod(day)}
            onRemovePeriod={(idx) => removePeriod(day, idx)}
            onUpdatePeriod={(idx, patch) => updatePeriod(day, idx, patch)}
            onCopyTo={(targets) => setHours(copyDayHours(hours, day, targets))}
          />
        ))}
      </div>

      {showApplyToAllBranches && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          disabled={applyingToAllBranches}
          onClick={onApplyToAllBranches}
        >
          <Copy className="h-3.5 w-3.5" />
          {applyingToAllBranches
            ? pickBi(isRTL, 'جاري التطبيق...', 'Applying...')
            : pickBi(isRTL, 'تطبيق هذه الساعات على كل الفروع', 'Apply these hours to all branches')}
        </Button>
      )}

      <Separator />
      <ExceptionsEditor
        isRTL={isRTL}
        exceptions={hours.exceptions}
        onChange={(exceptions) => setHours({ ...hours, exceptions })}
      />
    </div>
  );
};

/* ────────────────────────── Day row ────────────────────────── */

interface DayRowProps {
  day: DayKey;
  isRTL: boolean;
  periods: Period[];
  onToggleClosed: (closed: boolean) => void;
  onAddPeriod: () => void;
  onRemovePeriod: (idx: number) => void;
  onUpdatePeriod: (idx: number, patch: Partial<Period>) => void;
  onCopyTo: (targets: DayKey[]) => void;
}

const DayRow: React.FC<DayRowProps> = ({
  day,
  isRTL,
  periods,
  onToggleClosed,
  onAddPeriod,
  onRemovePeriod,
  onUpdatePeriod,
  onCopyTo,
}) => {
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargets, setCopyTargets] = useState<DayKey[]>([]);
  const closed = periods.length === 0;

  return (
    <div className="rounded-lg border border-border/30 bg-background p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-16 text-xs font-semibold">{pickBi(isRTL, dayLabels[day].ar, dayLabels[day].en)}</span>
        <div className="flex items-center gap-1.5">
          <Switch checked={!closed} onCheckedChange={(v) => onToggleClosed(!v)} />
          <span className="text-[11px] text-muted-foreground">
            {closed ? pickBi(isRTL, 'مغلق', 'Closed') : pickBi(isRTL, 'مفتوح', 'Open')}
          </span>
        </div>
        <div className="ms-auto flex items-center gap-1">
          {!closed && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px] gap-1"
              onClick={() => setCopyOpen((o) => !o)}
              title={pickBi(isRTL, 'نسخ هذا اليوم', 'Copy this day')}
            >
              <Copy className="h-3 w-3" />
              {pickBi(isRTL, 'نسخ', 'Copy')}
            </Button>
          )}
          {!closed && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px] gap-1"
              onClick={onAddPeriod}
            >
              <Plus className="h-3 w-3" />
              {pickBi(isRTL, 'فترة', 'Period')}
            </Button>
          )}
        </div>
      </div>

      {!closed && periods.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {periods.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2 tech-content">
              <Input
                type="time"
                value={p.start}
                onChange={(e) => onUpdatePeriod(idx, { start: e.target.value })}
                className="h-8 w-28"
                dir="ltr"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="time"
                value={p.end}
                onChange={(e) => onUpdatePeriod(idx, { end: e.target.value })}
                className="h-8 w-28"
                dir="ltr"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => onRemovePeriod(idx)}
                title={pickBi(isRTL, 'حذف فترة', 'Delete period')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {copyOpen && (
        <div className="mt-2 rounded-md border border-border/40 bg-muted/40 p-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
            {pickBi(isRTL, 'نسخ إلى:', 'Copy to:')}
          </p>
          <div className="flex flex-wrap gap-1">
            {DAY_KEYS.filter((d) => d !== day).map((d) => {
              const active = copyTargets.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setCopyTargets((cur) =>
                      cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d],
                    )
                  }
                  className={`rounded-md border px-2 py-0.5 text-[10px] ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground'
                  }`}
                >
                  {pickBi(isRTL, dayLabels[d].ar, dayLabels[d].en)}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-end gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={() => {
                setCopyOpen(false);
                setCopyTargets([]);
              }}
            >
              {pickBi(isRTL, 'إلغاء', 'Cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-6 px-2 text-[10px]"
              disabled={copyTargets.length === 0}
              onClick={() => {
                onCopyTo(copyTargets);
                setCopyOpen(false);
                setCopyTargets([]);
              }}
            >
              {pickBi(isRTL, 'تطبيق', 'Apply')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────── Unified hours menu ─────────────────────── */

const UnifiedHoursMenu: React.FC<{
  isRTL: boolean;
  onApply: (days: DayKey[], periods: Period[]) => void;
}> = ({ isRTL, onApply }) => {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<DayKey[]>([...DAY_KEYS]);
  const [periods, setPeriods] = useState<Period[]>([{ start: '09:00', end: '17:00' }]);

  const toggleDay = (d: DayKey) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-[11px] gap-1"
        onClick={() => setOpen((o) => !o)}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        {pickBi(isRTL, 'ساعات موحدة', 'Unified hours')}
      </Button>
      {open && (
        <div className="absolute z-30 mt-8 w-[300px] rounded-xl border border-border/40 bg-popover p-3 shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold">{pickBi(isRTL, 'تطبيق ساعات موحدة', 'Apply unified hours')}</p>
            <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {periods.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5 tech-content">
                <Input
                  type="time"
                  value={p.start}
                  onChange={(e) =>
                    setPeriods((cur) => cur.map((x, i) => (i === idx ? { ...x, start: e.target.value } : x)))
                  }
                  className="h-8 w-24"
                  dir="ltr"
                />
                <span className="text-xs">→</span>
                <Input
                  type="time"
                  value={p.end}
                  onChange={(e) =>
                    setPeriods((cur) => cur.map((x, i) => (i === idx ? { ...x, end: e.target.value } : x)))
                  }
                  className="h-8 w-24"
                  dir="ltr"
                />
                {periods.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => setPeriods((cur) => cur.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 w-full text-[10px] gap-1"
              onClick={() => setPeriods((cur) => [...cur, { start: '16:00', end: '21:00' }])}
            >
              <Plus className="h-3 w-3" />
              {pickBi(isRTL, 'إضافة فترة ثانية', 'Add another period')}
            </Button>
          </div>
          <Separator className="my-2" />
          <div className="flex flex-wrap gap-1">
            {DAY_KEYS.map((d) => {
              const active = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`rounded-md border px-2 py-0.5 text-[10px] ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground'
                  }`}
                >
                  {pickBi(isRTL, dayLabels[d].ar, dayLabels[d].en)}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-2 w-full h-7 text-[11px]"
            disabled={days.length === 0}
            onClick={() => {
              onApply(days, periods);
              setOpen(false);
            }}
          >
            {pickBi(isRTL, 'تطبيق', 'Apply')}
          </Button>
        </div>
      )}
    </>
  );
};

/* ─────────────────────── Exceptions editor ─────────────────────── */

interface ExceptionsEditorProps {
  isRTL: boolean;
  exceptions: HoursException[];
  onChange: (next: HoursException[]) => void;
}

const ExceptionsEditor: React.FC<ExceptionsEditorProps> = ({ isRTL, exceptions, onChange }) => {
  const update = (idx: number, patch: Partial<HoursException>) =>
    onChange(exceptions.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  const remove = (idx: number) => onChange(exceptions.filter((_, i) => i !== idx));
  const add = () =>
    onChange([
      ...exceptions,
      { date: '', label: '', is_closed: true, periods: [] },
    ]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground/80">
          {pickBi(isRTL, 'ساعات خاصة للمناسبات', 'Holiday & special hours')}
        </p>
        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1" onClick={add}>
          <Plus className="h-3 w-3" />
          {pickBi(isRTL, 'إضافة مناسبة', 'Add exception')}
        </Button>
      </div>

      {exceptions.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          {pickBi(isRTL, 'لا توجد مناسبات مضافة.', 'No exceptions added.')}
        </p>
      )}

      {exceptions.map((ex, idx) => (
        <div key={idx} className="rounded-lg border border-border/30 bg-background p-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">{pickBi(isRTL, 'التاريخ', 'Date')}</Label>
              <Input
                type="date"
                value={ex.date}
                onChange={(e) => update(idx, { date: e.target.value })}
                className="h-8"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-[10px]">{pickBi(isRTL, 'اسم المناسبة', 'Label')}</Label>
              <Input
                value={ex.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder={pickBi(isRTL, 'مثال: اليوم الوطني', 'e.g. National Day')}
                className="h-8"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={ex.is_closed}
                onCheckedChange={(v) => update(idx, { is_closed: v, periods: v ? [] : ex.periods })}
              />
              <span className="text-[11px]">{pickBi(isRTL, 'مغلق طوال اليوم', 'Closed all day')}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive"
              onClick={() => remove(idx)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {!ex.is_closed && (
            <div className="space-y-1.5">
              {ex.periods.map((p, pIdx) => (
                <div key={pIdx} className="flex items-center gap-2 tech-content">
                  <Input
                    type="time"
                    value={p.start}
                    onChange={(e) =>
                      update(idx, {
                        periods: ex.periods.map((x, i) =>
                          i === pIdx ? { ...x, start: e.target.value } : x,
                        ),
                      })
                    }
                    className="h-8 w-28"
                    dir="ltr"
                  />
                  <span className="text-xs">→</span>
                  <Input
                    type="time"
                    value={p.end}
                    onChange={(e) =>
                      update(idx, {
                        periods: ex.periods.map((x, i) =>
                          i === pIdx ? { ...x, end: e.target.value } : x,
                        ),
                      })
                    }
                    className="h-8 w-28"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() =>
                      update(idx, { periods: ex.periods.filter((_, i) => i !== pIdx) })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px] gap-1"
                onClick={() =>
                  update(idx, {
                    periods: [...ex.periods, { start: '09:00', end: '17:00' }],
                  })
                }
              >
                <Plus className="h-3 w-3" />
                {pickBi(isRTL, 'إضافة فترة', 'Add period')}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WorkingHoursEditor;