/**
 * CUSTOMER-EXPERIENCE-3 — Provider Project Closure card.
 *
 * Inline-only UI. No dialogs/modals/popovers. Uses typed module
 * wrappers exclusively (no direct supabase access).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Plus,
  ShieldCheck,
  ImagePlus,
  Star,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  createProjectClosure,
  addDeliveryEvidence,
  startWorkOrderWarranty,
  getProjectClosureByWorkOrder,
  listDeliveryEvidenceForClosure,
  listWarrantyByWorkOrder,
  computeWarrantyStatus,
  computeNpsScore,
  type ProjectClosureRow,
  type ProjectDeliveryEvidenceRow,
  type WorkOrderWarrantyRow,
  type CustomerFeedbackRow,
  type CustomerNpsResponseRow,
} from '@/modules/projectClosure';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  workOrderId: string;
  workOrderStatus: string;
  canManage: boolean;
}

export function ProjectClosureCard({ workOrderId, workOrderStatus, canManage }: Props) {
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [closure, setClosure] = useState<ProjectClosureRow | null>(null);
  const [evidence, setEvidence] = useState<ProjectDeliveryEvidenceRow[]>([]);
  const [warranty, setWarranty] = useState<WorkOrderWarrantyRow | null>(null);
  const [feedback, setFeedback] = useState<CustomerFeedbackRow[]>([]);
  const [nps, setNps] = useState<CustomerNpsResponseRow[]>([]);

  const [evMode, setEvMode] = useState(false);
  const [evUrl, setEvUrl] = useState('');
  const [evCapAr, setEvCapAr] = useState('');
  const [evCapEn, setEvCapEn] = useState('');

  const [warMode, setWarMode] = useState(false);
  const [warMonths, setWarMonths] = useState('12');
  const [warType, setWarType] = useState('standard');

  const tx = {
    title: isRTL ? 'إنهاء المشروع والضمان' : 'Project Closure & Warranty',
    none: isRTL ? 'لا يوجد إنهاء مسجل بعد.' : 'No closure recorded yet.',
    create: isRTL ? 'تسجيل إنهاء المشروع' : 'Create closure',
    status: isRTL ? 'الحالة' : 'Status',
    completedAt: isRTL ? 'تاريخ الاكتمال' : 'Completion date',
    confirmedAt: isRTL ? 'تأكيد العميل' : 'Customer confirmation',
    awaiting: isRTL ? 'بانتظار تأكيد العميل' : 'Awaiting customer confirmation',
    issueReported: isRTL ? 'العميل أبلغ عن ملاحظة' : 'Customer reported an issue',
    addEvidence: isRTL ? 'إضافة دليل تسليم' : 'Add delivery evidence',
    evidenceTitle: isRTL ? 'دلائل التسليم' : 'Delivery evidence',
    evidenceUrl: isRTL ? 'رابط الصورة العام' : 'Public image URL',
    capAr: isRTL ? 'تعليق بالعربية' : 'Caption (Arabic)',
    capEn: isRTL ? 'تعليق بالإنجليزية' : 'Caption (English)',
    save: isRTL ? 'حفظ' : 'Save',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    warTitle: isRTL ? 'الضمان' : 'Warranty',
    startWar: isRTL ? 'بدء الضمان' : 'Start warranty',
    months: isRTL ? 'المدة بالأشهر' : 'Months',
    type: isRTL ? 'نوع الضمان' : 'Warranty type',
    warStatus: isRTL ? 'حالة الضمان' : 'Warranty status',
    warStart: isRTL ? 'بداية الضمان' : 'Warranty start',
    warEnd: isRTL ? 'نهاية الضمان' : 'Warranty end',
    feedbackTitle: isRTL ? 'تقييم العميل' : 'Customer feedback',
    noFeedback: isRTL ? 'لم يصل أي تقييم بعد.' : 'No feedback yet.',
    avgRating: isRTL ? 'متوسط التقييم' : 'Average rating',
    npsTitle: isRTL ? 'مؤشر التوصية NPS' : 'NPS',
    nFeedback: isRTL ? 'عدد التقييمات' : 'Feedback count',
    err: isRTL ? 'تعذّر تنفيذ الإجراء.' : 'Action failed.',
    notReady: isRTL
      ? 'يمكن إنهاء المشروع بعد اكتماله.'
      : 'Closure is available after the work order is completed.',
    statusLabels: {
      pending_customer_confirmation: isRTL ? 'بانتظار تأكيد العميل' : 'Pending confirmation',
      issue_reported: isRTL ? 'تم الإبلاغ عن ملاحظة' : 'Issue reported',
      customer_confirmed: isRTL ? 'مؤكد من العميل' : 'Customer confirmed',
      warranty_started: isRTL ? 'بدأ الضمان' : 'Warranty started',
      closed: isRTL ? 'مغلق' : 'Closed',
    } as Record<string, string>,
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const cl = await getProjectClosureByWorkOrder(workOrderId);
    if (cl.error) { setError(tx.err); setLoading(false); return; }
    setClosure(cl.data);
    if (cl.data) {
      const [ev, wr, fb, np] = await Promise.all([
        listDeliveryEvidenceForClosure(cl.data.id),
        listWarrantyByWorkOrder(workOrderId),
        supabase
          .from('customer_feedback')
          .select('id, ref_id, business_id, work_order_id, closure_id, rating, feedback_text, would_recommend, created_at')
          .eq('closure_id', cl.data.id),
        supabase
          .from('customer_nps_responses')
          .select('id, business_id, work_order_id, closure_id, score, created_at')
          .eq('work_order_id', workOrderId),
      ]);
      setEvidence(ev.data);
      setWarranty(wr.data);
      setFeedback(((fb.data ?? []) as unknown) as CustomerFeedbackRow[]);
      setNps(((np.data ?? []) as unknown) as CustomerNpsResponseRow[]);
    } else {
      setEvidence([]); setWarranty(null); setFeedback([]); setNps([]);
    }
    setLoading(false);
  }, [workOrderId, tx.err]);

  useEffect(() => { void load(); }, [load]);

  const onCreate = useCallback(async () => {
    setBusy(true); setError(null);
    const res = await createProjectClosure({ workOrderId });
    setBusy(false);
    if (!res.ok) { setError(tx.err); return; }
    await load();
  }, [workOrderId, load, tx.err]);

  const onAddEvidence = useCallback(async () => {
    if (!closure || !evUrl) return;
    setBusy(true); setError(null);
    const res = await addDeliveryEvidence({
      closureId: closure.id,
      publicImageUrl: evUrl,
      captionAr: evCapAr || null,
      captionEn: evCapEn || null,
      isCustomerVisible: true,
    });
    setBusy(false);
    if (!res.ok) { setError(tx.err); return; }
    setEvMode(false); setEvUrl(''); setEvCapAr(''); setEvCapEn('');
    await load();
  }, [closure, evUrl, evCapAr, evCapEn, load, tx.err]);

  const onStartWarranty = useCallback(async () => {
    if (!closure) return;
    setBusy(true); setError(null);
    const months = Math.max(1, Math.min(120, parseInt(warMonths, 10) || 12));
    const res = await startWorkOrderWarranty({
      closureId: closure.id,
      months,
      warrantyType: warType || 'standard',
    });
    setBusy(false);
    if (!res.ok) { setError(tx.err); return; }
    setWarMode(false);
    await load();
  }, [closure, warMonths, warType, load, tx.err]);

  if (!canManage) return null;

  const avgRating = feedback.length
    ? Math.round((feedback.reduce((s, f) => s + f.rating, 0) / feedback.length) * 10) / 10
    : 0;
  const npsAgg = computeNpsScore(nps);
  const realizedWarranty = computeWarrantyStatus(warranty);

  const canCreate = workOrderStatus === 'completed';

  return (
    <div
      className="rounded-2xl border bg-card p-4 shadow-sm space-y-3"
      data-testid="project-closure-card"
    >
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{tx.title}</h3>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      ) : !closure ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{tx.none}</p>
          {!canCreate && (
            <p className="text-xs text-amber-600">{tx.notReady}</p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl h-10"
            disabled={busy || !canCreate}
            onClick={() => void onCreate()}
            data-testid="closure-create"
          >
            <Plus className="w-4 h-4 me-1" /> {tx.create}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground tech-content">
            <span>{closure.ref_id}</span>
            <span>
              {tx.status}: <span className="text-foreground">{tx.statusLabels[closure.closure_status] ?? closure.closure_status}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">{tx.completedAt}</div>
              <div className="tech-content">{closure.completion_date}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{tx.confirmedAt}</div>
              <div>
                {closure.confirmed_at ? (
                  <span className="text-emerald-600 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="tech-content">
                      {new Date(closure.confirmed_at).toLocaleDateString()}
                    </span>
                  </span>
                ) : closure.closure_status === 'issue_reported' ? (
                  <span className="text-destructive inline-flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {tx.issueReported}
                  </span>
                ) : (
                  <span className="text-amber-600">{tx.awaiting}</span>
                )}
              </div>
            </div>
          </div>

          {closure.issue_text && (
            <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 p-2 text-xs">
              <div className="font-medium text-foreground">{tx.issueReported}</div>
              <p className="whitespace-pre-wrap" dir="auto">{closure.issue_text}</p>
            </div>
          )}

          {/* Delivery evidence */}
          <section data-testid="closure-evidence" className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">{tx.evidenceTitle} · {evidence.length}</div>
              {!evMode && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl h-8"
                  onClick={() => setEvMode(true)}
                  data-testid="closure-evidence-add"
                >
                  <ImagePlus className="w-3.5 h-3.5 me-1" /> {tx.addEvidence}
                </Button>
              )}
            </div>
            {evMode && (
              <div className="space-y-2 rounded-xl border p-2">
                <Input
                  type="url"
                  placeholder={tx.evidenceUrl}
                  value={evUrl}
                  onChange={(e) => setEvUrl(e.target.value)}
                  className="rounded-xl"
                  aria-label={tx.evidenceUrl}
                />
                <Input
                  type="text"
                  placeholder={tx.capAr}
                  value={evCapAr}
                  dir="auto"
                  onChange={(e) => setEvCapAr(e.target.value.slice(0, 500))}
                  className="rounded-xl"
                  aria-label={tx.capAr}
                />
                <Input
                  type="text"
                  placeholder={tx.capEn}
                  value={evCapEn}
                  dir="auto"
                  onChange={(e) => setEvCapEn(e.target.value.slice(0, 500))}
                  className="rounded-xl"
                  aria-label={tx.capEn}
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEvMode(false)} disabled={busy}>{tx.cancel}</Button>
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void onAddEvidence()}
                    disabled={busy || !evUrl}
                    data-testid="closure-evidence-save"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : null}
                    {tx.save}
                  </Button>
                </div>
              </div>
            )}
            {evidence.length > 0 && (
              <ul className="grid grid-cols-2 gap-2">
                {evidence.map((e) => (
                  <li key={e.id} className="rounded-xl border p-1 text-xs">
                    {e.public_image_url && (
                      <img
                        src={e.public_image_url}
                        alt={(isRTL ? e.caption_ar : e.caption_en) ?? ''}
                        className="w-full h-20 object-cover rounded-lg"
                        loading="lazy"
                      />
                    )}
                    <div className="text-[10px] tech-content text-muted-foreground mt-1">{e.ref_id}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Warranty */}
          <section data-testid="closure-warranty" className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {tx.warTitle}
              </div>
              {!warranty && !warMode && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl h-8"
                  onClick={() => setWarMode(true)}
                  data-testid="closure-warranty-start"
                >
                  <Plus className="w-3.5 h-3.5 me-1" /> {tx.startWar}
                </Button>
              )}
            </div>
            {warMode && !warranty && (
              <div className="space-y-2 rounded-xl border p-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    placeholder={tx.months}
                    value={warMonths}
                    onChange={(e) => setWarMonths(e.target.value)}
                    className="rounded-xl"
                    aria-label={tx.months}
                  />
                  <Input
                    type="text"
                    placeholder={tx.type}
                    value={warType}
                    onChange={(e) => setWarType(e.target.value)}
                    className="rounded-xl"
                    aria-label={tx.type}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setWarMode(false)} disabled={busy}>{tx.cancel}</Button>
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void onStartWarranty()}
                    disabled={busy}
                    data-testid="closure-warranty-save"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin me-1" /> : null}
                    {tx.save}
                  </Button>
                </div>
              </div>
            )}
            {warranty && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">{tx.warStart}</div>
                  <div className="tech-content">{warranty.start_date}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{tx.warEnd}</div>
                  <div className="tech-content">{warranty.end_date}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{tx.warStatus}</div>
                  <div className={realizedWarranty === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}>
                    {realizedWarranty}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Feedback + NPS */}
          <section data-testid="closure-feedback" className="grid grid-cols-2 gap-3 text-xs pt-1 border-t">
            <div>
              <div className="font-medium flex items-center gap-1">
                <Star className="w-3.5 h-3.5" /> {tx.feedbackTitle}
              </div>
              {feedback.length === 0 ? (
                <div className="text-muted-foreground mt-1">{tx.noFeedback}</div>
              ) : (
                <>
                  <div className="mt-1">{tx.avgRating}: <span className="tech-content">{avgRating}</span> / 5</div>
                  <div>{tx.nFeedback}: <span className="tech-content">{feedback.length}</span></div>
                </>
              )}
            </div>
            <div>
              <div className="font-medium">{tx.npsTitle}</div>
              <div className="mt-1 tech-content">{npsAgg.score}</div>
              <div className="text-muted-foreground">
                P {npsAgg.promoters} · Pa {npsAgg.passives} · D {npsAgg.detractors}
              </div>
            </div>
          </section>
        </div>
      )}

      {error && <div className="text-xs text-destructive">{error}</div>}
    </div>
  );
}