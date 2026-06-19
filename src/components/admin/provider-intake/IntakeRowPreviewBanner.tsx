/**
 * Inline preview + per-row navigator for the provider intake queue.
 *
 * Rendered above the search Card on `/admin/data-enrichment` so the
 * operator can step through every uploaded row without leaving the page
 * or returning to the wizard preview table.
 */
import React from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  SkipForward,
  ClipboardList,
  X,
  RefreshCw,
  Download,
  AlertTriangle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Bi } from '@/components/common/Bilingual';
import {
  INTAKE_AUDIT_EVENT,
  INTAKE_QUEUE_CHANGE_EVENT,
  intakeRowName,
  readIntakeQueue,
  writeIntakeQueue,
  type IntakeQueueState,
} from '@/lib/intakeQueue';

const KEY_FIELDS: Array<{ key: string; ar: string; en: string }> = [
  { key: 'company_name_ar', ar: 'الاسم (عربي)', en: 'Name (AR)' },
  { key: 'company_name_en', ar: 'الاسم (إنجليزي)', en: 'Name (EN)' },
  { key: 'branch_name_ar', ar: 'الفرع (عربي)', en: 'Branch (AR)' },
  { key: 'unified_number', ar: 'الرقم الموحّد', en: 'Unified #' },
  { key: 'commercial_registration', ar: 'السجل التجاري', en: 'CR #' },
  { key: 'city', ar: 'المدينة', en: 'City' },
  { key: 'region', ar: 'المنطقة', en: 'Region' },
  { key: 'phone', ar: 'الهاتف', en: 'Phone' },
  { key: 'branch_phone', ar: 'هاتف الفرع', en: 'Branch phone' },
  { key: 'email', ar: 'البريد', en: 'Email' },
  { key: 'branch_email', ar: 'بريد الفرع', en: 'Branch email' },
  { key: 'website', ar: 'الموقع', en: 'Website' },
];

function dispatchAudit(row: Record<string, string>, idx: number, total: number) {
  const name = intakeRowName(row);
  if (!name || typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(INTAKE_AUDIT_EVENT, {
      detail: { name, query: name, row, index: idx, total },
    }),
  );
}

export const IntakeRowPreviewBanner: React.FC<{ className?: string }> = ({ className }) => {
  const [queue, setQueue] = React.useState<IntakeQueueState | null>(() => readIntakeQueue());

  React.useEffect(() => {
    const sync = () => setQueue(readIntakeQueue());
    sync();
    window.addEventListener(INTAKE_QUEUE_CHANGE_EVENT, sync);
    window.addEventListener(INTAKE_AUDIT_EVENT, sync as EventListener);
    return () => {
      window.removeEventListener(INTAKE_QUEUE_CHANGE_EVENT, sync);
      window.removeEventListener(INTAKE_AUDIT_EVENT, sync as EventListener);
    };
  }, []);

  if (!queue || queue.rows.length === 0) return null;

  const total = queue.rows.length;
  const index = Math.min(Math.max(queue.index, 0), total - 1);
  const row = queue.rows[index] ?? {};
  const reviewedSet = new Set(queue.reviewed);
  const isReviewed = reviewedSet.has(index);
  const doneCount = reviewedSet.size;

  const move = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), total - 1);
    const updated: IntakeQueueState = { ...queue, index: clamped };
    writeIntakeQueue(updated);
    dispatchAudit(queue.rows[clamped] ?? {}, clamped, total);
  };

  const markReviewedAndNext = () => {
    const nextReviewed = Array.from(new Set([...queue.reviewed, index])).sort((a, b) => a - b);
    const nextIndex = index + 1 < total ? index + 1 : index;
    const updated: IntakeQueueState = { ...queue, reviewed: nextReviewed, index: nextIndex };
    writeIntakeQueue(updated);
    if (nextIndex !== index) {
      dispatchAudit(queue.rows[nextIndex] ?? {}, nextIndex, total);
    } else {
      toast.success('اكتملت مراجعة جميع الصفوف');
    }
  };

  const skipToNext = () => {
    if (index + 1 < total) move(index + 1);
    else toast('لا يوجد صف تالي');
  };

  const restart = () => {
    const updated: IntakeQueueState = { ...queue, index: 0, reviewed: [] };
    writeIntakeQueue(updated);
    dispatchAudit(queue.rows[0] ?? {}, 0, total);
  };

  const closeQueue = () => writeIntakeQueue(null);

  const fields = KEY_FIELDS.filter((f) => (row[f.key] ?? '').trim().length > 0);

  return (
    <Card
      data-testid="intake-row-preview-banner"
      className={`mb-3 border-primary/30 bg-primary/5 p-3 ${className ?? ''}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
        <span className="text-xs font-semibold">
          <Bi ar="تدقيق الصف الحالي" en="Audit current row" />
        </span>
        <Badge variant="outline" className="text-[10px] tech-content">
          {index + 1} / {total}
        </Badge>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
          <Bi ar={`مراجَعة: ${doneCount}/${total}`} en={`Reviewed: ${doneCount}/${total}`} />
        </Badge>
        {isReviewed && (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
            <CheckCircle2 className="me-1 h-3 w-3" aria-hidden />
            <Bi ar="تمت المراجعة" en="Reviewed" />
          </Badge>
        )}
        <span className="ms-auto truncate text-[11px] text-muted-foreground tech-content">
          {queue.fileName}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={closeQueue}
          className="h-7 w-7 rounded-lg p-0"
          aria-label="إغلاق طابور المراجعة"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>

      {fields.length > 0 ? (
        <div className="grid grid-cols-1 gap-1.5 rounded-lg bg-background/70 p-2 text-[11px] sm:grid-cols-2 md:grid-cols-3">
          {fields.slice(0, 9).map((f) => (
            <div key={f.key} className="flex min-w-0 flex-col">
              <span className="text-[10px] text-muted-foreground">
                <Bi ar={f.ar} en={f.en} />
              </span>
              <span className="truncate font-medium tech-content" dir="auto" title={row[f.key]}>
                {row[f.key]}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-background/70 p-2 text-[11px] text-muted-foreground">
          <Bi ar="لا تتوفر حقول رئيسية لهذا الصف." en="No key fields available for this row." />
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => move(index - 1)}
          disabled={index === 0}
          className="h-8 rounded-lg text-[11px]"
        >
          <ArrowRight className="me-1 h-3.5 w-3.5 rtl:hidden" aria-hidden />
          <ArrowLeft className="me-1 hidden h-3.5 w-3.5 rtl:inline" aria-hidden />
          <Bi ar="السابق" en="Previous" />
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={markReviewedAndNext}
          className="h-8 rounded-lg text-[11px]"
          data-testid="intake-row-mark-reviewed-next"
        >
          <CheckCircle2 className="me-1 h-3.5 w-3.5" aria-hidden />
          <Bi
            ar={index + 1 < total ? 'تم — التالي' : 'تم — إنهاء'}
            en={index + 1 < total ? 'Done — Next' : 'Done — Finish'}
          />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={skipToNext}
          disabled={index + 1 >= total}
          className="h-8 rounded-lg text-[11px]"
          data-testid="intake-row-skip-next"
        >
          <SkipForward className="me-1 h-3.5 w-3.5" aria-hidden />
          <Bi ar="تخطي" en="Skip" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={restart}
          className="ms-auto h-8 rounded-lg text-[11px] text-muted-foreground"
        >
          <RefreshCw className="me-1 h-3.5 w-3.5" aria-hidden />
          <Bi ar="إعادة من الأول" en="Restart" />
        </Button>
      </div>
    </Card>
  );
};

export default IntakeRowPreviewBanner;