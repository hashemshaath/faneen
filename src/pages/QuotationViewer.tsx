/**
 * BUSINESS-WORKFLOW-5D — Public tokenized quotation viewer (`/q/:code?t=…`).
 *
 * No dashboard auth required if the token is valid. Read-only. Approve /
 * reject inline via the SECURITY DEFINER RPCs. Mobile-friendly. No modals.
 * No direct supabase.from — all access goes through module services.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNoIndex } from "@/hooks/useNoIndex";
import {
  getQuotationByToken,
  approveWorkOrderQuotation,
  rejectWorkOrderQuotation,
  generateQuotationPdfDataFromPublicView,
  type PublicQuotationView,
} from "@/modules/workOrders";
import { WorkOrderQuotationPdf } from "@/components/workOrders/WorkOrderQuotationPdf";

export default function QuotationViewer() {
  useNoIndex();
  // APP-STABILITY-CLEANUP-SECURITY-1: route param is `code` (dispatched
  // from /q/:code). Accept legacy `refId` too for external callers.
  const rawParams = useParams<{ code?: string; refId?: string }>();
  const refId = rawParams.code ?? rawParams.refId;
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const { isRTL } = useLanguage();

  const [view, setView] = useState<PublicQuotationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  // Approval signature form
  const [approveOpen, setApproveOpen] = useState(false);
  const [signName, setSignName] = useState("");
  const [signTitle, setSignTitle] = useState("");
  const [signature, setSignature] = useState("");
  const [consent, setConsent] = useState(false);

  const tx = useMemo(
    () => ({
      loading: isRTL ? "جارٍ التحميل…" : "Loading…",
      invalid: isRTL
        ? "الرابط غير صالح أو منتهي الصلاحية."
        : "This link is invalid or has expired.",
      approve: isRTL ? "اعتماد" : "Approve",
      reject: isRTL ? "رفض" : "Reject",
      reasonLabel: isRTL ? "سبب الرفض (اختياري)" : "Rejection reason (optional)",
      submitReject: isRTL ? "إرسال الرفض" : "Submit rejection",
      cancel: isRTL ? "إلغاء" : "Cancel",
      approved: isRTL ? "تم اعتماد العرض" : "Quotation approved",
      rejected: isRTL ? "تم رفض العرض" : "Quotation rejected",
      expired: isRTL ? "انتهت صلاحية العرض" : "Quotation expired",
      print: isRTL ? "طباعة PDF" : "Print PDF",
      validUntil: isRTL ? "صالح حتى" : "Valid until",
      signName: isRTL ? "الاسم الكامل" : "Full name",
      signTitle: isRTL ? "الصفة (اختياري)" : "Role / title (optional)",
      signatureLabel: isRTL ? "التوقيع المكتوب" : "Typed signature",
      consent: isRTL
        ? "أوافق على عرض السعر والشروط"
        : "I approve this quotation and terms",
      submitApprove: isRTL ? "اعتماد العرض" : "Approve quotation",
      sigRequired: isRTL
        ? "الاسم والتوقيع والموافقة مطلوبة."
        : "Name, typed signature and consent are required.",
    }),
    [isRTL],
  );

  const load = useCallback(async () => {
    if (!refId || !token) {
      setError(tx.invalid); setLoading(false); return;
    }
    setLoading(true); setError(null);
    const { data, error: err } = await getQuotationByToken({ refId, token });
    setLoading(false);
    if (err || !data) { setError(tx.invalid); return; }
    setView(data);
  }, [refId, token, tx.invalid]);

  useEffect(() => { void load(); }, [load]);

  const onApprove = useCallback(async () => {
    if (!refId || !token) return;
    if (!consent || !signName.trim() || !signature.trim()) {
      setError(tx.sigRequired);
      return;
    }
    setBusy(true); setError(null);
    const { ok, error: err } = await approveWorkOrderQuotation({
      refId,
      token,
      approvedByName: signName.trim(),
      signatureText: signature.trim(),
      approvedByTitle: signTitle.trim() || null,
    });
    setBusy(false);
    if (!ok || err) { setError(tx.invalid); return; }
    setApproveOpen(false);
    setSignName(""); setSignTitle(""); setSignature(""); setConsent(false);
    await load();
  }, [refId, token, consent, signName, signature, signTitle, tx.invalid, tx.sigRequired, load]);

  const onReject = useCallback(async () => {
    if (!refId || !token) return;
    setBusy(true); setError(null);
    const { ok, error: err } = await rejectWorkOrderQuotation({
      refId, token, reason: reason.trim() || null,
    });
    setBusy(false);
    if (!ok || err) { setError(tx.invalid); return; }
    setRejectOpen(false);
    setReason("");
    await load();
  }, [refId, token, reason, tx.invalid, load]);

  const pdfData = useMemo(
    () => (view ? generateQuotationPdfDataFromPublicView(view) : null),
    [view],
  );

  const locked =
    view?.status === "approved" ||
    view?.status === "rejected" ||
    view?.status === "expired";

  return (
    <main
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen bg-muted/40 py-6 px-3 sm:px-6"
      data-testid="wo-quotation-viewer"
    >
      <div className="max-w-3xl mx-auto space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> {tx.loading}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {view && pdfData && (
          <>
            {/* Status banner */}
            {view.status === "approved" && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {tx.approved}
              </div>
            )}
            {view.status === "rejected" && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
                <XCircle className="w-4 h-4" /> {tx.rejected}
              </div>
            )}
            {view.status === "expired" && (
              <div className="rounded-xl border border-muted-foreground/40 bg-muted p-3 text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {tx.expired}
              </div>
            )}

            {/* Action bar */}
            <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
              <Button
                type="button" size="sm" variant="outline"
                className="rounded-xl h-10"
                onClick={() => window.print()}
                data-testid="wo-quotation-viewer-print"
              >
                <Printer className="w-4 h-4 me-1" /> {tx.print}
              </Button>
              {!locked && (
                <>
                  <Button
                    type="button" size="sm" variant="destructive"
                    className="rounded-xl h-10"
                    onClick={() => setRejectOpen((v) => !v)}
                    disabled={busy}
                    data-testid="wo-quotation-viewer-reject"
                  >
                    <XCircle className="w-4 h-4 me-1" /> {tx.reject}
                  </Button>
                  <Button
                    type="button" size="sm"
                    className="rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setApproveOpen((v) => !v)}
                    disabled={busy}
                    data-testid="wo-quotation-viewer-approve"
                  >
                    <CheckCircle2 className="w-4 h-4 me-1" /> {tx.approve}
                  </Button>
                </>
              )}
            </div>

            {/* Inline approval signature form */}
            {approveOpen && !locked && (
              <div
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2 print:hidden"
                data-testid="wo-quotation-viewer-approve-form"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="text-xs space-y-1">
                    <span className="text-muted-foreground">{tx.signName}</span>
                    <Input
                      dir="auto"
                      value={signName}
                      onChange={(e) => setSignName(e.target.value)}
                      className="h-10 rounded-lg"
                      maxLength={200}
                      data-testid="wo-quotation-viewer-approve-name"
                    />
                  </label>
                  <label className="text-xs space-y-1">
                    <span className="text-muted-foreground">{tx.signTitle}</span>
                    <Input
                      dir="auto"
                      value={signTitle}
                      onChange={(e) => setSignTitle(e.target.value)}
                      className="h-10 rounded-lg"
                      maxLength={200}
                    />
                  </label>
                </div>
                <label className="text-xs space-y-1 block">
                  <span className="text-muted-foreground">{tx.signatureLabel}</span>
                  <Input
                    dir="auto"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="h-10 rounded-lg font-medium"
                    maxLength={200}
                    data-testid="wo-quotation-viewer-approve-signature"
                  />
                </label>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input"
                    data-testid="wo-quotation-viewer-approve-consent"
                  />
                  <span>{tx.consent}</span>
                </label>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button" size="sm" variant="ghost"
                    className="rounded-xl h-9"
                    onClick={() => setApproveOpen(false)}
                    disabled={busy}
                  >
                    {tx.cancel}
                  </Button>
                  <Button
                    type="button" size="sm"
                    className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => void onApprove()}
                    disabled={busy || !consent || !signName.trim() || !signature.trim()}
                    data-testid="wo-quotation-viewer-approve-submit"
                  >
                    {tx.submitApprove}
                  </Button>
                </div>
              </div>
            )}

            {/* Inline rejection reason */}
            {rejectOpen && !locked && (
              <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2 print:hidden">
                <label className="text-xs text-muted-foreground block">
                  {tx.reasonLabel}
                </label>
                <Textarea
                  dir="auto"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-lg min-h-[80px]"
                  maxLength={2000}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button" size="sm" variant="ghost"
                    className="rounded-xl h-9"
                    onClick={() => setRejectOpen(false)}
                    disabled={busy}
                  >
                    {tx.cancel}
                  </Button>
                  <Button
                    type="button" size="sm" variant="destructive"
                    className="rounded-xl h-9"
                    onClick={() => void onReject()}
                    disabled={busy}
                  >
                    {tx.submitReject}
                  </Button>
                </div>
              </div>
            )}

            {/* Printable document */}
            <div className="rounded-xl border border-border/40 bg-white p-2 sm:p-4 shadow-sm">
              <WorkOrderQuotationPdf data={pdfData} isRTL={isRTL} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}