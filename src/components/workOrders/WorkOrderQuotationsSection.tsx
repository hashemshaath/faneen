/**
 * BUSINESS-WORKFLOW-5D — Quotations section for the work order detail page.
 *
 * Inline UI (no modals). Lets a manager:
 *   • Generate a quotation snapshot from a finalized BOQ
 *   • Send it (assigns a one-time approval token, returned ONCE)
 *   • Open the printable preview (browser print-to-PDF)
 *   • Copy the tokenized client share link
 *
 * No payments / contracts / notifications / realtime / signed URLs.
 * No direct supabase.from — all DB access goes through module services.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  FileText,
  Send,
  Printer,
  Link2,
  CheckCircle2,
  XCircle,
  Clock,
  FileSignature,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ReferenceTag } from "@/components/reference/ReferenceTag";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  listWorkOrderBoqs,
  listBoqItems,
  listWorkOrderQuotations,
  listQuotationItems,
  createQuotationFromBoq,
  sendWorkOrderQuotation,
  generateQuotationPdfData,
  createContractDraftFromApprovedQuotation,
  type WorkOrderBoqRow,
  type WorkOrderQuotationRow,
  type WorkOrderQuotationItemRow,
  type WorkOrderQuotationStatus,
} from "@/modules/workOrders";
import { WorkOrderQuotationPdf } from "./WorkOrderQuotationPdf";
import { HealthBadge } from "@/components/health/HealthBadge";
import { quotationHealth } from "@/modules/health";
import { QuotationRevisionHistory } from "@/components/quotes/QuotationRevisionHistory";

interface Props {
  workOrderId: string;
  businessId: string;
  canManage: boolean;
}

function statusTone(s: WorkOrderQuotationStatus): string {
  switch (s) {
    case "approved":
      return "border-emerald-500/40 text-emerald-600";
    case "rejected":
      return "border-destructive/40 text-destructive";
    case "expired":
      return "border-muted-foreground/40 text-muted-foreground";
    case "sent":
    case "viewed":
      return "border-blue-500/40 text-blue-600";
    default:
      return "border-amber-500/40 text-amber-600";
  }
}

export function WorkOrderQuotationsSection({
  workOrderId,
  businessId,
  canManage,
}: Props) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  const [boqs, setBoqs] = useState<WorkOrderBoqRow[]>([]);
  const [quotations, setQuotations] = useState<WorkOrderQuotationRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<WorkOrderQuotationItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Generate form
  const [genOpen, setGenOpen] = useState(false);
  const [selectedBoqId, setSelectedBoqId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState<string>("");

  // Printable preview toggle
  const [printOpen, setPrintOpen] = useState(false);

  const tx = useMemo(
    () => ({
      title: isRTL ? "عروض الأسعار" : "Quotations",
      generate: isRTL ? "إنشاء عرض سعر" : "Generate quotation",
      cancel: isRTL ? "إلغاء" : "Cancel",
      create: isRTL ? "إنشاء" : "Create",
      empty: isRTL ? "لا توجد عروض أسعار بعد." : "No quotations yet.",
      noBoqs: isRTL
        ? "لا يوجد جدول كميات معتمد لتوليد عرض سعر منه."
        : "No finalized BOQ available to generate a quotation from.",
      sourceBoq: isRTL ? "جدول الكميات" : "Source BOQ",
      titleLabel: isRTL ? "عنوان العرض" : "Quotation title",
      notes: isRTL ? "ملاحظات" : "Notes",
      validUntil: isRTL ? "صالح حتى" : "Valid until",
      send: isRTL ? "إرسال" : "Send",
      print: isRTL ? "طباعة PDF" : "Print PDF",
      copyLink: isRTL ? "نسخ رابط العميل" : "Copy client link",
      closePrint: isRTL ? "إغلاق المعاينة" : "Close preview",
      preview: isRTL ? "معاينة" : "Preview",
      shareNotice: isRTL
        ? "احتفظ بهذا الرابط — لن يظهر مرة أخرى."
        : "Save this link — it will not be shown again.",
      errLoad: isRTL ? "تعذّر تحميل البيانات." : "Failed to load data.",
      errGen: isRTL ? "تعذّر إنشاء العرض." : "Failed to generate quotation.",
      errSend: isRTL ? "تعذّر إرسال العرض." : "Failed to send quotation.",
      errConvert: isRTL ? "تعذّر إنشاء مسودة العقد." : "Failed to create contract draft.",
      createContractDraft: isRTL ? "إنشاء مسودة عقد" : "Create contract draft",
      openContract: isRTL ? "فتح العقد" : "Open contract",
      signedBy: isRTL ? "وقّع باسم" : "Signed by",
      copied: isRTL ? "تم النسخ" : "Copied",
      sent: isRTL ? "مُرسل" : "Sent",
      viewed: isRTL ? "تمت المشاهدة" : "Viewed",
      approved: isRTL ? "معتمد" : "Approved",
      rejected: isRTL ? "مرفوض" : "Rejected",
      expired: isRTL ? "منتهي" : "Expired",
      draft: isRTL ? "مسودة" : "Draft",
    }),
    [isRTL],
  );

  const statusLabel = useCallback(
    (s: WorkOrderQuotationStatus): string => {
      switch (s) {
        case "approved": return tx.approved;
        case "rejected": return tx.rejected;
        case "sent": return tx.sent;
        case "viewed": return tx.viewed;
        case "expired": return tx.expired;
        default: return tx.draft;
      }
    },
    [tx],
  );

  /* ─── Loaders ─── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [boqRes, qRes] = await Promise.all([
      listWorkOrderBoqs({ workOrderId }),
      listWorkOrderQuotations({ workOrderId }),
    ]);
    if (boqRes.error || qRes.error) {
      setError(tx.errLoad);
      setLoading(false);
      return;
    }
    const finalized = (boqRes.data ?? []).filter((b) => b.status === "finalized");
    setBoqs(finalized);
    setQuotations(qRes.data ?? []);
    if (!activeId && (qRes.data ?? []).length > 0) {
      setActiveId(qRes.data![0].id);
    }
    setLoading(false);
  }, [workOrderId, tx.errLoad, activeId]);

  const loadItems = useCallback(async (qid: string) => {
    const { data, error: err } = await listQuotationItems({ quotationId: qid });
    if (err) { setError(tx.errLoad); return; }
    setItems(data ?? []);
  }, [tx.errLoad]);

  useEffect(() => { void loadAll(); }, [loadAll]);
  useEffect(() => {
    if (activeId) void loadItems(activeId);
    else setItems([]);
  }, [activeId, loadItems]);

  const activeQuotation = useMemo(
    () => quotations.find((q) => q.id === activeId) ?? null,
    [quotations, activeId],
  );

  /* ─── Actions ─── */
  const onGenerate = useCallback(async () => {
    if (!user) return;
    const boq = boqs.find((b) => b.id === selectedBoqId);
    if (!boq) { setError(tx.errGen); return; }
    setBusy(true); setError(null);
    const { data: boqItems, error: boqErr } = await listBoqItems({ boqId: boq.id });
    if (boqErr) { setError(tx.errGen); setBusy(false); return; }
    const finalTitle = title.trim() || (isRTL ? "عرض سعر جديد" : "New quotation");
    const { quotation, error: err } = await createQuotationFromBoq({
      boq,
      items: boqItems ?? [],
      created_by: user.id,
      title: finalTitle,
      notes: notes.trim() || null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    });
    setBusy(false);
    if (err || !quotation) { setError(tx.errGen); return; }
    setGenOpen(false);
    setTitle(""); setNotes(""); setValidUntil("");
    setActiveId(quotation.id);
    await loadAll();
  }, [user, boqs, selectedBoqId, title, notes, validUntil, isRTL, tx.errGen, loadAll]);

  const onSend = useCallback(async () => {
    if (!user || !activeQuotation || activeQuotation.status !== "draft") return;
    setBusy(true); setError(null);
    const { quotation, token, error: err } = await sendWorkOrderQuotation({
      quotation_id: activeQuotation.id,
      actor_id: user.id,
    });
    setBusy(false);
    if (err || !quotation || !token) { setError(tx.errSend); return; }
    setQuotations((prev) => prev.map((q) => (q.id === quotation.id ? quotation : q)));
    setShareToken(token);
  }, [user, activeQuotation, tx.errSend]);

  const clientUrl = useMemo(() => {
    if (!activeQuotation || !shareToken) return null;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/q/${activeQuotation.ref_id}?t=${shareToken}`;
  }, [activeQuotation, shareToken]);

  const onCopyLink = useCallback(async () => {
    if (!clientUrl) return;
    try {
      await navigator.clipboard?.writeText(clientUrl);
    } catch {
      /* no-op */
    }
  }, [clientUrl]);

  const onConvertToContract = useCallback(async () => {
    if (!user || !activeQuotation || activeQuotation.status !== "approved") return;
    setBusy(true); setError(null);
    const res = await createContractDraftFromApprovedQuotation({
      quotationId: activeQuotation.id,
      businessId: activeQuotation.business_id,
      workOrderId: activeQuotation.work_order_id,
      actorId: user.id,
      quotationRefId: activeQuotation.ref_id,
    });
    setBusy(false);
    if (res.error || !res.contractId) {
      setError(tx.errConvert);
      return;
    }
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === activeQuotation.id ? { ...q, contract_id: res.contractId } : q,
      ),
    );
  }, [user, activeQuotation, tx.errConvert]);

  const pdfData = useMemo(() => {
    if (!activeQuotation) return null;
    return generateQuotationPdfData({
      quotation: activeQuotation,
      items,
      business: {},
    });
  }, [activeQuotation, items]);

  /* ─── Render ─── */
  return (
    <section
      className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3"
      aria-label={tx.title}
      data-testid="wo-quotations-section"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent" />
          <h2 className="font-semibold text-sm">{tx.title}</h2>
        </div>
        {canManage && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl h-9"
            onClick={() => setGenOpen((v) => !v)}
            disabled={busy || boqs.length === 0}
            data-testid="wo-quotations-generate-btn"
          >
            <FileText className="w-3.5 h-3.5 me-1" />
            {tx.generate}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {boqs.length === 0 && quotations.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">{tx.noBoqs}</p>
      )}

      {/* Inline generate form */}
      {genOpen && canManage && boqs.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">{tx.sourceBoq}</span>
              <select
                className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm"
                value={selectedBoqId || boqs[0]?.id || ""}
                onChange={(e) => setSelectedBoqId(e.target.value)}
                aria-label={tx.sourceBoq}
              >
                {boqs.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ref_id ?? b.id} — {b.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">{tx.titleLabel}</span>
              <Input
                dir="auto"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 rounded-lg"
                maxLength={200}
              />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">{tx.validUntil}</span>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-9 rounded-lg tech-content"
              />
            </label>
          </div>
          <label className="text-xs space-y-1 block">
            <span className="text-muted-foreground">{tx.notes}</span>
            <Textarea
              dir="auto"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-lg min-h-[60px]"
              maxLength={1000}
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button" size="sm" variant="ghost"
              className="rounded-xl h-9"
              onClick={() => setGenOpen(false)}
              disabled={busy}
            >
              {tx.cancel}
            </Button>
            <Button
              type="button" size="sm"
              className="rounded-xl h-9"
              onClick={() => void onGenerate()}
              disabled={busy}
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : null}
              {tx.create}
            </Button>
          </div>
        </div>
      )}

      {/* Quotations list tabs */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        </div>
      ) : quotations.length === 0 ? (
        boqs.length > 0 && (
          <p className="text-xs text-muted-foreground">{tx.empty}</p>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {quotations.map((q) => {
              const active = q.id === activeId;
              return (
                <button
                  key={q.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveId(q.id)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 hover:bg-accent/5"
                  }`}
                >
                  <ReferenceTag refId={q.ref_id} isRTL={isRTL} />
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${statusTone(q.status)}`}
                  >
                    {statusLabel(q.status)}
                  </Badge>
                  <HealthBadge
                    kind="quotation"
                    value={quotationHealth(q.status, (q as { expires_at?: string | null }).expires_at ?? null)}
                  />
                </button>
              );
            })}
          </div>

          {activeQuotation && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate" dir="auto">
                    {activeQuotation.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground tech-content">
                    {activeQuotation.quotation_number} · {activeQuotation.total.toFixed(2)}{" "}
                    {activeQuotation.currency}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button" size="sm" variant="outline"
                    className="rounded-xl h-9"
                    onClick={() => setPrintOpen((v) => !v)}
                    data-testid="wo-quotations-print-btn"
                  >
                    <Printer className="w-3.5 h-3.5 me-1" />
                    {printOpen ? tx.closePrint : tx.print}
                  </Button>
                  {canManage && activeQuotation.status === "draft" && (
                    <Button
                      type="button" size="sm"
                      className="rounded-xl h-9"
                      onClick={() => void onSend()}
                      disabled={busy}
                      data-testid="wo-quotations-send-btn"
                    >
                      <Send className="w-3.5 h-3.5 me-1" />
                      {tx.send}
                    </Button>
                  )}
                  {canManage &&
                    activeQuotation.status === "approved" &&
                    !activeQuotation.contract_id && (
                      <Button
                        type="button" size="sm"
                        className="rounded-xl h-9"
                        onClick={() => void onConvertToContract()}
                        disabled={busy}
                        data-testid="wo-quotations-create-contract-draft-btn"
                      >
                        <FileSignature className="w-3.5 h-3.5 me-1" />
                        {tx.createContractDraft}
                      </Button>
                    )}
                  {activeQuotation.contract_id && (
                    <Link
                      to={`/dashboard/contracts/${activeQuotation.contract_id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-3 h-9 text-xs text-emerald-700 hover:bg-emerald-500/10"
                      data-testid="wo-quotations-open-contract-link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {tx.openContract}
                    </Link>
                  )}
                </div>
              </div>

              {activeQuotation.status === "approved" &&
                activeQuotation.approved_by_name && (
                  <div
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-700"
                    data-testid="wo-quotations-signature-block"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 inline me-1" />
                    <span className="opacity-80">{tx.signedBy}:</span>{" "}
                    <span className="font-medium" dir="auto">
                      {activeQuotation.approved_by_name}
                    </span>
                    {activeQuotation.approved_by_title && (
                      <>
                        {" — "}
                        <span dir="auto">{activeQuotation.approved_by_title}</span>
                      </>
                    )}
                  </div>
                )}

              {/* One-time share link surface (shown only right after sending). */}
              {shareToken && clientUrl && activeQuotation.status !== "draft" && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-emerald-700">
                    <Link2 className="w-3.5 h-3.5" /> {tx.shareNotice}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={clientUrl}
                      className="h-9 rounded-lg tech-content text-[11px]"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button" size="sm" variant="outline"
                      className="rounded-xl h-9"
                      onClick={() => void onCopyLink()}
                    >
                      {tx.copyLink}
                    </Button>
                    <Link
                      to={`/q/${activeQuotation.ref_id}?t=${shareToken}`}
                      target="_blank"
                      className="text-[11px] underline text-emerald-700"
                    >
                      {tx.preview}
                    </Link>
                  </div>
                </div>
              )}

              {/* Status timeline summary */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                {activeQuotation.sent_at && (
                  <span className="inline-flex items-center gap-1">
                    <Send className="w-3 h-3" /> {tx.sent}
                  </span>
                )}
                {activeQuotation.viewed_at && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {tx.viewed}
                  </span>
                )}
                {activeQuotation.approved_at && (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> {tx.approved}
                  </span>
                )}
                {activeQuotation.rejected_at && (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <XCircle className="w-3 h-3" /> {tx.rejected}
                  </span>
                )}
              </div>

              {/* Inline printable preview */}
              {printOpen && pdfData && (
                <div className="rounded-xl border border-border/40 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-end">
                    <Button
                      type="button" size="sm" variant="outline"
                      className="rounded-xl h-9 print:hidden"
                      onClick={() => window.print()}
                    >
                      <Printer className="w-3.5 h-3.5 me-1" />
                      {tx.print}
                    </Button>
                  </div>
                  <WorkOrderQuotationPdf data={pdfData} isRTL={isRTL} />
                </div>
              )}

              {/* BUSINESS-FINISHING-2A — read-only revision history */}
              {activeQuotation.ref_id && (
                <QuotationRevisionHistory
                  businessId={businessId}
                  quotationRefId={activeQuotation.ref_id}
                />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}