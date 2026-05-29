/**
 * CUSTOMER-EXPERIENCE-2 — Provider-side installation appointment card.
 * Inline-only UI (no dialogs/modals).
 */
import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Loader2, Pencil, X, Plus, MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  cancelInstallationAppointment,
  completeInstallationAppointment,
  createInstallationAppointment,
  getInstallationAppointmentByWorkOrder,
  updateInstallationAppointment,
  type InstallationAppointmentRow,
} from '@/modules/installationAppointments';

interface Props {
  workOrderId: string;
  canManage: boolean;
}

export function InstallationAppointmentCard({ workOrderId, canManage }: Props) {
  const { isRTL } = useLanguage();
  const [apt, setApt] = useState<InstallationAppointmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const [date, setDate] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tx = {
    title: isRTL ? 'موعد التركيب' : 'Installation Appointment',
    none: isRTL ? 'لا يوجد موعد تركيب مجدول.' : 'No installation appointment scheduled.',
    schedule: isRTL ? 'جدولة موعد' : 'Schedule appointment',
    date: isRTL ? 'التاريخ' : 'Date',
    window: isRTL ? 'الفترة الزمنية (اختياري)' : 'Time window (optional)',
    internal: isRTL ? 'ملاحظة داخلية (لا تظهر للعميل)' : 'Internal note (not shown to customer)',
    save: isRTL ? 'حفظ' : 'Save',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    edit: isRTL ? 'تعديل' : 'Edit',
    complete: isRTL ? 'تم التركيب' : 'Mark completed',
    cancelApt: isRTL ? 'إلغاء الموعد' : 'Cancel appointment',
    customerReq: isRTL ? 'طلب العميل' : 'Customer note',
    status: isRTL ? 'الحالة' : 'Status',
    confirmation: isRTL ? 'تأكيد العميل' : 'Customer confirmation',
    statusLabels: {
      scheduled: isRTL ? 'مجدول' : 'Scheduled',
      confirmed: isRTL ? 'مؤكد' : 'Confirmed',
      reschedule_requested: isRTL ? 'طلب إعادة جدولة' : 'Reschedule requested',
      completed: isRTL ? 'مكتمل' : 'Completed',
      cancelled: isRTL ? 'ملغى' : 'Cancelled',
    } as Record<string, string>,
    confLabels: {
      pending: isRTL ? 'بانتظار العميل' : 'Pending',
      confirmed: isRTL ? 'مؤكد' : 'Confirmed',
      reschedule_requested: isRTL ? 'طلب إعادة جدولة' : 'Reschedule requested',
    } as Record<string, string>,
    errLoad: isRTL ? 'تعذّر تحميل الموعد.' : 'Could not load appointment.',
    errSave: isRTL ? 'تعذّر الحفظ.' : 'Save failed.',
    missingDate: isRTL ? 'التاريخ مطلوب.' : 'Date is required.',
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getInstallationAppointmentByWorkOrder(workOrderId);
    setLoading(false);
    if (err) { setError(tx.errLoad); return; }
    setApt(data);
    if (data) {
      setDate(data.scheduled_date);
      setTimeWindow(data.time_window ?? '');
      setInternalNote(data.internal_note ?? '');
    }
  }, [workOrderId, tx.errLoad]);

  useEffect(() => { void load(); }, [load]);

  const onSave = useCallback(async () => {
    if (!date) { setError(tx.missingDate); return; }
    setBusy(true);
    setError(null);
    if (mode === 'create') {
      const res = await createInstallationAppointment({
        workOrderId,
        scheduledDate: date,
        timeWindow: timeWindow || null,
        internalNote: internalNote || null,
      });
      setBusy(false);
      if (!res.ok) { setError(tx.errSave); return; }
    } else if (mode === 'edit' && apt) {
      const res = await updateInstallationAppointment({
        refId: apt.ref_id,
        scheduledDate: date,
        timeWindow: timeWindow || null,
        internalNote: internalNote || null,
      });
      setBusy(false);
      if (!res.ok) { setError(tx.errSave); return; }
    } else {
      setBusy(false);
    }
    setMode('view');
    await load();
  }, [mode, date, timeWindow, internalNote, workOrderId, apt, tx.errSave, tx.missingDate, load]);

  const onComplete = useCallback(async () => {
    if (!apt) return;
    setBusy(true);
    const res = await completeInstallationAppointment(apt.ref_id);
    setBusy(false);
    if (!res.ok) { setError(tx.errSave); return; }
    await load();
  }, [apt, load, tx.errSave]);

  const onCancel = useCallback(async () => {
    if (!apt) return;
    setBusy(true);
    const res = await cancelInstallationAppointment(apt.ref_id);
    setBusy(false);
    if (!res.ok) { setError(tx.errSave); return; }
    await load();
  }, [apt, load, tx.errSave]);

  if (!canManage) return null;

  return (
    <div
      className="rounded-2xl border bg-card p-4 shadow-sm"
      data-testid="installation-appointment-card"
    >
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{tx.title}</h3>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      ) : mode === 'create' || mode === 'edit' ? (
        <div className="space-y-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl"
            aria-label={tx.date}
          />
          <Input
            type="text"
            placeholder={tx.window}
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value)}
            className="rounded-xl"
            aria-label={tx.window}
          />
          <Textarea
            placeholder={tx.internal}
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            className="rounded-xl min-h-[60px]"
            aria-label={tx.internal}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setMode('view'); setError(null); }}
              disabled={busy}
            >
              {tx.cancel}
            </Button>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={() => void onSave()}
              disabled={busy || !date}
              data-testid="apt-save"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : null}
              {tx.save}
            </Button>
          </div>
        </div>
      ) : !apt ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{tx.none}</p>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-10"
            onClick={() => { setMode('create'); setDate(''); setTimeWindow(''); setInternalNote(''); }}
            data-testid="apt-create"
          >
            <Plus className="w-4 h-4 me-1" />
            {tx.schedule}
          </Button>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground tech-content">
            <span>{apt.ref_id}</span>
            <span>
              {tx.status}: <span className="text-foreground">{tx.statusLabels[apt.status] ?? apt.status}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">{tx.date}</div>
              <div className="tech-content">{apt.scheduled_date}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{tx.window}</div>
              <div>{apt.time_window || '—'}</div>
            </div>
          </div>
          <div className="text-xs">
            {tx.confirmation}:{' '}
            <span className="font-medium">
              {tx.confLabels[apt.customer_confirmation_status] ?? apt.customer_confirmation_status}
            </span>
          </div>
          {apt.customer_note && (
            <div
              className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 p-2 text-xs flex gap-2"
              data-testid="apt-customer-note"
            >
              <MessageSquareWarning className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
              <div>
                <div className="font-medium text-foreground">{tx.customerReq}</div>
                <p className="whitespace-pre-wrap" dir="auto">{apt.customer_note}</p>
              </div>
            </div>
          )}
          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" className="rounded-xl h-9" onClick={() => setMode('edit')} data-testid="apt-edit">
                <Pencil className="w-3.5 h-3.5 me-1" /> {tx.edit}
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl h-9" onClick={() => void onComplete()} disabled={busy} data-testid="apt-complete">
                <CheckCircle2 className="w-3.5 h-3.5 me-1 text-emerald-600" /> {tx.complete}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-xl h-9 text-destructive hover:text-destructive" onClick={() => void onCancel()} disabled={busy} data-testid="apt-cancel">
                <X className="w-3.5 h-3.5 me-1" /> {tx.cancelApt}
              </Button>
            </div>
          )}
        </div>
      )}
      {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
    </div>
  );
}