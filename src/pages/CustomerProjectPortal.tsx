/**
 * CUSTOMER-EXPERIENCE-1 — Public tokenized customer tracking portal.
 *
 * Route: /client/:refId?t=<token>
 *
 * Read-only. No customer login required (tokenized access). Calls only the
 * SECURITY DEFINER RPC `get_customer_project_snapshot` via the dedicated
 * service. No direct `supabase.from` access. No raw UUIDs, no raw tokens
 * surfaced. No procurement / supplier / staff / internal-note data.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Building2,
  FileText,
  ScrollText,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNoIndex } from '@/hooks/useNoIndex';
import {
  getCustomerProjectSnapshot,
  type CustomerProjectSnapshot,
  type CustomerMilestoneKey,
} from '@/modules/customerTracking';

const MILESTONE_ORDER: CustomerMilestoneKey[] = [
  'quotation_sent',
  'quotation_approved',
  'contract_ready',
  'production_started',
  'qc',
  'ready_for_installation',
  'installation',
  'completed',
];

export default function CustomerProjectPortal() {
  useNoIndex();
  const { refId } = useParams<{ refId: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const { isRTL } = useLanguage();

  const [snapshot, setSnapshot] = useState<CustomerProjectSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tx = useMemo(
    () => ({
      loading: isRTL ? 'جارٍ التحميل…' : 'Loading…',
      invalid: isRTL
        ? 'الرابط غير صالح أو منتهي الصلاحية.'
        : 'This link is invalid or has expired.',
      tracking: isRTL ? 'متابعة المشروع' : 'Project Tracking',
      status: isRTL ? 'حالة المشروع' : 'Project Status',
      currentStage: isRTL ? 'المرحلة الحالية' : 'Current Stage',
      progress: isRTL ? 'نسبة الإنجاز' : 'Progress',
      dueDate: isRTL ? 'تاريخ التسليم' : 'Due Date',
      installationDate: isRTL ? 'تاريخ التركيب' : 'Installation Date',
      documents: isRTL ? 'المستندات' : 'Documents',
      lastUpdated: isRTL ? 'آخر تحديث' : 'Last Updated',
      quotation: isRTL ? 'عرض السعر' : 'Quotation',
      contract: isRTL ? 'العقد' : 'Contract',
      noDocs: isRTL ? 'لا توجد مستندات متاحة بعد.' : 'No documents available yet.',
      stageLabels: {
        draft: isRTL ? 'مسودة' : 'Draft',
        measured: isRTL ? 'قياسات' : 'Measurements',
        quoted: isRTL ? 'تم التسعير' : 'Quoted',
        approved: isRTL ? 'تمت الموافقة' : 'Approved',
        engineering: isRTL ? 'هندسة' : 'Engineering',
        procurement: isRTL ? 'تحضير المواد' : 'Materials',
        fabrication: isRTL ? 'تصنيع' : 'Fabrication',
        qc: isRTL ? 'فحص الجودة' : 'Quality Check',
        ready: isRTL ? 'جاهز للتركيب' : 'Ready',
        installation: isRTL ? 'تركيب' : 'Installation',
        completed: isRTL ? 'مكتمل' : 'Completed',
        cancelled: isRTL ? 'ملغى' : 'Cancelled',
      } as Record<string, string>,
      milestoneLabels: {
        quotation_sent: isRTL ? 'إرسال عرض السعر' : 'Quotation sent',
        quotation_approved: isRTL ? 'اعتماد العرض' : 'Quotation approved',
        contract_ready: isRTL ? 'تجهيز العقد' : 'Contract ready',
        production_started: isRTL ? 'بدء الإنتاج' : 'Production started',
        qc: isRTL ? 'فحص الجودة' : 'Quality check',
        ready_for_installation: isRTL ? 'جاهز للتركيب' : 'Ready for installation',
        installation: isRTL ? 'التركيب' : 'Installation',
        completed: isRTL ? 'مكتمل' : 'Completed',
      } as Record<CustomerMilestoneKey, string>,
    }),
    [isRTL],
  );

  const load = useCallback(async () => {
    if (!refId || !token) {
      setError(tx.invalid);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await getCustomerProjectSnapshot({
      refId,
      token,
    });
    setLoading(false);
    if (err || !data) {
      setError(tx.invalid);
      return;
    }
    setSnapshot(data);
  }, [refId, token, tx.invalid]);

  useEffect(() => {
    void load();
  }, [load]);

  const businessName = useMemo(() => {
    if (!snapshot) return '';
    return (
      (isRTL ? snapshot.business?.name_ar : snapshot.business?.name_en) ||
      snapshot.business?.name_ar ||
      snapshot.business?.name_en ||
      ''
    );
  }, [snapshot, isRTL]);

  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-muted/40 py-6 px-3 sm:px-6"
      data-testid="customer-project-portal"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> {tx.loading}
          </div>
        )}
        {error && (
          <div
            className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2"
            data-testid="customer-portal-error"
          >
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {snapshot && (
          <>
            {/* Header */}
            <header className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                {snapshot.business?.logo_url ? (
                  <img
                    src={snapshot.business.logo_url}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover border"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">{tx.tracking}</div>
                  <h1 className="text-lg font-semibold truncate">
                    {snapshot.project_title}
                  </h1>
                  <div className="text-xs text-muted-foreground tech-content mt-0.5">
                    {snapshot.project_ref}
                    {businessName ? ` · ${businessName}` : ''}
                  </div>
                </div>
                <span
                  className="rounded-full border px-2 py-0.5 text-xs bg-background"
                  data-testid="customer-portal-status-badge"
                >
                  {tx.stageLabels[snapshot.stage_key] ?? snapshot.stage_key}
                </span>
              </div>
            </header>

            {/* Progress */}
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{tx.currentStage}</div>
                <div className="text-sm text-muted-foreground tech-content">
                  {snapshot.progress}%
                </div>
              </div>
              <div
                className="h-2 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={snapshot.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, snapshot.progress))}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                {snapshot.due_at && (
                  <span>
                    {tx.dueDate}:{' '}
                    <span className="tech-content">
                      {new Date(snapshot.due_at).toLocaleDateString()}
                    </span>
                  </span>
                )}
                {snapshot.completed_at && (
                  <span className="text-emerald-600">
                    <CheckCircle2 className="w-3 h-3 inline me-1" />
                    <span className="tech-content">
                      {new Date(snapshot.completed_at).toLocaleDateString()}
                    </span>
                  </span>
                )}
              </div>
            </section>

            {/* Timeline / Milestones */}
            <section
              className="rounded-2xl border bg-card p-5 shadow-sm"
              data-testid="customer-portal-timeline"
            >
              <div className="text-sm font-medium mb-3">{tx.status}</div>
              <ol className="space-y-2">
                {MILESTONE_ORDER.map((key) => {
                  const m = snapshot.milestones.find((x) => x.key === key);
                  const reached = !!m?.reached;
                  return (
                    <li
                      key={key}
                      className="flex items-center gap-2 text-sm"
                      data-milestone={key}
                      data-reached={reached ? 'true' : 'false'}
                    >
                      {reached ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span
                        className={
                          reached ? 'text-foreground' : 'text-muted-foreground'
                        }
                      >
                        {tx.milestoneLabels[key]}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* Documents */}
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                <ScrollText className="w-4 h-4" /> {tx.documents}
              </div>
              {!snapshot.quotation && !snapshot.contract ? (
                <div className="text-xs text-muted-foreground">{tx.noDocs}</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {snapshot.quotation && (
                    <li className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>{tx.quotation}</span>
                      <span className="tech-content text-muted-foreground">
                        {snapshot.quotation.ref_id}
                      </span>
                      <span className="ms-auto text-xs rounded-full border px-2 py-0.5">
                        {snapshot.quotation.status}
                      </span>
                    </li>
                  )}
                  {snapshot.contract && (
                    <li className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>{tx.contract}</span>
                      <span className="tech-content text-muted-foreground">
                        {snapshot.contract.contract_number}
                      </span>
                      <span className="ms-auto text-xs rounded-full border px-2 py-0.5">
                        {snapshot.contract.status}
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </section>

            {/* Last updated */}
            {snapshot.updated_at && (
              <div className="text-xs text-muted-foreground text-center">
                {tx.lastUpdated}:{' '}
                <span className="tech-content">
                  {new Date(snapshot.updated_at).toLocaleString()}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}