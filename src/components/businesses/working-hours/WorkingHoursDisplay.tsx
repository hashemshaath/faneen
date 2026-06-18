import React, { useMemo, useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { pickBi } from '@/components/common/Bilingual';
import {
  DAY_KEYS,
  type DayKey,
  normalizeWorkingHours,
  hasAnyHours,
  getTodayWorkingHours,
  isOpenNow,
} from '@/modules/businesses/services/workingHours';

const dayLabels: Record<DayKey, { ar: string; en: string }> = {
  sunday: { ar: 'الأحد', en: 'Sunday' },
  monday: { ar: 'الاثنين', en: 'Monday' },
  tuesday: { ar: 'الثلاثاء', en: 'Tuesday' },
  wednesday: { ar: 'الأربعاء', en: 'Wednesday' },
  thursday: { ar: 'الخميس', en: 'Thursday' },
  friday: { ar: 'الجمعة', en: 'Friday' },
  saturday: { ar: 'السبت', en: 'Saturday' },
};

export interface WorkingHoursDisplayProps {
  isRTL: boolean;
  value: unknown;
  compact?: boolean;
}

/** Public-profile display. Never invents data — when `working_hours` is
 *  empty/unset, renders the localised empty state. */
export const WorkingHoursDisplay: React.FC<WorkingHoursDisplayProps> = ({
  isRTL,
  value,
  compact,
}) => {
  const hours = useMemo(() => normalizeWorkingHours(value), [value]);
  const [expanded, setExpanded] = useState(!compact);

  if (!hasAnyHours(hours)) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>{pickBi(isRTL, 'لم تُحدَّد ساعات العمل بعد', 'Working hours not set yet')}</span>
      </div>
    );
  }

  const today = getTodayWorkingHours(hours);
  const open = isOpenNow(hours);

  const statusText = (() => {
    if (today.is_closed) {
      return today.source === 'exception' && today.label
        ? pickBi(isRTL, `مغلق اليوم بسبب: ${today.label}`, `Closed today — ${today.label}`)
        : pickBi(isRTL, 'مغلق اليوم', 'Closed today');
    }
    if (today.source === 'exception' && today.label) {
      return pickBi(isRTL, `ساعات خاصة اليوم: ${today.label}`, `Special hours today — ${today.label}`);
    }
    return open ? pickBi(isRTL, 'مفتوح الآن', 'Open now') : pickBi(isRTL, 'مغلق الآن', 'Closed now');
  })();

  const statusTone = today.is_closed
    ? 'bg-destructive/10 text-destructive'
    : open
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : 'bg-muted text-muted-foreground';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone}`}>
          <Clock className="h-3 w-3" />
          {statusText}
        </span>
        {!today.is_closed && today.periods.length > 0 && (
          <span className="text-[11px] text-muted-foreground tech-content" dir="ltr">
            {today.periods.map((p) => `${p.start} - ${p.end}`).join(' • ')}
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="ms-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          {expanded ? pickBi(isRTL, 'إخفاء التفاصيل', 'Hide details') : pickBi(isRTL, 'عرض كل ساعات العمل', 'View all working hours')}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {expanded && (
        <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5">
          <table className="w-full text-[11px]">
            <tbody>
              {DAY_KEYS.map((d) => {
                const periods = hours.weekly[d] ?? [];
                return (
                  <tr key={d} className="border-b border-border/20 last:border-0">
                    <td className="py-1 font-medium text-foreground/80 w-24">
                      {pickBi(isRTL, dayLabels[d].ar, dayLabels[d].en)}
                    </td>
                    <td className="py-1 tech-content" dir="ltr">
                      {periods.length === 0 ? (
                        <span className="text-muted-foreground">
                          {pickBi(isRTL, 'مغلق', 'Closed')}
                        </span>
                      ) : (
                        periods.map((p) => `${p.start} - ${p.end}`).join(' • ')
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {hours.exceptions.length > 0 && (
            <div className="mt-2 border-t border-border/20 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {pickBi(isRTL, 'المناسبات', 'Exceptions')}
              </p>
              <ul className="space-y-1">
                {hours.exceptions.map((ex, i) => (
                  <li key={i} className="text-[11px] flex flex-wrap gap-2">
                    <span className="tech-content text-muted-foreground" dir="ltr">{ex.date}</span>
                    <span className="font-medium">{ex.label}</span>
                    <span className="text-muted-foreground">
                      {ex.is_closed
                        ? pickBi(isRTL, 'مغلق', 'Closed')
                        : ex.periods.map((p) => `${p.start} - ${p.end}`).join(' • ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkingHoursDisplay;